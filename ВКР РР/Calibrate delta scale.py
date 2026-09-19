"""
Калибровка инференса PhysicsWarpingNet: подбор масштаба delta_map,
знака коррекции и способа нормализации входа по реальным метрикам
(PSNR/SSIM), используя эталонные изображения ('clean_img' и т.п.),
уже лежащие в ваших .npz файлах.

КАК ЗАПУСТИТЬ:
    python calibrate_delta_scale.py --data_dir "путь/к/папке/со/сканами" --n_samples 15

Скрипт НЕ переобучает модель — он просто честно измеряет,
какая комбинация (масштаб x знак x нормализация) на инференсе
даёт лучший результат на ваших же данных с эталоном.
"""

import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

import argparse
import glob
import numpy as np
import torch
import torch.nn as nn
from scipy.ndimage import map_coordinates, median_filter, gaussian_filter
from skimage.transform import iradon
from skimage.metrics import peak_signal_noise_ratio as sk_psnr
from skimage.metrics import structural_similarity as sk_ssim

torch.set_num_threads(1)


# ---- Архитектура модели (должна совпадать с app.py) ----
class ConvBlock(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1, bias=True), nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=True), nn.ReLU(inplace=True)
        )

    def forward(self, x):
        return self.conv(x)


class AttentionGateCorrect(nn.Module):
    def __init__(self, F_g, F_l, F_int):
        super().__init__()
        self.W_g = nn.Conv2d(F_g, F_int, 1, 1, 0, bias=True)
        self.W_x = nn.Conv2d(F_l, F_int, 1, 1, 0, bias=True)
        self.psi = nn.Conv2d(F_int, 1, 1, 1, 0, bias=True)
        self.relu = nn.ReLU(inplace=True)
        self.sigmoid = nn.Sigmoid()

    def forward(self, g, x):
        psi = self.relu(self.W_g(g) + self.W_x(x))
        return x * self.sigmoid(self.psi(psi))


class PhysicsWarpingNet(nn.Module):
    def __init__(self, in_channels=1, out_channels=1):
        super().__init__()
        self.enc1 = ConvBlock(in_channels, 48); self.pool1 = nn.MaxPool2d(2, 2)
        self.enc2 = ConvBlock(48, 96); self.pool2 = nn.MaxPool2d(2, 2)
        self.enc3 = ConvBlock(96, 192); self.pool3 = nn.MaxPool2d(2, 2)
        self.enc4 = ConvBlock(192, 384); self.pool4 = nn.MaxPool2d(2, 2)
        self.enc5 = ConvBlock(384, 512); self.pool5 = nn.MaxPool2d(2, 2)
        self.bottleneck = ConvBlock(512, 768)
        self.up5 = nn.ConvTranspose2d(768, 512, 2, 2); self.ag5 = AttentionGateCorrect(512, 512, 256); self.dec5 = ConvBlock(1024, 512)
        self.up4 = nn.ConvTranspose2d(512, 384, 2, 2); self.ag4 = AttentionGateCorrect(384, 384, 192); self.dec4 = ConvBlock(768, 384)
        self.up3 = nn.ConvTranspose2d(384, 192, 2, 2); self.ag3 = AttentionGateCorrect(192, 192, 96); self.dec3 = ConvBlock(384, 192)
        self.up2 = nn.ConvTranspose2d(192, 96, 2, 2); self.ag2 = AttentionGateCorrect(96, 96, 48); self.dec2 = ConvBlock(192, 96)
        self.up1 = nn.ConvTranspose2d(96, 48, 2, 2); self.ag1 = AttentionGateCorrect(48, 48, 24); self.dec1 = ConvBlock(96, 48)
        self.out_head = nn.Sequential(
            nn.Conv2d(48, 24, 3, padding=1), nn.ReLU(inplace=True),
            nn.Conv2d(24, out_channels, 1, padding=0)
        )

    def forward(self, x):
        e1 = self.enc1(x); e2 = self.enc2(self.pool1(e1)); e3 = self.enc3(self.pool2(e2))
        e4 = self.enc4(self.pool3(e3)); e5 = self.enc5(self.pool4(e4)); bn = self.bottleneck(self.pool5(e5))
        d5 = self.up5(bn); d5 = self.dec5(torch.cat([d5, self.ag5(d5, e5)], 1))
        d4 = self.up4(d5); d4 = self.dec4(torch.cat([d4, self.ag4(d4, e4)], 1))
        d3 = self.up3(d4); d3 = self.dec3(torch.cat([d3, self.ag3(d3, e3)], 1))
        d2 = self.up2(d3); d2 = self.dec2(torch.cat([d2, self.ag2(d2, e2)], 1))
        d1 = self.up1(d2); d1 = self.dec1(torch.cat([d1, self.ag1(d1, e1)], 1))
        return self.out_head(d1)


def reconstruct_image(sinogram):
    sino = np.asarray(sinogram, dtype=np.float64)
    n_angles, n_detectors = sino.shape
    theta = np.linspace(0.0, 180.0, n_angles, endpoint=False)
    try:
        return iradon(sino.T, theta=theta, circle=True, filter_name='ramp')
    except Exception:
        return np.zeros((n_detectors, n_detectors))


def apply_pixelwise_shift(sinogram, delta_map, sign=1.0, median_size=3, smooth_sigma=0.8):
    sino = np.asarray(sinogram, dtype=np.float64)
    dmap = np.asarray(delta_map, dtype=np.float64) * sign
    dmap = median_filter(dmap, size=median_size)
    if smooth_sigma > 0:
        dmap = gaussian_filter(dmap, sigma=smooth_sigma)

    rows, cols = np.meshgrid(np.arange(sino.shape[0]), np.arange(sino.shape[1]), indexing='ij')
    sample_cols = cols - dmap
    coords = np.array([rows.ravel(), sample_cols.ravel()])
    edge_bg = float(np.median(np.concatenate([sino[:, :5], sino[:, -5:]])))
    return map_coordinates(sino, coords, order=1, mode='constant', cval=edge_bg).reshape(sino.shape)


def normalize_input(sino_dist, method):
    if method == "per_sample_minmax":
        lo, hi = np.min(sino_dist), np.max(sino_dist)
        return (sino_dist - lo) / (hi - lo) if hi - lo > 1e-9 else sino_dist
    elif method == "fixed_0_5000":
        return np.clip(sino_dist, 0, 5000) / 5000.0
    elif method == "zscore":
        mu, sigma = np.mean(sino_dist), np.std(sino_dist)
        return (sino_dist - mu) / sigma if sigma > 1e-9 else sino_dist - mu
    elif method == "none":
        return sino_dist
    else:
        raise ValueError(method)


def load_scan(filepath):
    d = np.load(filepath)
    sino_dist = d['distorted'] if 'distorted' in d else d['arr_0']
    if sino_dist.ndim > 2:
        sino_dist = sino_dist[0]
    true_image = None
    for k in ('clean_img', 'clean_image', 'true_image', 'clean', 'target'):
        if k in d:
            true_image = d[k]
            break
    return sino_dist, true_image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data_dir", required=True, help="Папка со сканами .npz, содержащими эталон")
    ap.add_argument("--weights", default="best_model_weights.pth")
    ap.add_argument("--n_samples", type=int, default=15)
    args = ap.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = PhysicsWarpingNet().to(device)
    state = torch.load(args.weights, map_location=device)
    model.load_state_dict(state)
    model.eval()

    files = sorted(glob.glob(os.path.join(args.data_dir, "*.npz")))
    samples = []
    for f in files:
        sino_dist, true_image = load_scan(f)
        if true_image is not None:
            samples.append((os.path.basename(f), sino_dist, true_image))
        if len(samples) >= args.n_samples:
            break

    if not samples:
        print("Не найдено ни одного файла с ключом эталона "
              "(clean_img/clean_image/true_image/clean/target). "
              "Без эталона честно сравнить масштаб/знак нельзя.")
        return

    print(f"Найдено {len(samples)} файлов с эталоном для калибровки.\n")

    norm_methods = ["per_sample_minmax", "fixed_0_5000", "zscore", "none"]
    scales = [5.0, 10.0, 15.0, 20.0, 30.0, 45.0]
    signs = [1.0, -1.0]

    results = []
    # Прогоняем модель один раз на нормализованном входе для каждого метода нормализации,
    # затем варьируем масштаб/знак поверх сырого выхода сети — быстрее, чем гонять сеть на каждую комбинацию.
    for norm_method in norm_methods:
        raw_outputs = []
        for fname, sino_dist, true_image in samples:
            sino_norm = normalize_input(sino_dist, norm_method)
            tensor_in = torch.tensor(sino_norm, dtype=torch.float32).unsqueeze(0).unsqueeze(0).to(device)
            with torch.inference_mode():
                pred = model(tensor_in).squeeze().cpu().numpy()
            raw_outputs.append(pred)

        for scale in scales:
            for sign in signs:
                psnrs = []
                for (fname, sino_dist, true_image), pred in zip(samples, raw_outputs):
                    delta_map = pred * scale
                    sino_corr = apply_pixelwise_shift(sino_dist, delta_map, sign=sign)
                    img_corr = reconstruct_image(sino_corr)
                    if img_corr.shape != true_image.shape:
                        continue
                    data_range = true_image.max() - true_image.min()
                    if data_range <= 0:
                        data_range = 1.0
                    try:
                        psnrs.append(sk_psnr(true_image, img_corr, data_range=data_range))
                    except Exception:
                        pass
                if psnrs:
                    results.append((norm_method, scale, sign, np.mean(psnrs), len(psnrs)))

    # Базовая линия: вообще без коррекции (искажённое изображение против эталона)
    baseline_psnrs = []
    for fname, sino_dist, true_image in samples:
        img_dist = reconstruct_image(sino_dist)
        if img_dist.shape == true_image.shape:
            data_range = true_image.max() - true_image.min()
            data_range = data_range if data_range > 0 else 1.0
            baseline_psnrs.append(sk_psnr(true_image, img_dist, data_range=data_range))
    baseline = np.mean(baseline_psnrs) if baseline_psnrs else float('nan')

    results.sort(key=lambda r: r[3], reverse=True)

    print(f"{'Норм.':<20}{'Масштаб':<10}{'Знак':<8}{'PSNR ср.':<12}{'N':<5}")
    print("-" * 55)
    for norm_method, scale, sign, mean_psnr, n in results[:15]:
        print(f"{norm_method:<20}{scale:<10}{sign:<8}{mean_psnr:<12.2f}{n:<5}")

    print(f"\nБазовый уровень (без коррекции, искажённое vs эталон): PSNR = {baseline:.2f} дБ")
    best = results[0]
    print(f"\nЛучшая комбинация: нормализация='{best[0]}', масштаб={best[1]}, знак={best[2]:+.0f} "
          f"→ PSNR {best[3]:.2f} дБ (сейчас в app.py: нормализация='per_sample_minmax', масштаб=15.0, знак=+1)")

    if best[3] <= baseline + 0.5:
        print("\n⚠️ Даже лучшая комбинация почти не превышает PSNR без коррекции вообще.\n"
              "Это говорит НЕ о проблеме масштаба/знака/нормализации, а о том, что сама модель\n"
              "(веса best_model_weights.pth) плохо предсказывает смещения на этих данных —\n"
              "нужно смотреть на обучение (датасет/loss/архитектуру), а не на инференс.")


if __name__ == "__main__":
    main()