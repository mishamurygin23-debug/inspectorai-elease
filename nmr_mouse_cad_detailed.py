#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NMR-MOUSE CAD — compact magnetic-system designer and B0 evaluator.

Conceptual engineering tool.  The field is evaluated with a distributed-dipole
model.  Final hardware must be checked with FEM/measurements including yoke,
demagnetisation, RF B1, matching, SNR and tissue loading.
"""

from __future__ import annotations

import copy
import json
import math
import sys
import tkinter as tk
from dataclasses import asdict, dataclass, field
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / 'magnetic_libs'))
import magpylib as magpy
from scipy.spatial.transform import Rotation
from tkinter import filedialog, messagebox, simpledialog, ttk

import numpy as np
import matplotlib
matplotlib.use("TkAgg")
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk
from matplotlib.figure import Figure
from matplotlib.patches import Circle, Ellipse, Polygon, Rectangle
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from mpl_toolkits.mplot3d import proj3d

try:
    from scipy.optimize import differential_evolution, minimize
except Exception:  # application remains usable without SciPy
    minimize = None
    differential_evolution = None

MU0 = 4 * math.pi * 1e-7
GAMMA_HZ_T = 42.57747892e6
GRADES = {"N35": 1.17, "N42": 1.30, "N45": 1.35, "N52": 1.45}
AX = {"x": 0, "y": 1, "z": 2}
DIRS = {
    "+X": (1., 0., 0.), "-X": (-1., 0., 0.),
    "+Y": (0., 1., 0.), "-Y": (0., -1., 0.),
    "+Z": (0., 0., 1.), "-Z": (0., 0., -1.),
}
PLANES = {"XZ": ("x", "z", "y"), "XY": ("x", "y", "z"), "YZ": ("y", "z", "x")}

# Gyromagnetic ratios gamma/2pi.  The field solver is independent of nucleus;
# this table converts the calculated B0 into the corresponding Larmor frequency.
NUCLEI_GAMMA_HZ_T = {
    "1H (протон)": 42.57747892e6,
    "19F": 40.052e6,
    "23Na": 11.262e6,
    "13C": 10.7084e6,
    "31P": 17.235e6,
}

# These are deliberately conservative *screening* limits, not standards.  They
# can be edited in the NMR passport dialog for the actual sequence and hardware.
#
# Значения подобраны по опубликованным конструкциям одностороннего ЯМР, а не
# взяты произвольно. Ключевые источники (см. также сопроводительный .docx):
#   [1] Eidmann G., Savelsberg R., Blumler P., Blumich B. "The NMR-MOUSE, A
#       Mobile Universal Surface Explorer". J. Magn. Reson. A122, 104-109
#       (1996) - классическая геометрия с сильным заданным градиентом.
#   [2] Casanova F., Perlo J., Blumich B. (eds.) "Single-Sided NMR".
#       Springer, 2011 - систематика двух философий магнита (градиентная
#       Eidmann/Blumich и "однородная удалённая зона" Fukushima).
#   [3] Blumich B. et al., обзорная статья "Soft-matter analysis by the
#       NMR-MOUSE": однородность 16100 ppm на 1.9 см³ и 32200 ppm на 7.6 см³
#       - типичные цифры серийного NMR-MOUSE.
#       https://www.researchgate.net/publication/264453390
#   [4] Dabaghyan M. et al. "A portable single-sided magnet system for
#       remote NMR measurements of pulmonary function". NMR Biomed. 27,
#       757-762 (2014) - лёгкие человека, анти-параллельные магниты,
#       B0=8.8 мТл на глубине 8 см, CPMG dTE=3.5 мс. PMID 24953556.
#   [5] "A single-sided magnet for deep-depth fat quantification".
#       J. Magn. Reson. 2021 - тот же диапазон глубины (8 см), но более
#       тяжёлый магнит даёт B0=72.5 мТл, градиент 0.735 Тл/м.
#       https://www.sciencedirect.com/science/article/abs/pii/S1090780721001427
#   [6] Sherman et al. (ISMRM 2017, unilateral linear Halbach для гидратации
#       мышц): B0>=0.2 Тл, объём ROI ~1300 мм³, глубина ~17 мм.
#       https://cds.ismrm.org/protected/17MProceedings/PDFfiles/2676.html
#
# Единая философия магнита определяет, какой критерий по градиенту нужен:
#   - "градиентная" (Eidmann/Blumich, [1]) - тонкий срез задаётся большим
#     градиентом, однородность заведомо плохая (десятки тысяч ppm), но это
#     компенсируется импульсной последовательностью CPMG;
#   - "однородная удалённая зона" (Fukushima, US6489872; так устроены и [4],
#     и [5]) - наоборот, чем меньше градиент внутри ROI, тем толще и
#     стабильнее рабочий слой. Для этой философии критерий "min_gradient_T_m"
#     не нужен (оставлен 0), а полезный ограничитель - это скорее верхняя
#     граница градиента, которую стоит смотреть в отчёте по полю ("|G|
#     центра"), а не в чек-листе критериев.
NMR_PROFILES = {
    "Мышца L5-S1 / T2 CPMG": {
        # [6]: ~0.2 Тл, epsilon~0.5% (5000 ppm), полоса возбуждения 43 кГц,
        # срез 1.5 мм на глубине ~8 мм. Направление/нелинейность - это
        # инженерные пороги для отбраковки, а не клинический стандарт.
        "min_b0_mT": 190.0, "max_ppm": 5000.0, "max_angle_deg": 5.0,
        "max_nonlinearity_pct": 15.0, "min_gradient_T_m": 0.0,
    },
    "NMR-MOUSE (поверхностный слой, Eidmann/Blumich)": {
        # Классическая односторонняя геометрия [1]: поле у поверхности
        # магнита обычно 0.3-0.5 Тл, специально сильный градиент 5-20 Тл/м
        # задаёт тонкий чувствительный срез. Однородность НАРОЧНО плохая:
        # реальные серийные приборы показывают 16100-32200 ppm p-p на
        # объёмах 1.9-7.6 см³ [3], и это нормально для CPMG-релаксометрии.
        "min_b0_mT": 50.0, "max_ppm": 50000.0, "max_angle_deg": 15.0,
        "max_nonlinearity_pct": 40.0, "min_gradient_T_m": 5.0,
    },
    "Глубокое зондирование тканей 5-8 см (анти-параллельная пара, Fukushima)": {
        # Философия "однородной удалённой зоны": пара анти-параллельных
        # магнитов. Достигнутые в литературе цифры на глубине ~8 см - от
        # 8.8 мТл [4, лёгкие человека] до 72.5 мТл при более тяжёлой сборке
        # и градиенте 0.735 Тл/м [5, печень]. Порог по B0 взят по нижней
        # (уже подтверждённой in vivo) границе [4], с некоторым запасом.
        # Минимум по градиенту НЕ нужен (см. пояснение выше) - оставлен 0.
        "min_b0_mT": 5.0, "max_ppm": 100000.0, "max_angle_deg": 20.0,
        "max_nonlinearity_pct": 50.0, "min_gradient_T_m": 0.0,
    },
    "МРТ / получение изображения": {
        "min_b0_mT": 20.0, "max_ppm": 1000.0, "max_angle_deg": 2.0,
        "max_nonlinearity_pct": 10.0, "min_gradient_T_m": 0.0,
    },
    "ЯМР-спектроскопия (высокое разрешение)": {
        # Это отдельная категория "настоящих" спектрометров с однородным
        # полем на уровне единиц ppm - НЕ подходит как критерий приёмки для
        # одностороннего ЯМР/NMR-MOUSE любого типа (см. профили выше).
        "min_b0_mT": 100.0, "max_ppm": 10.0, "max_angle_deg": 0.2,
        "max_nonlinearity_pct": 2.0, "min_gradient_T_m": 0.0,
    },
}


@dataclass
class Magnet:
    name: str = "Магнит"
    shape: str = "box"             # box, cylinder, sphere, prism
    center: list[float] = field(default_factory=lambda: [0., 0., 0.])  # mm
    size: list[float] = field(default_factory=lambda: [30., 30., 15.])  # x,y,z mm
    grade: str = "N45"
    direction: str = "+Z"
    axis: str = "z"                # cylinder axis
    polygon: list[list[float]] = field(default_factory=list)  # local XZ, mm
    visible: bool = True
    contour_plane: str = 'XZ'
    remanence_T: float = 0.0       # 0 = use nominal Br from grade

    @property
    def br(self):
        custom=float(self.remanence_T)
        return custom if custom > 0 else GRADES.get(self.grade, 1.35)

    @property
    def mvec(self):
        return np.asarray(DIRS[self.direction], float)

    @property
    def volume_mm3(self):
        sx, sy, sz = self.size
        if self.shape == "box":
            return sx * sy * sz
        if self.shape == "sphere":
            return 4 / 3 * math.pi * (sx / 2) * (sy / 2) * (sz / 2)
        if self.shape == "cylinder":
            dims = {"x": (sy, sz, sx), "y": (sx, sz, sy), "z": (sx, sy, sz)}[self.axis]
            return math.pi * dims[0] * dims[1] * dims[2] / 4
        if self.polygon:
            p = np.asarray(self.polygon)
            return abs(np.dot(p[:, 0], np.roll(p[:, 1], 1)) - np.dot(p[:, 1], np.roll(p[:, 0], 1))) * self.size[AX[PLANES[self.contour_plane][2]]] / 2
        return sx * sy * sz


@dataclass
class Target:
    surface_gap: float = 2.0
    depth_from: float = 8.0
    depth_to: float = 18.0
    width: float = 24.0
    length: float = 30.0
    target_mT: float = 196.0
    rf_kHz: float = 200.0
    min_mT: float = 10.0


def _inside_polygon(points, poly):
    """Vectorised ray test for points Nx2."""
    p = np.asarray(poly, float)
    x, y = points[:, 0], points[:, 1]
    inside = np.zeros(len(points), bool)
    j = len(p) - 1
    for i in range(len(p)):
        xi, yi, xj, yj = p[i, 0], p[i, 1], p[j, 0], p[j, 1]
        hit = ((yi > y) != (yj > y)) & (x < (xj-xi) * (y-yi) / (yj-yi + 1e-30) + xi)
        inside ^= hit
        j = i
    return inside


def sample_magnet(m: Magnet, density=5):
    """Return sub-dipole centres (m) and equal moments (A m²)."""
    n = max(3, int(density))
    sx, sy, sz = np.maximum(np.asarray(m.size, float), .2)
    xs = np.linspace(-sx/2, sx/2, n, endpoint=False) + sx/(2*n)
    ys = np.linspace(-sy/2, sy/2, n, endpoint=False) + sy/(2*n)
    zs = np.linspace(-sz/2, sz/2, n, endpoint=False) + sz/(2*n)
    q = np.array(np.meshgrid(xs, ys, zs, indexing="ij")).reshape(3, -1).T
    if m.shape == "sphere":
        keep = np.sum((q / ([sx/2, sy/2, sz/2]))**2, axis=1) <= 1
        q = q[keep]
    elif m.shape == "cylinder":
        a = AX[m.axis]
        radial = [i for i in range(3) if i != a]
        keep = (q[:, radial[0]]/(m.size[radial[0]]/2))**2 + (q[:,radial[1]]/(m.size[radial[1]]/2))**2 <= 1
        q = q[keep]
    elif m.shape == "prism" and len(m.polygon) >= 3:
        keep = _inside_polygon(q[:, [AX[k] for k in PLANES[m.contour_plane][:2]]], m.polygon)
        q = q[keep]
    if not len(q):
        q = np.zeros((1, 3))
    centres = (q + np.asarray(m.center)) * 1e-3
    total_moment = m.br / MU0 * m.volume_mm3 * 1e-9 * m.mvec
    return centres, np.repeat((total_moment / len(q))[None, :], len(q), axis=0)


def dipole_field_B(magnets, points_mm, density=5):
    p = np.atleast_2d(points_mm).astype(float) * 1e-3
    out = np.zeros((len(p), 3), float)
    for mag in magnets:
        if not mag.visible:
            continue
        c, moments = sample_magnet(mag, density)
        # chunk observers to bound temporary arrays
        for i in range(0, len(p), 1500):
            r = p[i:i+1500, None, :] - c[None, :, :]
            rr = np.linalg.norm(r, axis=2)
            rr = np.maximum(rr, 2e-4)
            mdotr = np.einsum("pki,ki->pk", r, moments)
            term = 3*r*mdotr[..., None]/rr[..., None]**5 - moments[None, :, :]/rr[..., None]**3
            out[i:i+1500] += MU0/(4*math.pi) * term.sum(axis=1)
    return out


def analytic_source(m):
    s = np.asarray(m.size) * 1e-3
    kw = dict(position=np.asarray(m.center)*1e-3, polarization=m.br*m.mvec)
    if m.shape == 'box':
        return magpy.magnet.Cuboid(dimension=s, **kw)
    if m.shape == 'cylinder':
        a = AX[m.axis]; rad = [i for i in range(3) if i != a]
        # Не круглый цилиндр → отдаём распределённой дипольной модели.
        if not np.isclose(s[rad[0]], s[rad[1]]):
            return None
        rot = Rotation.from_euler('y',90,degrees=True) if a==0 else \
              Rotation.from_euler('x',-90,degrees=True) if a==1 else \
              Rotation.identity()
        kw['polarization'] = rot.inv().apply(m.br*m.mvec)
        return magpy.magnet.Cylinder(dimension=(s[rad[0]],s[a]), orientation=rot, **kw)
    if m.shape == 'sphere' and np.allclose(s,s[0]):
        return magpy.magnet.Sphere(diameter=s[0], **kw)
    return None

def field_B(magnets, points_mm, density=7):
    points = np.atleast_2d(points_mm)
    out = np.zeros((len(points),3))
    for m in magnets:
        if not m.visible: continue
        src = analytic_source(m)
        out += np.asarray(src.getB(points*1e-3)).reshape(-1,3) if src is not None else dipole_field_B([m],points,density)
    return out


def points_inside_magnets(magnets, points_mm):
    """Return a mask for observers that lie inside any magnet."""
    points = np.atleast_2d(points_mm).astype(float)
    mask = np.zeros(len(points), bool)
    for m in magnets:
        if not m.visible:
            continue
        q = points - np.asarray(m.center, float)
        half = np.maximum(np.asarray(m.size, float) / 2, 1e-12)
        inside = np.all(abs(q) <= half + 1e-7, axis=1)
        if m.shape == "cylinder":
            radial = [i for i in range(3) if i != AX[m.axis]]
            inside &= np.sum((q[:, radial] / half[radial])**2, axis=1) <= 1.00001
        elif m.shape == "sphere":
            inside &= np.sum((q / half)**2, axis=1) <= 1.00001
        elif m.shape == "prism" and len(m.polygon) >= 3:
            plane_indices = [AX[k] for k in PLANES[m.contour_plane][:2]]
            inside &= _inside_polygon(q[:, plane_indices], m.polygon)
        mask |= inside
    return mask


def nmr_roi_metrics(magnets, centre_mm, size_mm, nucleus="1H (протон)",
                    resolution=7):
    centre = np.asarray(centre_mm, float)
    size = np.asarray(size_mm, float)
    if centre.shape != (3,) or size.shape != (3,) or not np.all(np.isfinite(np.r_[centre, size])):
        raise ValueError("Центр и размеры ROI должны содержать три конечных числа.")
    if np.any(size <= 0):
        raise ValueError("Все размеры ROI должны быть больше нуля.")
    n = int(resolution)
    if n < 3 or n > 15:
        raise ValueError("Сетка ROI должна быть от 3 до 15 точек на ось.")
    if nucleus not in NUCLEI_GAMMA_HZ_T:
        raise ValueError("Неизвестное ядро.")

    axes = [np.linspace(centre[i]-size[i]/2, centre[i]+size[i]/2, n) for i in range(3)]
    points = np.array(np.meshgrid(*axes, indexing="ij")).reshape(3, -1).T
    inside = points_inside_magnets(magnets, points)
    valid_mask = ~inside
    n_valid = int(np.count_nonzero(valid_mask))
    if n_valid == 0:
        raise ValueError(f"Весь ROI ({len(points)} узлов) попадает внутрь магнитного материала. "
                         "Сдвиньте ROI наружу или уменьшите размер.")
    # Если часть точек внутри — считаем метрики по валидной части и не падаем.
    points_valid = points[valid_mask]
    vectors_valid = field_B(magnets, points_valid)
    strength_valid = np.linalg.norm(vectors_valid, axis=1)
    if not np.all(np.isfinite(strength_valid)) or np.min(strength_valid) <= 0:
        raise ValueError("В ROI получено нулевое или некорректное поле.")
    gamma = NUCLEI_GAMMA_HZ_T[nucleus]
    mean_b  = float(strength_valid.mean())
    span_b  = float(strength_valid.max() - strength_valid.min())
    std_b   = float(strength_valid.std())
    freq_hz = strength_valid * gamma

    # Поле в геометрическом центре ROI (даже если он внутри материала —
    # это просто точка отсчёта для углов и градиента).
    centre_vector = field_B(magnets, [centre])[0]
    centre_b = float(np.linalg.norm(centre_vector))

    reference_direction = centre_vector / max(centre_b, 1e-30)
    unit = vectors_valid / strength_valid[:, None]
    angle_deg_valid = np.degrees(np.arccos(np.clip(unit @ reference_direction, -1, 1)))

    # Градиент |B| в центре (Тл/м).
    step_mm = 0.1
    gradient = np.empty(3)
    for i in range(3):
        delta = np.zeros(3); delta[i] = step_mm
        plus  = np.linalg.norm(field_B(magnets, [centre + delta])[0])
        minus = np.linalg.norm(field_B(magnets, [centre - delta])[0])
        gradient[i] = (plus - minus) / (2*step_mm*1e-3)

    # Линейная модель |B| ≈ c + Gx·x + Gy·y + Gz·z на валидной части.
    relative_m = (points_valid - centre) * 1e-3
    design = np.column_stack([np.ones(n_valid), relative_m])
    coefficients, *_ = np.linalg.lstsq(design, strength_valid, rcond=None)
    fitted = design @ coefficients
    residual = strength_valid - fitted
    residual_rms = float(np.sqrt(np.mean(residual**2)))
    residual_span = float(np.ptp(residual))
    # Нелинейность — RMS отклонения от линейной модели ОТНОСИТЕЛЬНО среднего
    # поля. Такая нормировка устойчива и для градиентных, и для почти
    # однородных полей (в обоих случаях → 0 при идеальной линейности).
    nonlinearity_pct = residual_rms / max(mean_b, 1e-30) * 100.0
    linear_residual_ppm = residual_rms / max(mean_b, 1e-30) * 1e6

    i_min = int(np.argmin(strength_valid))
    i_max = int(np.argmax(strength_valid))

    visible = [m for m in magnets if m.visible]
    volumes_cm3 = [m.volume_mm3/1000 for m in visible]
    total_moment = (np.sum([m.br/MU0 * m.volume_mm3*1e-9 * m.mvec for m in visible], axis=0)
                    if visible else np.zeros(3))
    if visible:
        lo = np.min([magnet_bounds(m)[0] for m in visible], axis=0)
        hi = np.max([magnet_bounds(m)[1] for m in visible], axis=0)
    else:
        lo = hi = np.zeros(3)

    return {
        "centre_mm": centre, "size_mm": size, "grid_n": n,
        "points": n_valid,
        "points_inside_magnets": int(len(points) - n_valid),
        "grid_mask_valid": valid_mask.copy(),
        "nucleus": nucleus, "gamma_hz_t": gamma,
        "points_mm": points_valid,
        "vectors_T": vectors_valid,
        "strength_T": strength_valid,
        "centre_vector_T": centre_vector,
        "min_point_mm": points_valid[i_min].copy(),
        "max_point_mm": points_valid[i_max].copy(),
        "min_vector_T": vectors_valid[i_min].copy(),
        "max_vector_T": vectors_valid[i_max].copy(),
        "b_centre_T": centre_b,
        "b_min_T": float(strength_valid.min()),
        "b_mean_T": mean_b,
        "b_max_T": float(strength_valid.max()),
        "b_std_T": std_b,
        "b_span_T": span_b,
        "ppm_p2p": span_b/mean_b*1e6,
        "ppm_rms": std_b/mean_b*1e6,
        "f_centre_MHz": centre_b*gamma/1e6,
        "f_min_MHz": float(freq_hz.min()/1e6),
        "f_mean_MHz": float(freq_hz.mean()/1e6),
        "f_max_MHz": float(freq_hz.max()/1e6),
        "f_span_kHz": float(np.ptp(freq_hz)/1e3),
        "angle_max_deg": float(angle_deg_valid.max()),
        "angle_rms_deg": float(np.sqrt(np.mean(angle_deg_valid**2))),
        "gradient_T_m": gradient,
        "gradient_norm_T_m": float(np.linalg.norm(gradient)),
        "linear_gradient_T_m": coefficients[1:],
        "gradient_nonlinearity_pct": nonlinearity_pct,
        "linear_residual_ppm": linear_residual_ppm,
        "magnet_count": len(visible),
        "magnet_volume_cm3": float(sum(volumes_cm3)),
        "estimated_ndfeb_mass_g": float(sum(volumes_cm3)*7.5),
        "total_moment_Am2": total_moment,
        "total_moment_norm_Am2": float(np.linalg.norm(total_moment)),
        "assembly_lo_mm": lo, "assembly_hi_mm": hi,
        "model_is_approximate": any(analytic_source(m) is None for m in visible),
    }

def build_nmr_report(metrics, mode, tune_frequency_MHz, bandwidth_kHz, limits):
    """Build a readable screening report and a machine-friendly decision dict.

    Два режима проверки:

    * ``NMR-MOUSE`` (градиентный, Eidmann/Blumich): поле НАМЕРЕННО неоднородно,
      тонкий срез задаётся сильным градиентом и узкополосным RF. Критерий
      «весь ROI в полосе» физически противоречит методу и не проверяется.
      Вместо него проверяется толщина возбуждаемого слоя и попадание центра
      ROI в настроенную полосу.

    * остальные профили (однородный режим, МРТ, спектроскопия): проверяются
      ppm, разброс частот, полное покрытие ROI полосой — как раньше.
    """
    m = metrics
    frequency = float(tune_frequency_MHz)
    bandwidth = float(bandwidth_kHz)
    if (not np.isfinite(frequency) or frequency <= 0
            or not np.isfinite(bandwidth) or bandwidth <= 0):
        raise ValueError("Частота настройки и полоса должны быть положительными.")
    half_band_MHz = bandwidth / 2000
    point_frequencies_MHz = m["strength_T"]*m["gamma_hz_t"]/1e6
    in_band = ((point_frequencies_MHz >= frequency-half_band_MHz) &
               (point_frequencies_MHz <= frequency+half_band_MHz))
    coverage_pct = float(np.mean(in_band)*100)

    # Диагностические флаги (в обоих режимах нужны для отчёта).
    span_ok   = m["f_span_kHz"] <= bandwidth
    tuned_ok  = (m["f_min_MHz"] >= frequency-half_band_MHz and
                 m["f_max_MHz"] <= frequency+half_band_MHz)
    center_in_band = abs(m["f_centre_MHz"] - frequency)*1000 <= bandwidth

    b0_ok        = m["b_mean_T"]*1000 >= limits["min_b0_mT"]
    angle_ok     = m["angle_max_deg"] <= limits["max_angle_deg"]
    ppm_ok       = m["ppm_p2p"] <= limits["max_ppm"]
    gradient_ok  = m["gradient_norm_T_m"] >= limits.get("min_gradient_T_m", 0)
    linearity_ok = m["gradient_nonlinearity_pct"] <= limits["max_nonlinearity_pct"]

    # Толщина возбуждаемого слоя — центральный физический критерий
    # градиентного режима. Формула: Δz = BW / (γ · |G|).
    slice_mm = (bandwidth*1e3 / (m["gamma_hz_t"]*m["gradient_norm_T_m"])*1e3
                if m["gradient_norm_T_m"] > 1e-12 else math.inf)
    slice_ok = 0.3 <= slice_mm <= 3.0

    # ---------- выбор критериев по режиму ----------
    if mode.startswith("NMR-MOUSE"):
        decisive = [b0_ok, slice_ok, center_in_band,
                    gradient_ok, linearity_ok, angle_ok]
        criteria = [
            (b0_ok,          f"среднее B0 ≥ {limits['min_b0_mT']:g} мТл"),
            (slice_ok,       f"толщина возбуждаемого слоя 0.3–3 мм "
                             f"(сейчас {slice_mm:.3f} мм)"),
            (center_in_band, f"центр ROI попадает в настроенную RF-полосу "
                             f"({frequency:.6f} ± {bandwidth/2:.3f} кГц)"),
            (gradient_ok,    f"градиент ≥ {limits['min_gradient_T_m']:g} Тл/м"),
            (linearity_ok,   f"нелинейность градиента ≤ "
                             f"{limits['max_nonlinearity_pct']:g}%"),
            (angle_ok,       f"поворот направления B0 ≤ "
                             f"{limits['max_angle_deg']:g}°"),
        ]
    else:
        decisive = [b0_ok, span_ok, tuned_ok, ppm_ok, angle_ok]
        criteria = [
            (b0_ok,    f"среднее B0 ≥ {limits['min_b0_mT']:g} мТл"),
            (ppm_ok,   f"неоднородность peak-to-peak ≤ {limits['max_ppm']:g} ppm"),
            (span_ok,  "RF-полоса шире разброса частот в ROI"),
            (tuned_ok, "весь ROI находится внутри полосы на заданной частоте настройки"),
            (angle_ok, f"поворот направления B0 ≤ {limits['max_angle_deg']:g}°"),
        ]

    suitable = all(decisive)
    verdict = ("УСЛОВНО ПОДХОДИТ ПО МОДЕЛИ" if suitable
               else "ПОКА НЕ ПОДХОДИТ ПО ЗАДАННЫМ КРИТЕРИЯМ")

    # Подсказка по настройке RF.
    if mode.startswith("NMR-MOUSE"):
        tuning_note = ("центр ROI попадает в настроенную RF-полосу"
                       if center_in_band else
                       f"перенастройте RF-центр примерно на "
                       f"{m['f_centre_MHz']:.6f} МГц")
        tuning_mark = "+" if center_in_band else "−"
    else:
        tuning_note = ("частота настройки покрывает весь ROI" if tuned_ok else
                       f"перенастройте RF-центр примерно на "
                       f"{m['f_mean_MHz']:.6f} МГц")
        tuning_mark = "!" if (span_ok and not tuned_ok) else ("+" if tuned_ok else "−")

    gradient = m["gradient_T_m"]
    effective_slice_mm = slice_mm  # уже посчитан выше

    # ---------- текст отчёта ----------
    lines = [
        verdict,
        f"Режим: {mode}",
        f"Ядро: {m['nucleus']} • сетка {m['grid_n']}³ = {m['points']} точек"
        f" (валидных {m.get('points_valid', m['points'])})",
        f"ROI: центр {np.round(m['centre_mm'],3)} мм • размер {np.round(m['size_mm'],3)} мм",
    ]
    if m.get('points_inside_magnets', 0):
        lines.append(f"Внимание: {m['points_inside_magnets']} узлов ROI "
                     "внутри магнитов — исключены из метрик.")
    lines += ["", "КРИТЕРИИ"]
    lines.extend(("[+] " if ok else "[−] ")+label for ok, label in criteria)
    lines.append(f"[{tuning_mark}] {tuning_note}")

    if mode == 'Мышца L5-S1 / T2 CPMG':
        lines += [
            "",
            "ОСНОВА ПРОФИЛЯ МЫШЦЫ",
            "Публикационный ориентир: B0 около 0.2 Тл, частота 8.32–8.42 МГц, "
            "RF-полоса 43 кГц, sweet spot ε=0.5% (5000 ppm), объём 67.5 мм³ "
            "и толщина 1.5 мм.",
            "Требуемая анатомическая глубина: центр чувствительной области "
            "около 8 мм от поверхности датчика; для параспинальной мышцы в "
            "проекте принят ориентир не менее 8–10 мм от кожи.",
            "Программа проверяет магнитное поле, но не знает положение кожи "
            "и толщину корпуса/катушки. Координату плоскости нужно задать "
            "относительно реальной поверхности датчика.",
            "Пороги поворота B0 5° и другие непубликационные значения "
            "являются консервативными инженерными допусками программы.",
        ]
    if mode.startswith("NMR-MOUSE"):
        lines += [
            "",
            "ОСНОВА ГРАДИЕНТНОГО ПРОФИЛЯ (Eidmann/Blumich)",
            "Поле НАМЕРЕННО сильно неоднородно: узкая возбуждаемая зона "
            "задаётся большим градиентом |G| и узкополосным RF-импульсом. "
            "Разброс частот по всему ROI намеренно превышает полосу — это "
            "не дефект, а принцип метода.",
            "Проверяются: 1) средний уровень B0, 2) толщина возбуждаемого "
            "слоя Δz = BW / (γ·|G|) в диапазоне 0.3–3 мм, 3) попадание центра "
            "ROI в настроенную полосу, 4) достаточность |G|, 5) линейность "
            "градиента и 6) параллельность поля.",
            "Полное покрытие ROI полосой здесь не проверяется: оно физически "
            "противоречит градиентному режиму и было бы ложным отказом.",
        ]

    lines += [
        "",
        "ПОЛЕ B0 ВО ВСЁМ ROI",
        f"B0 min / mean / max: {m['b_min_T']*1000:.6f} / {m['b_mean_T']*1000:.6f} / "
        f"{m['b_max_T']*1000:.6f} мТл",
        f"ΔB peak-to-peak: {m['b_span_T']*1000:.6f} мТл",
        f"Неоднородность: {m['ppm_p2p']:.1f} ppm p-p • {m['ppm_rms']:.1f} ppm RMS",
        f"Изменение направления B0: max {m['angle_max_deg']:.3f}° • "
        f"RMS {m['angle_rms_deg']:.3f}°",
        f"Центр Bx/By/Bz: {m['centre_vector_T'][0]*1000:.6f} / "
        f"{m['centre_vector_T'][1]*1000:.6f} / {m['centre_vector_T'][2]*1000:.6f} мТл",
        f"Минимум B0: XYZ={np.round(m['min_point_mm'],3)} мм",
        f"Максимум B0: XYZ={np.round(m['max_point_mm'],3)} мм",
        f"Вектор B в максимуме: {np.round(m['max_vector_T']*1000,6)} мТл",
        "",
        "РЕЗОНАНС И RF",
        f"Лармор в центре: {m['f_centre_MHz']:.6f} МГц",
        f"Диапазон в ROI: {m['f_min_MHz']:.6f} … {m['f_max_MHz']:.6f} МГц",
        f"Разброс частот: {m['f_span_kHz']:.3f} кГц • "
        f"заданная полная полоса: {bandwidth:.3f} кГц",
        f"Узлов ROI внутри настроенной RF-полосы: {coverage_pct:.1f}%",
        f"Настройка передатчика: {frequency:.6f} МГц • {tuning_note}",
        "",
        "ГРАДИЕНТ И РАБОЧИЙ СЛОЙ",
        f"∂|B|/∂X,Y,Z: {gradient[0]:.4f} / {gradient[1]:.4f} / "
        f"{gradient[2]:.4f} Тл/м",
        f"|G|: {m['gradient_norm_T_m']:.4f} Тл/м",
        f"Нелинейность (RMS остатка после линейной модели): "
        f"{m['gradient_nonlinearity_pct']:.3f}%",
        f"Остаточная кривизна: {m['linear_residual_ppm']:.1f} ppm",
        (f"Оценочная толщина возбуждаемого слоя при этой полосе: "
         f"{effective_slice_mm:.3f} мм"
         if np.isfinite(effective_slice_mm)
         else "Толщина слоя по градиенту: не определяется (|G|≈0)"),
        "",
        "МАГНИТНАЯ СБОРКА",
        f"Магнитов: {m['magnet_count']} • суммарный объём: "
        f"{m['magnet_volume_cm3']:.2f} см³",
        f"Оценочная масса NdFeB: {m['estimated_ndfeb_mass_g']:.1f} г "
        "(принята плотность 7.5 г/см³)",
        f"Суммарный дипольный момент XYZ: "
        f"{np.round(m['total_moment_Am2'],4)} А·м² • модуль "
        f"{m['total_moment_norm_Am2']:.4f} А·м²",
        f"Габаритный диапазон XYZ: {np.round(m['assembly_lo_mm'],2)} … "
        f"{np.round(m['assembly_hi_mm'],2)} мм",
        f"Модель поля: "
        f"{'содержит приближённые формы' if m['model_is_approximate'] else 'аналитическая Magpylib для всех форм'}",
        "",
        "КАК ЧИТАТЬ ВЕРДИКТ",
        "Глобальный максимум B0 возле поверхности магнита сам по себе не "
        "показывает пригодность. Решение принимается только по полю во всём "
        "свободном ROI.",
        "Это инженерный фильтр, а не разрешение на эксплуатацию. Пороговые "
        "значения профиля можно менять под вашу последовательность.",
        "Даже положительный результат требует 3D FEM с ярмом и "
        "размагничиванием, карты B0 гауссметром на реальном прототипе, "
        "расчёта/измерения B1, добротности и согласования RF-катушки, "
        "оценки SNR, нагрева/SAR, механических сил, 5-gauss зоны и ЭМС.",
    ]

    # ---------- диагностика при отказе ----------
    if not suitable:
        failed = [label for ok, label in criteria if not ok]
        lines += ["", "ЧТО МЕШАЕТ:", *["• "+item for item in failed]]

        margins = []
        margins.append(
            f"B0 среднее: {m['b_mean_T']*1000:.3f} мТл "
            f"(нужно ≥ {limits['min_b0_mT']:.3f}; не хватает "
            f"{max(0.0, limits['min_b0_mT'] - m['b_mean_T']*1000):.3f} мТл)")

        if mode.startswith("NMR-MOUSE"):
            # Градиентный режим: главный числовой зазор — толщина среза.
            if np.isfinite(slice_mm):
                if slice_mm < 0.3:
                    need_bw = 0.3 * m['gamma_hz_t'] * m['gradient_norm_T_m'] / 1e6
                    margins.append(
                        f"Толщина среза: {slice_mm:.4f} мм "
                        f"(нужно 0.3–3 мм; слой слишком тонкий — "
                        f"увеличьте полосу до ~{need_bw:.0f} кГц "
                        f"или уменьшите |G|)")
                elif slice_mm > 3.0:
                    need_bw = 3.0 * m['gamma_hz_t'] * m['gradient_norm_T_m'] / 1e6
                    margins.append(
                        f"Толщина среза: {slice_mm:.4f} мм "
                        f"(нужно 0.3–3 мм; слой слишком толстый — "
                        f"уменьшите полосу до ~{need_bw:.0f} кГц "
                        f"или увеличьте |G|)")
            else:
                margins.append("Толщина среза: не определяется (|G|≈0)")
            margins.append(
                f"Частота центра ROI: {m['f_centre_MHz']:.6f} МГц "
                f"(нужно {frequency:.6f} ± {bandwidth/2:.3f} кГц)")
        else:
            ratio_ppm = m['ppm_p2p']/max(limits['max_ppm'], 1e-12)
            margins.append(
                f"Неоднородность ppm p-p: {m['ppm_p2p']:.0f} "
                f"(нужно ≤ {limits['max_ppm']:.0f}; превышение ×{ratio_ppm:.2f})")

        ratio_ang = m['angle_max_deg']/max(limits['max_angle_deg'], 1e-12)
        margins.append(
            f"Поворот B0: {m['angle_max_deg']:.3f}° "
            f"(нужно ≤ {limits['max_angle_deg']:.3f}°; превышение ×{ratio_ang:.2f})")
        margins.append(
            f"Нелинейность G: {m['gradient_nonlinearity_pct']:.3f}% "
            f"(нужно ≤ {limits['max_nonlinearity_pct']:.3f}%)")
        if limits.get('min_gradient_T_m', 0) > 0:
            margins.append(
                f"|G|: {m['gradient_norm_T_m']:.4f} Тл/м "
                f"(нужно ≥ {limits['min_gradient_T_m']:.4f} Тл/м)")
        if m.get('points_inside_magnets', 0):
            margins.append(
                f"Внимание: {m['points_inside_magnets']} узлов ROI попадают "
                "в материал магнитов и исключены из метрик.")
        lines += ["", "ЗАЗОРЫ ДО ПОРОГОВ:", *["• "+s for s in margins]]

        # ---------- советы ----------
        advice = []
        if mode.startswith("NMR-MOUSE"):
            if not slice_ok and np.isfinite(slice_mm):
                if slice_mm < 0.3:
                    advice.append(
                        f"Слой слишком тонкий ({slice_mm:.4f} мм). Для CPMG "
                        "это даст очень слабый сигнал. Расширьте полосу RF "
                        "(например, до 200–800 кГц) или уменьшите градиент "
                        "магнитов.")
                elif slice_mm > 3.0:
                    advice.append(
                        f"Слой слишком толстый ({slice_mm:.4f} мм) — теряется "
                        "пространственное разрешение. Уменьшите полосу RF "
                        "или увеличьте градиент (сблизьте полюса, добавьте "
                        "полюсные наконечники).")
            if not center_in_band:
                advice.append(
                    f"Центр ROI не попадает в настроенную полосу. Перенастройте "
                    f"передатчик примерно на {m['f_centre_MHz']:.6f} МГц "
                    f"или сдвиньте ROI, чтобы |B| в центре попал в резонанс.")
        else:
            if not tuned_ok and span_ok:
                advice.append(
                    f"Средняя область пригодна по ширине полосы, но смещена "
                    f"по частоте: настройте RF примерно на "
                    f"{m['f_mean_MHz']:.6f} МГц или измените расстояние/Br "
                    "магнитов.")
            if not span_ok:
                ratio = m['f_span_kHz']/max(bandwidth, 1e-12)
                advice.append(
                    f"Разброс частот шире RF-полосы в {ratio:.1f} раза. "
                    "Сначала уменьшите ROI, особенно вдоль сильного "
                    "градиента; если требуется прежний объём, нужна более "
                    "однородная магнитная геометрия или более широкополосный "
                    "RF-импульс.")
            if not ppm_ok:
                ratio = m['ppm_p2p']/max(limits['max_ppm'], 1e-12)
                advice.append(
                    f"Неоднородность выше допуска в {ratio:.1f} раза. "
                    "Используйте симметрию, Halbach/raised-Halbach, железные "
                    "шимы/ярмо и оптимизацию положения магнитов.")

        if not angle_ok:
            advice.append(
                "Стрелки B сильно расходятся. Переместите ROI от края/полюса "
                "к оси симметрии; если параллельной области нет, измените "
                "направления и компоновку магнитов.")
        if not b0_ok:
            advice.append(
                "Среднее B0 ниже требования. Увеличьте Br/объём магнитов, "
                "приблизьте рабочую область или настройте расстояние пары; "
                "не подменяйте паспортный Br поверхностным измерением B.")

        # «Катастрофический» вердикт — только для действительно тяжёлых случаев.
        if mode.startswith("NMR-MOUSE"):
            severe = (not gradient_ok and
                      m['gradient_norm_T_m'] < 0.2*limits.get('min_gradient_T_m', 1))
        else:
            severe = ((m['f_span_kHz'] > 10*bandwidth) or
                      (m['ppm_p2p'] > 10*limits['max_ppm']) or
                      (m['angle_max_deg'] > 3*limits['max_angle_deg']))
        if severe:
            advice.append(
                "ИТОГ: положение образца само по себе не решит проблему. "
                "Нужна переработка магнитной системы; расширять допуски "
                "до текущих значений нельзя.")
        lines += ["", "КАК ИСПРАВИТЬ:", *["• "+item for item in advice]]

    elif not tuned_ok and not mode.startswith("NMR-MOUSE"):
        lines += ["", "ПЕРЕД ИСПЫТАНИЕМ:",
                  "• Измените частоту настройки RF; геометрия по ширине "
                  "полосы проходит."]
    elif not center_in_band and mode.startswith("NMR-MOUSE"):
        lines += ["", "ПЕРЕД ИСПЫТАНИЕМ:",
                  f"• Перенастройте RF-центр примерно на "
                  f"{m['f_centre_MHz']:.6f} МГц."]

    decision = {
        "suitable": suitable,
        "tuned": center_in_band if mode.startswith("NMR-MOUSE") else tuned_ok,
        "span_ok": span_ok,
        "rf_coverage_pct": coverage_pct,
        "slice_thickness_mm": effective_slice_mm,
        "center_in_band": bool(center_in_band),
        "criteria": [{"name": label, "passed": bool(ok)}
                     for ok, label in criteria],
    }
    return "\n".join(lines), decision


def nmr_candidate_score(metrics, mode, tune_frequency_MHz, bandwidth_kHz, limits):
    """Lower is better; failed physical requirements receive a large penalty."""
    m=metrics;bw=max(float(bandwidth_kHz),1e-9)
    tune=float(tune_frequency_MHz)
    rf_coverage_ratio=max(abs(m['f_min_MHz']-tune),abs(m['f_max_MHz']-tune))*1000/(bw/2)
    b_ratio=limits['min_b0_mT']/max(m['b_mean_T']*1000,1e-12)
    angle=m['angle_max_deg']/max(limits['max_angle_deg'],1e-12)
    if mode.startswith('NMR-MOUSE'):
        nonlinear=m['gradient_nonlinearity_pct']/max(limits['max_nonlinearity_pct'],1e-12)
        required_g=limits.get('min_gradient_T_m',0)
        gradient_ratio=required_g/max(m['gradient_norm_T_m'],1e-12) if required_g>0 else 0
        ratios=[rf_coverage_ratio,b_ratio,angle,nonlinear,gradient_ratio]
        score=3.0*rf_coverage_ratio+1.2*nonlinear+angle+.7*gradient_ratio+.5*b_ratio
    else:
        ppm=m['ppm_p2p']/max(limits['max_ppm'],1e-12)
        ratios=[rf_coverage_ratio,b_ratio,angle,ppm]
        score=3.0*rf_coverage_ratio+2.0*ppm+angle+.5*b_ratio
    failed=sum(r>1 for r in ratios)
    return float(score+failed*100),failed


def find_best_nmr_roi(magnets, size_mm, nucleus, mode, tune_frequency_MHz,
                      bandwidth_kHz, limits, progress=None,
                      fixed_axis=None, fixed_coordinate=None,
                      surface_depth_mm=None):
    """Coarse-to-fine search for the best free ROI centre around the assembly.

    ``surface_depth_mm`` расширяет область поиска наружу вдоль нормали: без
    него стандартный ``scene_bounds`` даёт запас всего 15 %, чего физически
    не хватает поверхностным зондам, у которых центр ROI висит на 5–30 мм
    над полюсной поверхностью.
    """
    size = np.asarray(size_mm, float)
    if size.shape != (3,) or np.any(size <= 0) or not np.all(np.isfinite(size)):
        raise ValueError('Размеры ROI должны быть положительными конечными числами.')
    gamma = NUCLEI_GAMMA_HZ_T[nucleus]
    target_T = float(tune_frequency_MHz)*1e6/gamma

    scene_lo, scene_hi = scene_bounds(magnets)
    reach = max(
        float(size.max()*2.5),
        float(surface_depth_mm + size.max()) if surface_depth_mm is not None else 0.0,
        15.0,
    )
    lo = scene_lo - reach
    hi = scene_hi + reach
    search_lo = lo + size/2
    search_hi = hi - size/2
    if np.any(search_hi <= search_lo):
        raise ValueError('ROI слишком велик для текущей области поиска.')

    if fixed_axis is not None:
        fixed_axis = int(fixed_axis)
        fixed_coordinate = float(fixed_coordinate)
        if not (search_lo[fixed_axis] <= fixed_coordinate <= search_hi[fixed_axis]):
            raise ValueError(
                f'Плоскость ({"XYZ"[fixed_axis]}={fixed_coordinate:.3f} мм) вне области '
                f'поиска [{search_lo[fixed_axis]:.3f}; {search_hi[fixed_axis]:.3f}] мм.')

    axes = [(np.array([fixed_coordinate]) if k == fixed_axis
             else np.linspace(search_lo[k], search_hi[k], 13))
            for k in range(3)]
    candidates = np.array(np.meshgrid(*axes, indexing='ij')).reshape(3, -1).T
    free = ~points_inside_magnets(magnets, candidates)
    candidates = candidates[free]
    if not len(candidates):
        raise ValueError('В области поиска нет свободных точек для центра ROI.')

    centre_strength = np.linalg.norm(field_B(magnets, candidates, density=5),
                                     axis=1)
    order = np.argsort(abs(centre_strength - target_T))
    candidates = candidates[order[:min(180, len(order))]]

    evaluated = []

    def evaluate(centre):
        try:
            metrics = nmr_roi_metrics(magnets, centre, size, nucleus,
                                      resolution=5)
            score, failed = nmr_candidate_score(
                metrics, mode, tune_frequency_MHz, bandwidth_kHz, limits)
            evaluated.append((score, failed, metrics))
        except ValueError:
            pass

    for i, centre in enumerate(candidates):
        evaluate(centre)
        if progress and i % 20 == 0:
            progress(i+1, len(candidates))
    if not evaluated:
        raise ValueError('Ни одно положение ROI не оказалось полностью вне '
                         'магнитов (или поле в них некорректно).')
    evaluated.sort(key=lambda item: item[0])

    # Уточняем вокруг лучших грубых центров со сдвигами в полшага.
    coarse_step = np.array([0 if k == fixed_axis
                            else (search_hi[k]-search_lo[k])/12
                            for k in range(3)])
    seed_centres = [item[2]['centre_mm'] for item in evaluated[:4]]
    for seed in seed_centres:
        offset_values = [(0,) if k == fixed_axis else (-.5, 0, .5)
                         for k in range(3)]
        for dx in offset_values[0]:
            for dy in offset_values[1]:
                for dz in offset_values[2]:
                    centre = seed + coarse_step*np.array([dx, dy, dz])
                    if np.all(centre >= search_lo) and np.all(centre <= search_hi):
                        evaluate(centre)
    evaluated.sort(key=lambda item: item[0])

    # Победителя пересчитываем на отчётной сетке 7³.
    best = None
    for _, _, candidate_metrics in evaluated:
        try:
            best = nmr_roi_metrics(magnets, candidate_metrics['centre_mm'],
                                   size, nucleus, resolution=7)
            break
        except ValueError:
            continue
    if best is None:
        raise ValueError('После уточнения не осталось свободного положения ROI.')
    best_score, best_failed = nmr_candidate_score(best, mode,
                                                  tune_frequency_MHz,
                                                  bandwidth_kHz, limits)
    alternatives = []
    for score, failed, m in evaluated:
        if all(np.linalg.norm(m['centre_mm']-a['centre_mm']) > max(np.min(size)/2, 1)
               for a in alternatives):
            alternatives.append({
                'centre_mm': m['centre_mm'].copy(),
                'score': score, 'failed': failed,
                'b_mT': m['b_mean_T']*1000,
                'f_MHz': m['f_mean_MHz'],
            })
        if len(alternatives) >= 3:
            break
    return {
        'metrics': best, 'score': best_score, 'failed': best_failed,
        'alternatives': alternatives,
        'search_lo_mm': search_lo, 'search_hi_mm': search_hi,
    }


def _magnets_aabb_overlap(magnets):
    visible=[m for m in magnets if m.visible]
    for i in range(len(visible)):
        lo_i,hi_i=magnet_bounds(visible[i])
        for j in range(i):
            lo_j,hi_j=magnet_bounds(visible[j])
            if np.all(np.minimum(hi_i,hi_j)-np.maximum(lo_i,lo_j)>0.05):return True
    return False


def _quick_best_roi(magnets,size,nucleus,mode,frequency,bandwidth,limits,
                    fixed_axis=None,fixed_coordinate=None):
    gamma=NUCLEI_GAMMA_HZ_T[nucleus];target_T=frequency*1e6/gamma
    lo,hi=scene_bounds(magnets);low=lo+size/2;high=hi-size/2
    if np.any(high<=low):return None
    if fixed_axis is not None and not low[fixed_axis]<=fixed_coordinate<=high[fixed_axis]:return None
    axes=[(np.array([fixed_coordinate]) if k==fixed_axis else np.linspace(low[k],high[k],7)) for k in range(3)]
    centres=np.array(np.meshgrid(*axes,indexing='ij')).reshape(3,-1).T
    centres=centres[~points_inside_magnets(magnets,centres)]
    if not len(centres):return None
    centre_b=np.linalg.norm(field_B(magnets,centres,density=4),axis=1)
    candidates=centres[np.argsort(abs(centre_b-target_T))[:min(14,len(centres))]]
    best=None
    for centre in candidates:
        try:
            metrics=nmr_roi_metrics(magnets,centre,size,nucleus,resolution=3)
            score,failed=nmr_candidate_score(metrics,mode,frequency,bandwidth,limits)
            if best is None or score<best[0]:best=(score,failed,metrics)
        except ValueError:
            continue
    return best


def recommend_magnet_dimensions(magnets,size_mm,nucleus,mode,frequency,bandwidth,
                                limits,fixed_axis=None,fixed_coordinate=None,progress=None):
    """Suggest manufacturable global size/spacing changes without altering Br or poles."""
    if not magnets:raise ValueError('Добавьте магниты.')
    size=np.asarray(size_mm,float);original=copy.deepcopy(magnets)
    centres=np.array([m.center for m in original],float);assembly_centre=centres.mean(axis=0)
    two_cylinders=len(original)==2 and all(m.shape=='cylinder' for m in original)
    if two_cylinders:
        configurations=[(r,t,s) for r in (.75,.9,1.0,1.15,1.3,1.5)
                              for t in (.75,1.0,1.25,1.5)
                              for s in (1.0,1.35,1.7,2.1,2.6,3.1)]
    else:
        configurations=[(u,u,s) for u in (.75,.9,1.0,1.15,1.3,1.5)
                               for s in (.8,1.0,1.3,1.6,2.0,2.5)]
    ranked=[]
    for index,(radial_scale,thickness_scale,spacing_scale) in enumerate(configurations):
        trial=copy.deepcopy(original)
        for m,c0 in zip(trial,centres):
            dims=np.asarray(m.size,float)
            if m.shape=='cylinder':
                axial=AX[m.axis]
                for k in range(3):dims[k]*=thickness_scale if k==axial else radial_scale
            else:dims*=radial_scale
            m.size=dims.tolist();m.center=(assembly_centre+(c0-assembly_centre)*spacing_scale).tolist()
        if _magnets_aabb_overlap(trial):continue
        quick=_quick_best_roi(trial,size,nucleus,mode,frequency,bandwidth,limits,fixed_axis,fixed_coordinate)
        if quick is not None:
            score,failed,metrics=quick
            volume_ratio=sum(m.volume_mm3 for m in trial)/max(sum(m.volume_mm3 for m in original),1e-12)
            ranked.append((score+.04*volume_ratio,failed,trial,metrics,radial_scale,thickness_scale,spacing_scale))
        if progress and index%8==0:progress(index+1,len(configurations))
    if not ranked:raise ValueError('Не найдено допустимых вариантов размеров в заданном диапазоне.')
    ranked.sort(key=lambda item:item[0])

    refined=[]
    for _,_,trial,_,radial_scale,thickness_scale,spacing_scale in ranked[:6]:
        try:
            search=find_best_nmr_roi(trial,size,nucleus,mode,frequency,bandwidth,limits,
                                     fixed_axis=fixed_axis,fixed_coordinate=fixed_coordinate)
            score,failed=nmr_candidate_score(search['metrics'],mode,frequency,bandwidth,limits)
            volume_ratio=sum(m.volume_mm3 for m in trial)/max(sum(m.volume_mm3 for m in original),1e-12)
            refined.append((score+.04*volume_ratio,failed,trial,search,radial_scale,thickness_scale,spacing_scale))
        except ValueError:
            continue
    if not refined:raise ValueError('Лучшие грубые варианты не прошли уточнённую проверку ROI.')
    refined.sort(key=lambda item:item[0])
    score,failed,trial,search,radial_scale,thickness_scale,spacing_scale=refined[0]
    return {'magnets':trial,'search':search,'score':score,'failed':failed,
            'radial_scale':radial_scale,'thickness_scale':thickness_scale,
            'spacing_scale':spacing_scale,'two_cylinders':two_cylinders}


def maximize_usable_roi(magnets,base_size_mm,nucleus,mode,frequency,bandwidth,limits,progress=None,
                        surface_constraint=None):
    """Continuously maximize ROI volume while optimizing magnet size/spacing and ROI centre."""
    if differential_evolution is None:
        raise RuntimeError('Для непрерывной оптимизации требуется scipy.optimize.differential_evolution.')
    if not magnets:raise ValueError('Добавьте хотя бы один магнит.')
    original=copy.deepcopy(magnets);base_size=np.asarray(base_size_mm,float)
    if base_size.shape!=(3,) or np.any(base_size<=0):raise ValueError('Исходный ROI должен иметь положительные размеры.')
    centres=np.asarray([m.center for m in original],float);assembly=centres.mean(axis=0)
    two_cylinders=len(original)==2 and all(m.shape=='cylinder' for m in original)
    surface_reference=None
    if surface_constraint is not None:
        normal=int(surface_constraint['axis']);sign=float(surface_constraint['sign'])
        original_faces=[magnet_bounds(m)[1 if sign>0 else 0][normal] for m in original if m.visible]
        surface_reference=max(original_faces) if sign>0 else min(original_faces)
    reach=max(float(np.ptp(centres,axis=0).max()),max(float(max(m.size)) for m in original),float(base_size.max()),10.0)*3.8
    # x = ROI scale, radial/uniform magnet scale, axial scale, centre spacing,
    #     ROI centre X/Y/Z.  The aspect ratio of the requested ROI is preserved.
    bounds=[(.55,3.0),(.60,2.20),(.60,2.0),(.55,3.50),
            (assembly[0]-reach,assembly[0]+reach),(assembly[1]-reach,assembly[1]+reach),(assembly[2]-reach,assembly[2]+reach)]
    if surface_constraint is not None:
        normal=int(surface_constraint['axis'])
        footprint_lo=np.min([magnet_bounds(m)[0] for m in original],axis=0)
        footprint_hi=np.max([magnet_bounds(m)[1] for m in original],axis=0)
        for k in range(3):
            if k==normal:continue
            half=max((footprint_hi[k]-footprint_lo[k])*.65,base_size[k]*1.5,5.0)
            bounds[4+k]=(assembly[k]-half,assembly[k]+half)
    cache={};generation=[0]

    def make_trial(x):
        roi_scale,radial_scale,axial_scale,spacing_scale=x[:4]
        trial=copy.deepcopy(original)
        if surface_constraint is not None and two_cylinders:
            normal=int(surface_constraint['axis']);sign=float(surface_constraint['sign']);in_plane=[k for k in range(3) if k!=normal]
            radial_bases=[]
            for source in original:
                old_axis=AX[source.axis];radial_bases.append(float(np.mean([source.size[k] for k in range(3) if k!=old_axis])))
            base_separation=max(radial_bases)*1.05
            for index,(m,source) in enumerate(zip(trial,original)):
                old_axis=AX[source.axis];thickness=float(source.size[old_axis])*axial_scale;diameter=radial_bases[index]*radial_scale
                dims=np.full(3,diameter);dims[normal]=thickness;m.size=dims.tolist();m.axis=('x','y','z')[normal]
                new_centre=assembly.copy();new_centre[in_plane[0]]+=(index-.5)*base_separation*spacing_scale
                new_centre[normal]=surface_reference-sign*thickness/2;m.center=new_centre.tolist()
                m.direction=('+' if sign>0 else '-')+('X','Y','Z')[normal]
        else:
            for m,c0 in zip(trial,centres):
                dims=np.asarray(m.size,float)
                if m.shape=='cylinder':
                    axial=AX[m.axis]
                    for k in range(3):dims[k]*=axial_scale if k==axial else radial_scale
                else:dims*=radial_scale
                m.size=dims.tolist();m.center=(assembly+(c0-assembly)*spacing_scale).tolist()
        centre=np.asarray(x[4:7],float);size=base_size*roi_scale
        if surface_constraint is not None:
            normal=int(surface_constraint['axis']);sign=float(surface_constraint['sign']);depth=float(surface_constraint['depth_mm'])
            # A surface probe grows only in its plane. Slice thickness along
            # the outward normal remains a physical input, not an optimiser trick.
            size=base_size.copy()
            for k in range(3):
                if k!=normal:size[k]*=roi_scale
            faces=[magnet_bounds(m)[1 if sign>0 else 0][normal] for m in trial if m.visible]
            surface=max(faces) if sign>0 else min(faces)
            centre[normal]=surface+sign*depth
        return trial,size,centre

    def constraint_ratios(metrics):
        half=max(bandwidth/2,1e-12)
        rf=max(abs(metrics['f_min_MHz']-frequency),abs(metrics['f_max_MHz']-frequency))*1000/half
        b0=limits['min_b0_mT']/max(metrics['b_mean_T']*1000,1e-12)
        angle=metrics['angle_max_deg']/max(limits['max_angle_deg'],1e-12)
        if mode.startswith('NMR-MOUSE'):
            nonlinear=metrics['gradient_nonlinearity_pct']/max(limits['max_nonlinearity_pct'],1e-12)
            required=limits.get('min_gradient_T_m',0);gradient=required/max(metrics['gradient_norm_T_m'],1e-12) if required>0 else 0
            return np.array([rf,b0,angle,nonlinear,gradient])
        ppm=metrics['ppm_p2p']/max(limits['max_ppm'],1e-12)
        return np.array([rf,b0,angle,ppm])

    def objective(x):
        key=tuple(np.round(x,5))
        if key in cache:return cache[key]
        trial,size,centre=make_trial(x)
        if _magnets_aabb_overlap(trial):return 1e8
        try:metrics=nmr_roi_metrics(trial,centre,size,nucleus,resolution=3)
        except Exception:return 1e8
        ratios=constraint_ratios(metrics);violations=np.maximum(ratios-1,0)
        failed=float(np.count_nonzero(violations>0));roi_gain=float(np.prod(size)/np.prod(base_size))
        magnet_gain=sum(m.volume_mm3 for m in trial)/max(sum(m.volume_mm3 for m in original),1e-12)
        value=1000*failed+10000*float(violations@violations)-85*math.log(max(roi_gain,1e-12))+.35*float(np.sum(ratios))+.025*magnet_gain
        cache[key]=value;return value

    def callback(xk,convergence):
        generation[0]+=1
        if progress:progress(generation[0],24,float(np.prod(base_size*xk[0])))
        return False

    result=differential_evolution(objective,bounds,seed=7,maxiter=24,popsize=7,tol=.025,
                                  mutation=(.55,1.0),recombination=.75,polish=False,
                                  callback=callback,workers=1,updating='immediate')
    trial,size,centre=make_trial(result.x)
    # Re-search the ROI centre and verify the winning geometry on the denser grid.
    try:
        if surface_constraint is not None:raise ValueError('Поверхностная координата фиксирована оптимизатором.')
        search=find_best_nmr_roi(trial,size,nucleus,mode,frequency,bandwidth,limits)
    except ValueError:
        metrics=nmr_roi_metrics(trial,centre,size,nucleus,resolution=7)
        score,failed=nmr_candidate_score(metrics,mode,frequency,bandwidth,limits)
        search={'metrics':metrics,'score':score,'failed':failed,'alternatives':[]}
    score,failed=nmr_candidate_score(search['metrics'],mode,frequency,bandwidth,limits)
    return {'magnets':trial,'search':search,'score':score,'failed':failed,
            'roi_size_mm':size,'roi_scale':float(result.x[0]),
            'radial_scale':float(result.x[1]),'thickness_scale':float(result.x[2]),
            'spacing_scale':float(result.x[3]),'two_cylinders':two_cylinders,
            'layout':'surface_pair' if surface_constraint is not None and two_cylinders else 'scaled_original',
            'optimizer_success':bool(result.success),'optimizer_message':str(result.message),
            'evaluations':int(result.nfev),'objective':float(result.fun)}


def optimize_roi_homogeneity(magnets,roi_size_mm,roi_centre_mm,nucleus,mode,frequency,bandwidth,limits,
                             surface_constraint=None,progress=None):
    """Optimize individual in-plane magnet positions for uniformity in a fixed ROI."""
    if differential_evolution is None:raise RuntimeError('Для оптимизации однородности требуется SciPy.')
    original=copy.deepcopy(magnets);size=np.asarray(roi_size_mm,float);base_centre=np.asarray(roi_centre_mm,float)
    if not original:raise ValueError('Добавьте магниты.')
    plane=surface_constraint['plane'] if surface_constraint else 'XY';normal=AX[PLANES[plane][2]];in_plane=[k for k in range(3) if k!=normal]
    span=np.max([np.asarray(m.size)[in_plane] for m in original],axis=0)
    bounds=[]
    for _ in original:
        bounds.extend([(-max(span[0]*.45,5),max(span[0]*.45,5)),(-max(span[1]*.45,5),max(span[1]*.45,5))])
    generation=[0]

    def make_trial(x):
        trial=copy.deepcopy(original)
        for i,m in enumerate(trial):
            m.center[in_plane[0]]+=float(x[2*i]);m.center[in_plane[1]]+=float(x[2*i+1])
        centre=base_centre.copy()
        if surface_constraint:
            sign=surface_constraint['sign'];faces=[magnet_bounds(m)[1 if sign>0 else 0][normal] for m in trial]
            surface=max(faces) if sign>0 else min(faces);centre[normal]=surface+sign*surface_constraint['depth_mm']
        return trial,centre

    def objective(x):
        trial,centre=make_trial(x)
        if _magnets_aabb_overlap(trial):return 1e8
        try:m=nmr_roi_metrics(trial,centre,size,nucleus,resolution=3)
        except Exception:return 1e8
        score,failed=nmr_candidate_score(m,mode,frequency,bandwidth,limits)
        ppm_ratio=m['ppm_p2p']/max(limits['max_ppm'],1e-12)
        span_ratio=m['f_span_kHz']/max(bandwidth,1e-12)
        regularization=float(np.sum((np.asarray(x)/np.tile(np.maximum(span,1),len(original)))**2))
        return score+12*ppm_ratio+8*span_ratio+failed*250+.03*regularization

    def callback(xk,convergence):
        generation[0]+=1
        if progress:progress(generation[0],22)
        return False
    res=differential_evolution(objective,bounds,seed=11,maxiter=22,popsize=6,tol=.02,polish=False,
                               callback=callback,workers=1,updating='immediate')
    trial,centre=make_trial(res.x);metrics=nmr_roi_metrics(trial,centre,size,nucleus,resolution=7)
    score,failed=nmr_candidate_score(metrics,mode,frequency,bandwidth,limits)
    return {'magnets':trial,'search':{'metrics':metrics,'score':score,'failed':failed,'alternatives':[]},
            'score':score,'failed':failed,'roi_size_mm':size,'roi_scale':1.0,'radial_scale':1.0,
            'thickness_scale':1.0,'spacing_scale':1.0,'two_cylinders':False,'layout':'homogeneity',
            'optimizer_success':bool(res.success),'optimizer_message':str(res.message),
            'evaluations':int(res.nfev),'objective':float(res.fun)}


def magnet_bounds(m: Magnet):
    c, s = np.asarray(m.center), np.asarray(m.size)
    return c-s/2, c+s/2


def scene_bounds(magnets, target=None):
    target = None  # magnetic scene only; no anatomical geometry
    shown = [m for m in magnets if m.visible]
    if shown:
        lo = np.min([magnet_bounds(m)[0] for m in shown], axis=0)
        hi = np.max([magnet_bounds(m)[1] for m in shown], axis=0)
    else:
        lo, hi = np.array([-50., -30., -20.]), np.array([50., 30., 60.])
    if target:
        surface = hi[2] + target.surface_gap
        tlo = np.array([-target.width/2, -target.length/2, surface+target.depth_from])
        thi = np.array([ target.width/2,  target.length/2, surface+target.depth_to])
        lo, hi = np.minimum(lo, tlo), np.maximum(hi, thi)
    margin = np.maximum((hi-lo)*.15, 8.)
    return lo-margin, hi+margin


def analyse(magnets, target: Target, resolution=7):
    if not magnets:
        raise ValueError("Добавьте хотя бы один магнит")
    top = max(magnet_bounds(m)[1][2] for m in magnets if m.visible)
    surface = top + target.surface_gap
    xs = np.linspace(-target.width/2, target.width/2, resolution)
    ys = np.linspace(-target.length/2, target.length/2, resolution)
    zs = np.linspace(surface+target.depth_from, surface+target.depth_to, max(9, resolution+2))
    rows, best = [], None
    tol_mT = target.rf_kHz * 1e3 / GAMMA_HZ_T * 1e3
    for z in zs:
        pts = np.array(np.meshgrid(xs, ys, [z], indexing="ij")).reshape(3, -1).T
        B = np.linalg.norm(field_B(magnets, pts, density=5), axis=1)*1e3
        mean, spread = float(B.mean()), float(B.max()-B.min())
        score = abs(mean-target.target_mT) + spread
        row = {"z": float(z), "depth": float(z-surface), "min": float(B.min()), "mean": mean,
               "max": float(B.max()), "spread": spread, "score": score, "points": pts, "B": B}
        rows.append(row)
        if best is None or score < best["score"]:
            best = row
    all_pts = np.concatenate([r["points"] for r in rows])
    all_B = np.concatenate([r["B"] for r in rows])
    imax = int(np.argmax(all_B))
    good = [r for r in rows if abs(r["mean"]-target.target_mT) <= tol_mT and r["spread"] <= 2*tol_mT]
    centre_z = np.linspace(surface, surface+max(100., target.depth_to*2), 180)
    centre_pts = np.column_stack([np.zeros_like(centre_z), np.zeros_like(centre_z), centre_z])
    centre_B = np.linalg.norm(field_B(magnets, centre_pts, density=5), axis=1)*1e3
    reach = centre_z[np.where(centre_B >= target.min_mT)[0][-1]]-surface if np.any(centre_B >= target.min_mT) else 0.
    idx_iso = int(np.argmin(abs(centre_B-target.target_mT)))
    return {
        "surface": surface, "tol_mT": tol_mT, "best": best,
        "maximum": (all_pts[imax], float(all_B[imax])),
        "usable_depths": [r["depth"] for r in good], "static_reach": float(reach),
        "iso_depth": float(centre_z[idx_iso]-surface), "iso_B": float(centre_B[idx_iso]),
        "frequency_MHz": best["mean"]*1e-3*GAMMA_HZ_T/1e6,
        "suitable": bool(good), "rows": rows,
    }


def presets():
    return {
        'Хроматек — два соосных диска': [
            Magnet('Верхний диск','cylinder',[0,0,15],[50,50,20],'N45','+Z'),
            Magnet('Нижний диск','cylinder',[0,0,-15],[50,50,20],'N45','+Z'),
        ],
        "Два цилиндра Ø10 × 5 мм — параллельно": [
            Magnet('Цилиндр 1','cylinder',[-8,0,0],[10,10,5],'N45','+Z'),
            Magnet('Цилиндр 2','cylinder',[8,0,0],[10,10,5],'N45','+Z'),
        ],
        "Два цилиндра Ø10 × 5 мм — противоположные полюса": [
            Magnet('Цилиндр 1','cylinder',[-8,0,0],[10,10,5],'N45','+Z'),
            Magnet('Цилиндр 2','cylinder',[8,0,0],[10,10,5],'N45','-Z'),
        ],
        "Простая встречная пара": [
            Magnet("Левый", "box", [-26,0,0], [40,50,20], "N45", "+X"),
            Magnet("Правый", "box", [26,0,0], [40,50,20], "N45", "-X"),
        ],
        "Линейный Halbach 5": [
            Magnet(f"H{i+1}", "box", [(i-2)*22,0,0], [20,40,20], "N52", d)
            for i,d in enumerate(["+X","+Z","-X","-Z","+X"])
        ],
        "4 блока односторонняя": [
            Magnet("Нижний L", "box", [-27,0,0], [50,50,25], "N45", "+Z"),
            Magnet("Нижний R", "box", [27,0,0], [50,50,25], "N45", "+Z"),
            Magnet("Боковой L", "box", [-52,0,25], [25,50,50], "N45", "+X"),
            Magnet("Боковой R", "box", [52,0,25], [25,50,50], "N45", "-X"),
        ],
    }


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("NMR-MOUSE CAD")
        self.geometry("1500x900")
        self.minsize(1080, 680)
        self.magnets = copy.deepcopy(next(iter(presets().values())))
        self.target = Target()
        self.selected = 0
        self.undo_stack, self.redo_stack = [], []
        self.mode = "select"
        self.plane = tk.StringVar(value="XZ")
        self.snap = tk.BooleanVar(value=True)
        self.step = tk.DoubleVar(value=1.0)
        self.drag = None
        self.sketch = []
        self.result = None
        self.fixed_limits = None
        self._build_style(); self._build_menu(); self._build_ui(); self._bind_keys()
        self.refresh(all_views=True, fit=True)

    def _build_style(self):
        s = ttk.Style(self)
        try: s.theme_use("vista")
        except tk.TclError: pass
        s.configure("Toolbar.TButton", padding=(8,5))
        s.configure("Accent.TButton", padding=(10,6), font=("Segoe UI", 9, "bold"))
        s.configure("Treeview", rowheight=25, font=("Segoe UI", 9))
        s.configure("TLabel", font=("Segoe UI", 9))
        s.configure("Section.TLabel", font=("Segoe UI", 10, "bold"))

    def _build_menu(self):
        mb = tk.Menu(self)
        f = tk.Menu(mb, tearoff=False)
        f.add_command(label="Новый", command=self.new_project, accelerator="Ctrl+N")
        f.add_command(label="Открыть…", command=self.open_project, accelerator="Ctrl+O")
        f.add_command(label="Сохранить…", command=self.save_project, accelerator="Ctrl+S")
        f.add_separator(); f.add_command(label="Выход", command=self.destroy)
        mb.add_cascade(label="Проект", menu=f)
        p = tk.Menu(mb, tearoff=False)
        for name in presets(): p.add_command(label=name, command=lambda n=name: self.load_preset(n))
        mb.add_cascade(label="Стартовые схемы", menu=p)
        h = tk.Menu(mb, tearoff=False)
        h.add_command(label="Управление", command=self.show_help)
        h.add_command(label="О точности модели", command=self.show_accuracy)
        mb.add_cascade(label="Справка", menu=h)
        self.config(menu=mb)

    def _build_ui(self):
        """Build the base widgets used by all extended application classes.

        MagneticApp, IntegratedApp and UnifiedIntegratedApp extend this layout
        through ``super()._build_ui()``.  Keeping the common layout here is
        therefore required for the complete inheritance chain to work.
        """
        top = ttk.Frame(self, padding=(8, 7)); top.pack(fill="x")
        for txt, cmd in [
            ("↖ Выбор", lambda: self.set_mode("select")),
            ("▭ Блок", lambda: self.add_magnet("box")),
            ("◯ Цилиндр", lambda: self.add_magnet("cylinder")),
            ("● Эллипсоид", lambda: self.add_magnet("sphere")),
            ("✎ Контур", lambda: self.set_mode("sketch")),
            ("⧉ Копия", self.duplicate),
            ("⌫ Удалить", self.delete_selected),
        ]:
            ttk.Button(top, text=txt, command=cmd, style="Toolbar.TButton").pack(side="left", padx=2)
        ttk.Separator(top, orient="vertical").pack(side="left", fill="y", padx=7)
        ttk.Button(top, text="↶", width=3, command=self.undo).pack(side="left")
        ttk.Button(top, text="↷", width=3, command=self.redo).pack(side="left", padx=(2, 8))
        ttk.Label(top, text="Плоскость:").pack(side="left")
        cmb = ttk.Combobox(top, textvariable=self.plane, values=list(PLANES), width=4, state="readonly")
        cmb.pack(side="left", padx=4); cmb.bind("<<ComboboxSelected>>", lambda e: self.refresh(True, True))
        ttk.Checkbutton(top, text="Сетка", variable=self.snap, command=self.draw_2d).pack(side="left", padx=5)
        ttk.Label(top, text="шаг").pack(side="left")
        ttk.Spinbox(top, from_=.1, to=20, increment=.5, textvariable=self.step, width=5).pack(side="left")
        ttk.Button(top, text="Вписать всё", command=lambda: self.refresh(True, True)).pack(side="right")

        main = ttk.Panedwindow(self, orient="horizontal"); main.pack(fill="both", expand=True)
        self.main_paned = main
        left = ttk.Frame(main, padding=(8, 5), width=245)
        centre = ttk.Frame(main)
        right = ttk.Frame(main, padding=(8, 5), width=315)
        self.left_frame = left
        self.center_frame = centre
        self.right_frame = right
        main.add(left, weight=0); main.add(centre, weight=1); main.add(right, weight=0)

        ttk.Label(left, text="СБОРКА", style="Section.TLabel").pack(anchor="w", pady=(2, 6))
        self.tree = ttk.Treeview(left, columns=("type", "dir"), show="tree headings", selectmode="browse")
        self.tree.heading("#0", text="Имя"); self.tree.heading("type", text="Форма"); self.tree.heading("dir", text="M")
        self.tree.column("#0", width=115); self.tree.column("type", width=65); self.tree.column("dir", width=42, anchor="center")
        self.tree.pack(fill="both", expand=True); self.tree.bind("<<TreeviewSelect>>", self.on_tree_select)
        ttk.Label(
            left,
            text="ЛКМ: выбрать/двигать\nПКМ в 3D: камера\nКолесо: масштаб\nEnter: замкнуть контур",
            foreground="#555",
        ).pack(anchor="w", pady=8)

        self.tabs = ttk.Notebook(centre); self.tabs.pack(fill="both", expand=True)
        self.v2 = ttk.Frame(self.tabs); self.v3 = ttk.Frame(self.tabs); self.vf = ttk.Frame(self.tabs)
        self.tabs.add(self.v2, text=" 2D Эскиз "); self.tabs.add(self.v3, text=" 3D Сборка "); self.tabs.add(self.vf, text=" Карта B0 ")
        self.fig2 = Figure(figsize=(7, 6), dpi=100); self.ax2 = self.fig2.add_subplot(111)
        self.c2 = FigureCanvasTkAgg(self.fig2, self.v2); self.c2.get_tk_widget().pack(fill="both", expand=True)
        self.fig3 = Figure(figsize=(7, 6), dpi=100); self.ax3 = self.fig3.add_subplot(111, projection="3d")
        self.c3 = FigureCanvasTkAgg(self.fig3, self.v3); self.c3.get_tk_widget().pack(fill="both", expand=True)
        nav = NavigationToolbar2Tk(self.c3, self.v3, pack_toolbar=False); nav.update(); nav.pack(fill="x")
        self.figf = Figure(figsize=(7, 6), dpi=100); self.axf = self.figf.add_subplot(111)
        self.cf = FigureCanvasTkAgg(self.figf, self.vf); self.cf.get_tk_widget().pack(fill="both", expand=True)
        for canvas in (self.c2, self.c3):
            canvas.mpl_connect("button_press_event", self.on_press)
            canvas.mpl_connect("motion_notify_event", self.on_motion)
            canvas.mpl_connect("button_release_event", self.on_release)
            canvas.mpl_connect("scroll_event", self.on_wheel)

        self.inspector = ttk.Notebook(right); self.inspector.pack(fill="both", expand=True)
        prop = ttk.Frame(self.inspector, padding=8); ana = ttk.Frame(self.inspector, padding=8)
        self.inspector.add(prop, text="Свойства"); self.inspector.add(ana, text="Мышца и оценка")
        self.vars = {}
        for label, key in [
            ("Имя", "name"), ("X, мм", "x"), ("Y, мм", "y"), ("Z, мм", "z"),
            ("Размер X", "sx"), ("Размер Y", "sy"), ("Размер Z", "sz"),
            ("Br вручную", "br_manual"),
        ]:
            row = ttk.Frame(prop); row.pack(fill="x", pady=3); ttk.Label(row, text=label, width=12).pack(side="left")
            v = tk.StringVar(); self.vars[key] = v
            entry = ttk.Entry(row, textvariable=v); entry.pack(side="left", fill="x", expand=True); entry.bind("<Return>", self.apply_properties)
        for label, key, vals in [
            ("Форма", "shape", ("box", "cylinder", "sphere", "prism")),
            ("Марка", "grade", tuple(GRADES)),
            ("M, S→N", "direction", tuple(DIRS)),
            ("Ось цилиндра", "axis", ("x", "y", "z")),
        ]:
            row = ttk.Frame(prop); row.pack(fill="x", pady=3); ttk.Label(row, text=label, width=12).pack(side="left")
            v = tk.StringVar(); self.vars[key] = v
            combo = ttk.Combobox(row, textvariable=v, values=vals, state="readonly")
            combo.pack(side="left", fill="x", expand=True); combo.bind("<<ComboboxSelected>>", self.apply_properties)
        ttk.Button(prop, text="Применить", command=self.apply_properties, style="Accent.TButton").pack(fill="x", pady=(9, 3))
        self.info = ttk.Label(prop, text="", justify="left", foreground="#555"); self.info.pack(anchor="w", pady=8)

        self.tvars = {}
        for label, key in [
            ("Зазор кожа, мм", "surface_gap"), ("Мышца от, мм", "depth_from"),
            ("Мышца до, мм", "depth_to"), ("ROI X, мм", "width"), ("ROI Y, мм", "length"),
            ("Цель B0, мТл", "target_mT"), ("Полоса RF, кГц", "rf_kHz"), ("Порог поля, мТл", "min_mT"),
        ]:
            row = ttk.Frame(ana); row.pack(fill="x", pady=3); ttk.Label(row, text=label, width=17).pack(side="left")
            v = tk.StringVar(value=str(getattr(self.target, key))); self.tvars[key] = v
            ttk.Entry(row, textvariable=v, width=11).pack(side="right")

        self.fieldvars = {
            "px": tk.StringVar(value="0"),
            "py": tk.StringVar(value="0"),
            "pz": tk.StringVar(value="10"),
            "offset": tk.StringVar(value="0"),
            "frequency": tk.StringVar(value="8.38"),
            "bandwidth": tk.StringVar(value="43"),
        }
        ttk.Button(ana, text="Рассчитать пригодность", command=self.run_analysis, style="Accent.TButton").pack(fill="x", pady=(10, 4))
        ttk.Button(ana, text="Оптимизировать расположение", command=self.optimize_layout).pack(fill="x", pady=3)
        ttk.Separator(ana).pack(fill="x", pady=9)
        self.report = tk.Text(ana, height=20, wrap="word", font=("Segoe UI", 9), relief="flat", background="#f4f4f4", padx=8, pady=8)
        self.report.pack(fill="both", expand=True)
        self.report.insert("1.0", "Нажмите «Рассчитать пригодность».\n\nРасчёт B0 — предварительный, не клинический вывод.")
        self.report.configure(state="disabled")
        self.status = tk.StringVar(value="Готово")
        ttk.Label(self, textvariable=self.status, relief="sunken", anchor="w", padding=(7, 3)).pack(fill="x")



    def _bind_keys(self):
        self.bind("<Control-n>",lambda e:self.new_project()); self.bind("<Control-o>",lambda e:self.open_project()); self.bind("<Control-s>",lambda e:self.save_project())
        self.bind("<Control-z>",lambda e:self.undo()); self.bind("<Control-y>",lambda e:self.redo()); self.bind("<Delete>",lambda e:self.delete_selected())
        for key,delta in [("Left",(-1,0)),("Right",(1,0)),("Up",(0,1)),("Down",(0,-1))]: self.bind(f"<{key}>",lambda e,d=delta:self.nudge(*d))
        self.bind("<Return>",self.finish_sketch); self.bind("<Escape>",lambda e:self.cancel_sketch())

    def snapshot(self):
        self.undo_stack.append(copy.deepcopy(self.magnets)); self.undo_stack=self.undo_stack[-50:]; self.redo_stack.clear()

    def undo(self):
        if not self.undo_stack:return
        self.redo_stack.append(copy.deepcopy(self.magnets)); self.magnets=self.undo_stack.pop(); self.selected=min(self.selected,len(self.magnets)-1); self.refresh(True,True)

    def redo(self):
        if not self.redo_stack:return
        self.undo_stack.append(copy.deepcopy(self.magnets)); self.magnets=self.redo_stack.pop(); self.selected=min(self.selected,len(self.magnets)-1); self.refresh(True,True)

    def set_mode(self,mode):
        self.mode=mode; self.sketch=[]
        self.status.set("Контур: ставьте точки ЛКМ, Enter — завершить, Esc — отмена" if mode=="sketch" else "Выбор: ЛКМ по магниту и перетаскивание")
        self.draw_2d()

    def add_magnet(self,shape):
        self.snapshot(); c=[0.,0.,0.]; c[0]=(len(self.magnets)%5)*8.
        self.magnets.append(Magnet(f"Магнит {len(self.magnets)+1}",shape,c,[30,30,15],"N45","+Z")); self.selected=len(self.magnets)-1; self.mode="select"; self.refresh(True,True)

    def finish_sketch(self,event=None):
        if self.mode!="sketch" or len(self.sketch)<3:return
        a,b,_=PLANES[self.plane.get()]
        if (a,b)!=("x","z"):
            messagebox.showinfo("Произвольный контур","Произвольная призма сейчас рисуется в плоскости XZ. Выберите XZ."); return
        p=np.asarray(self.sketch); center=p.mean(axis=0); local=(p-center).tolist(); sx,sz=np.ptp(p,axis=0)
        self.snapshot(); self.magnets.append(Magnet(f"Контур {len(self.magnets)+1}","prism",[center[0],0,center[1]],[max(sx,1),30,max(sz,1)],"N45","+Z","z",local))
        self.selected=len(self.magnets)-1; self.mode="select"; self.sketch=[]; self.refresh(True,True)

    def cancel_sketch(self): self.mode="select"; self.sketch=[]; self.status.set("Контур отменён"); self.draw_2d()

    def duplicate(self):
        if not self.magnets:return
        self.snapshot(); m=copy.deepcopy(self.magnets[self.selected]); m.name += " копия"; m.center[0]+=self.step.get()*3; self.magnets.append(m); self.selected=len(self.magnets)-1; self.refresh(True,True)

    def delete_selected(self):
        if not self.magnets:return
        self.snapshot(); self.magnets.pop(self.selected); self.selected=min(self.selected,len(self.magnets)-1); self.refresh(True,True)

    def nudge(self,du,dv):
        if not self.magnets or self.focus_get().__class__.__name__ in ("Entry","TEntry","Spinbox","TSpinbox"):return
        self.snapshot(); a,b,_=PLANES[self.plane.get()]; step=self.step.get(); m=self.magnets[self.selected]; m.center[AX[a]]+=du*step; m.center[AX[b]]+=dv*step; self.refresh(True,False)

    def refresh(self,all_views=False,fit=False):
        self.result=None; self.populate_tree(); self.load_properties(); self.draw_2d(fit)
        if all_views:self.draw_3d(fit)

    def populate_tree(self):
        selected_id=None
        for x in self.tree.get_children():self.tree.delete(x)
        for i,m in enumerate(self.magnets):
            iid=self.tree.insert("", "end", text=m.name, values=(m.shape,m.direction));
            if i==self.selected:selected_id=iid
        if selected_id:self.tree.selection_set(selected_id); self.tree.see(selected_id)

    def on_tree_select(self,event=None):
        sel=self.tree.selection()
        if sel:self.selected=self.tree.index(sel[0]); self.load_properties(); self.draw_2d(); self.draw_3d()

    def load_properties(self):
        if not self.magnets:return
        m=self.magnets[self.selected]; vals={"name":m.name,"x":m.center[0],"y":m.center[1],"z":m.center[2],"sx":m.size[0],"sy":m.size[1],"sz":m.size[2],"br_manual":m.remanence_T,"shape":m.shape,"grade":m.grade,"direction":m.direction,"axis":m.axis}
        for k,v in vals.items():self.vars[k].set(f"{v:g}" if isinstance(v,float) else str(v))
        source=(f"вручную {m.remanence_T:.3f} Тл" if m.remanence_T>0 else f"по марке {m.grade}")
        self.info.config(text=f"Объём: {m.volume_mm3/1000:.1f} см³\nРасчётный Br: {m.br:.3f} Тл ({source})\nM направлено S → N")

    def apply_properties(self,event=None):
        if not self.magnets:return
        try:
            self.snapshot(); m=self.magnets[self.selected]; m.name=self.vars["name"].get().strip() or m.name
            m.center=[float(self.vars[k].get().replace(",",".")) for k in ("x","y","z")]
            m.size=[max(.2,float(self.vars[k].get().replace(",","."))) for k in ("sx","sy","sz")]
            custom_br=float(self.vars["br_manual"].get().replace(",","."))
            if not np.isfinite(custom_br) or custom_br<0 or custom_br>3:raise ValueError
            m.remanence_T=custom_br
            m.shape=self.vars["shape"].get(); m.grade=self.vars["grade"].get(); m.direction=self.vars["direction"].get(); m.axis=self.vars["axis"].get(); self.refresh(True,True)
        except ValueError: messagebox.showerror("Ошибка","Координаты/размеры должны быть числами; Br вручную — от 0 до 3 Тл (0 означает значение по марке)")

    def _target_from_ui(self):
        try:
            for k,v in self.tvars.items():setattr(self.target,k,float(v.get().replace(",",".")))
            if self.target.depth_to<=self.target.depth_from:raise ValueError
            return True
        except ValueError:messagebox.showerror("Ошибка","Проверьте параметры мышцы: конечная глубина должна быть больше начальной");return False

    def _limits2d(self):
        a,b,_=PLANES[self.plane.get()]; lo,hi=scene_bounds(self.magnets,self.target); return (lo[AX[a]],hi[AX[a]]),(lo[AX[b]],hi[AX[b]])

    def draw_2d(self,fit=False):
        ax=self.ax2; old=(ax.get_xlim(),ax.get_ylim()); ax.clear(); a,b,fixed=PLANES[self.plane.get()]
        ax.set_facecolor("#fbfbfc"); ax.set_xlabel(f"{a.upper()}, мм"); ax.set_ylabel(f"{b.upper()}, мм"); ax.set_aspect("equal",adjustable="box")
        if self.snap.get(): ax.grid(True,color="#dfe3e8",linewidth=.6); ax.set_axisbelow(True)
        for i,m in enumerate(self.magnets):
            c=np.asarray(m.center); s=np.asarray(m.size); u,v=c[AX[a]],c[AX[b]]; su,sv=s[AX[a]],s[AX[b]]
            ec="#1769aa" if i==self.selected else "#596773"; fc="#a9d6f5" if i==self.selected else "#dce5eb"
            if m.shape in ("cylinder","sphere"):
                patch=Ellipse((u,v),su,sv,facecolor=fc,edgecolor=ec,linewidth=2 if i==self.selected else 1.2,alpha=.82)
            elif m.shape=="prism" and self.plane.get()==m.contour_plane and m.polygon:
                q=np.asarray(m.polygon)+np.asarray(m.center)[[AX[a],AX[b]]]; patch=Polygon(q,closed=True,facecolor=fc,edgecolor=ec,linewidth=2)
            else: patch=Rectangle((u-su/2,v-sv/2),su,sv,facecolor=fc,edgecolor=ec,linewidth=2 if i==self.selected else 1.2,alpha=.82)
            patch.set_gid(str(i)); ax.add_patch(patch); ax.text(u,v,m.name,ha="center",va="center",fontsize=8,color="#263238")
            self._draw_poles_2d(ax,m,a,b)
        if False:  # anatomical overlay removed
            top=max(magnet_bounds(m)[1][2] for m in self.magnets)+self.target.surface_gap
            if b=="z":
                ax.axhline(top,color="#b89538",lw=2); ax.text(ax.get_xlim()[0],top," кожа",va="bottom",color="#806515")
                ax.axhspan(top+self.target.depth_from,top+self.target.depth_to,color="#e8b5a8",alpha=.22)
        if self.sketch:
            q=np.asarray(self.sketch); ax.plot(q[:,0],q[:,1],"o-",color="#8e44ad",lw=2)
        if fit or old[0]==(0.,1.): ax.set_xlim(*self._limits2d()[0]); ax.set_ylim(*self._limits2d()[1])
        else: ax.set_xlim(old[0]); ax.set_ylim(old[1])
        ax.set_title(f"Рабочая плоскость {self.plane.get()}  •  N — красный, S — синий",fontsize=11)
        self.c2.draw_idle()

    def _draw_poles_2d(self,ax,m,a,b):
        d=m.mvec; du,dv=d[AX[a]],d[AX[b]]
        if abs(du)+abs(dv)<.1:return
        scale=.42*min(m.size[AX[a]],m.size[AX[b]]); u,v=np.asarray(m.center)[[AX[a],AX[b]]]
        ax.annotate("",xy=(u+du*scale,v+dv*scale),xytext=(u-du*scale,v-dv*scale),arrowprops=dict(arrowstyle="->",lw=2,color="#e74c3c"))
        ax.text(u+du*scale,v+dv*scale,"N",ha="center",va="center",color="white",fontsize=8,fontweight="bold",bbox=dict(boxstyle="circle,pad=.18",fc="#e74c3c",ec="white"))
        ax.text(u-du*scale,v-dv*scale,"S",ha="center",va="center",color="white",fontsize=8,fontweight="bold",bbox=dict(boxstyle="circle,pad=.18",fc="#2980b9",ec="white"))

    def draw_3d(self,fit=False):
        ax=self.ax3; elev,azim=ax.elev,ax.azim; ax.clear(); ax.set_facecolor("#fbfbfc")
        for i,m in enumerate(self.magnets):
            self._box3d(ax,m,i); self._poles3d(ax,m)
        lo,hi=scene_bounds(self.magnets,self.target)
        if fit or self.fixed_limits is None:self.fixed_limits=(lo,hi)
        lo,hi=self.fixed_limits; ax.set_xlim(lo[0],hi[0]); ax.set_ylim(lo[1],hi[1]); ax.set_zlim(lo[2],hi[2]); ax.set_box_aspect(np.maximum(hi-lo,1))
        ax.set_xlabel("X, мм"); ax.set_ylabel("Y, мм"); ax.set_zlabel("Z, мм")
        ax.view_init(elev=elev if np.isfinite(elev) else 25,azim=azim if np.isfinite(azim) else -55)
        ax.set_title("3D сборка • ЛКМ перетаскивает в рабочей плоскости • ПКМ вращает камеру")
        self.c3.draw_idle()

    def _box3d(self,ax,m,i):
        face="#87c5ed" if i==self.selected else "#b8c7d1"; edge="#1769aa" if i==self.selected else "#52636f"
        if m.shape == "sphere":
            u=np.linspace(0,2*np.pi,24); v=np.linspace(0,np.pi,14); c=np.asarray(m.center); s=np.asarray(m.size)/2
            x=c[0]+s[0]*np.outer(np.cos(u),np.sin(v)); y=c[1]+s[1]*np.outer(np.sin(u),np.sin(v)); z=c[2]+s[2]*np.outer(np.ones_like(u),np.cos(v))
            ax.plot_surface(x,y,z,color=face,edgecolor=edge,linewidth=.25,alpha=.48); ax.text(*m.center,m.name,fontsize=8,ha="center"); return
        if m.shape == "cylinder":
            c=np.asarray(m.center); s=np.asarray(m.size); t=np.linspace(0,2*np.pi,28); h=np.linspace(-s[AX[m.axis]]/2,s[AX[m.axis]]/2,2); tt,hh=np.meshgrid(t,h)
            xyz=[np.zeros_like(tt)+c[k] for k in range(3)]; a=AX[m.axis]; rad=[k for k in range(3) if k!=a]
            xyz[a]=c[a]+hh; xyz[rad[0]]=c[rad[0]]+s[rad[0]]/2*np.cos(tt); xyz[rad[1]]=c[rad[1]]+s[rad[1]]/2*np.sin(tt)
            ax.plot_surface(*xyz,color=face,edgecolor=edge,linewidth=.3,alpha=.48); ax.text(*m.center,m.name,fontsize=8,ha="center"); return
        if m.shape == "prism" and len(m.polygon)>=3:
            ia,ib,ic=[AX[k] for k in PLANES[m.contour_plane]]
            p=np.asarray(m.polygon); front=np.tile(m.center,(len(p),1)).astype(float);back=front.copy()
            for side,sign in [(front,-1),(back,1)]:
                side[:,ia]+=p[:,0];side[:,ib]+=p[:,1];side[:,ic]+=sign*m.size[ic]/2
            faces=[front,back]
            for k in range(len(p)): faces.append([front[k],front[(k+1)%len(p)],back[(k+1)%len(p)],back[k]])
            ax.add_collection3d(Poly3DCollection(faces,facecolor=face,edgecolor=edge,alpha=.48,linewidth=.9)); ax.text(*m.center,m.name,fontsize=8,ha="center"); return
        lo,hi=magnet_bounds(m); x0,y0,z0=lo; x1,y1,z1=hi
        verts=[[(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0)],[(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)],
               [(x0,y0,z0),(x1,y0,z0),(x1,y0,z1),(x0,y0,z1)],[(x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1)],
               [(x0,y0,z0),(x0,y1,z0),(x0,y1,z1),(x0,y0,z1)],[(x1,y0,z0),(x1,y1,z0),(x1,y1,z1),(x1,y0,z1)]]
        col=Poly3DCollection(verts,facecolor=face,edgecolor=edge,alpha=.48,linewidth=.9); ax.add_collection3d(col)
        ax.text(*m.center,m.name,fontsize=8,ha="center")

    def _poles3d(self,ax,m):
        c=np.asarray(m.center,float); d=m.mvec; scale=.55*max(m.size)
        s=c-d*scale/2; n=c+d*scale/2; ax.quiver(*s,*((n-s)),color="#e74c3c",arrow_length_ratio=.2,linewidth=2)
        ax.text(*n,"N",color="white",ha="center",va="center",bbox=dict(boxstyle="circle,pad=.18",fc="#e74c3c",ec="white"),fontsize=8)
        ax.text(*s,"S",color="white",ha="center",va="center",bbox=dict(boxstyle="circle,pad=.18",fc="#2980b9",ec="white"),fontsize=8)

    def _nearest_2d(self,event,canvas3d=False):
        if not self.magnets:return None
        best=(1e9,None)
        if canvas3d:
            for i,m in enumerate(self.magnets):
                x,y,_=proj3d.proj_transform(*m.center,self.ax3.get_proj()); px,py=self.ax3.transData.transform((x,y)); dist=math.hypot(px-event.x,py-event.y)
                if dist<best[0]:best=(dist,i)
            return best[1] if best[0]<60 else None
        if event.xdata is None:return None
        a,b,_=PLANES[self.plane.get()]
        for i,m in enumerate(self.magnets):
            u,v=np.asarray(m.center)[[AX[a],AX[b]]]; su,sv=np.asarray(m.size)[[AX[a],AX[b]]]; dist=((event.xdata-u)/(su/2+1e-9))**2+((event.ydata-v)/(sv/2+1e-9))**2
            if dist<best[0]:best=(dist,i)
        return best[1] if best[0]<=1.5 else None

    def on_press(self,event):
        if event.button!=1:return
        if self.mode=="sketch" and event.canvas==self.c2 and event.xdata is not None:
            val=[event.xdata,event.ydata]; step=self.step.get()
            if self.snap.get():val=[round(v/step)*step for v in val]
            self.sketch.append(val); self.draw_2d(); return
        idx=self._nearest_2d(event,event.canvas==self.c3)
        if idx is None:return
        self.selected=idx; self.snapshot(); self.drag=(event.x,event.y,copy.deepcopy(self.magnets[idx].center),event.canvas); self.populate_tree(); self.load_properties()

    def on_motion(self,event):
        if not self.drag or event.canvas!=self.drag[3]:return
        x0,y0,c0,_=self.drag; a,b,_=PLANES[self.plane.get()]
        if event.canvas==self.c2 and event.xdata is not None:
            inv=self.ax2.transData.inverted(); p0=inv.transform((x0,y0)); p1=inv.transform((event.x,event.y)); du,dv=p1-p0
        else:
            box=event.canvas.get_tk_widget(); w=max(box.winfo_width(),1); h=max(box.winfo_height(),1); lo,hi=self.fixed_limits
            du=(event.x-x0)/w*(hi[AX[a]]-lo[AX[a]]); dv=(event.y-y0)/h*(hi[AX[b]]-lo[AX[b]])
        c=list(c0); c[AX[a]]+=du; c[AX[b]]+=dv
        if self.snap.get():
            st=self.step.get(); c[AX[a]]=round(c[AX[a]]/st)*st; c[AX[b]]=round(c[AX[b]]/st)*st
        self.magnets[self.selected].center=c; self.load_properties(); self.draw_2d(); self.draw_3d(False)

    def on_release(self,event):
        if self.drag:self.drag=None; self.status.set("Положение изменено — оценку можно пересчитать")

    def on_wheel(self,event):
        ax=self.ax3 if event.canvas==self.c3 else self.ax2; factor=.82 if event.button=="up" else 1.22
        if ax==self.ax2:
            xl,yl=ax.get_xlim(),ax.get_ylim(); cx=event.xdata if event.xdata is not None else sum(xl)/2; cy=event.ydata if event.ydata is not None else sum(yl)/2
            ax.set_xlim(cx+(xl[0]-cx)*factor,cx+(xl[1]-cx)*factor); ax.set_ylim(cy+(yl[0]-cy)*factor,cy+(yl[1]-cy)*factor); self.c2.draw_idle()

    def run_analysis(self):
        if not self._target_from_ui():return
        try:
            self.status.set("Расчёт поля…"); self.update_idletasks(); self.result=analyse(self.magnets,self.target,7); r=self.result; b=r["best"]; p,bmax=r["maximum"]
            usable=(f"{min(r['usable_depths']):.1f}–{max(r['usable_depths']):.1f} мм" if r["usable_depths"] else "не найдена")
            verdict="ПОДХОДИТ по модели B0" if r["suitable"] else "НЕ ПОДТВЕРЖДЕНО по модели B0"
            text=(f"{verdict}\n\nЛучший слой: {b['depth']:.1f} мм\nB0 min / mean / max: {b['min']:.1f} / {b['mean']:.1f} / {b['max']:.1f} мТл\n"
                  f"Неоднородность ΔB: {b['spread']:.2f} мТл\nЧастота центра: {r['frequency_MHz']:.3f} МГц\nДопуск по RF: ±{r['tol_mT']:.2f} мТл\n"
                  f"Рабочие глубины: {usable}\nИзополе {self.target.target_mT:.0f} мТл по оси: {r['iso_depth']:.1f} мм ({r['iso_B']:.1f} мТл)\n"
                  f"Дальность B0 ≥ {self.target.min_mT:.0f} мТл: {r['static_reach']:.1f} мм\n\nМаксимум в объёме мышцы: {bmax:.1f} мТл\nX={p[0]:.1f}, Y={p[1]:.1f}, Z={p[2]:.1f} мм\n\n"
                  "Важно: это предварительная оценка постоянного поля B0. Она не учитывает ярмо, размагничивание, B1, катушку, согласование, SNR и влияние ткани. Для диагностики T2 нужен прототип и измерения.")
            self.report.configure(state="normal"); self.report.delete("1.0","end"); self.report.insert("1.0",text); self.report.configure(state="disabled")
            self.draw_field(); self.tabs.select(self.vf); self.status.set("Оценка завершена")
        except Exception as e:messagebox.showerror("Расчёт",str(e)); self.status.set("Ошибка расчёта")

    def draw_field(self):
        if not self.result:return
        self.figf.clear(); self.axf=self.figf.add_subplot(111); ax=self.axf; r=self.result; z=r["best"]["z"]; nx=51; ny=51
        xs=np.linspace(-self.target.width/2,self.target.width/2,nx); ys=np.linspace(-self.target.length/2,self.target.length/2,ny)
        pts=np.array(np.meshgrid(xs,ys,[z],indexing="ij")).reshape(3,-1).T; B=np.linalg.norm(field_B(self.magnets,pts,5),axis=1).reshape(nx,ny)*1e3
        im=ax.contourf(xs,ys,B.T,24,cmap="viridis"); self.figf.colorbar(im,ax=ax,label="|B0|, мТл")
        k=np.unravel_index(np.argmax(B),B.shape); ax.plot(xs[k[0]],ys[k[1]],"r*",ms=14,label="максимум в слое")
        ax.set_xlabel("X, мм"); ax.set_ylabel("Y, мм"); ax.set_aspect("equal"); ax.set_title(f"Карта B0 на глубине {r['best']['depth']:.1f} мм"); ax.legend(); self.cf.draw_idle()

    def optimize_layout(self):
        if len(self.magnets)<2 or not self._target_from_ui():return
        if minimize is None:messagebox.showwarning("Оптимизация","SciPy не найден. Установите scipy или используйте ручное перемещение.");return
        if not messagebox.askokcancel("Оптимизация","Будут изменяться только X и Z центров магнитов. Размеры, Y и поляризация останутся фиксированными. Продолжить?"):return
        self.snapshot(); original=copy.deepcopy(self.magnets); x0=np.array([[m.center[0],m.center[2]] for m in original]).ravel(); lo,hi=scene_bounds(original,None)
        bounds=[(lo[0]-30,hi[0]+30),(lo[2]-20,hi[2]+30)]*len(original)
        def obj(x):
            test=copy.deepcopy(original)
            for i,m in enumerate(test):m.center[0],m.center[2]=x[2*i],x[2*i+1]
            try:r=analyse(test,self.target,5); base=r["best"]["score"]
            except Exception:return 1e6
            reg=.002*np.sum((x-x0)**2); overlap=0.
            for i in range(len(test)):
                for j in range(i):
                    li,hi_i=magnet_bounds(test[i]); lj,hi_j=magnet_bounds(test[j]); inter=np.maximum(0,np.minimum(hi_i,hi_j)-np.maximum(li,lj)); overlap+=np.prod(inter)*.02
            return base+reg+overlap
        self.status.set("Оптимизация… окно остаётся отзывчивым"); self.update_idletasks()
        try:
            res=minimize(obj,x0,method="Powell",bounds=bounds,options={"maxiter":45,"xtol":.4,"ftol":.15})
            for i,m in enumerate(self.magnets):m.center[0],m.center[2]=float(res.x[2*i]),float(res.x[2*i+1])
            self.refresh(True,True); self.status.set(f"Оптимизация завершена: {res.fun:.2f}"); self.run_analysis()
        except Exception as e:self.magnets=original; self.refresh(True,True); messagebox.showerror("Оптимизация",str(e))

    def load_preset(self,name):
        if not messagebox.askokcancel("Стартовая схема",f"Заменить текущую сборку на «{name}»?\n\nЭто концептуальная стартовая геометрия, не точная копия коммерческого датчика."):return
        self.snapshot(); self.magnets=copy.deepcopy(presets()[name]); self.selected=0; self.refresh(True,True)

    def new_project(self):
        if messagebox.askokcancel("Новый проект","Очистить текущую сборку?"):self.snapshot();self.magnets=[];self.selected=-1;self.refresh(True,True)

    def save_project(self):
        p=filedialog.asksaveasfilename(defaultextension=".json",filetypes=[("NMR-MOUSE CAD","*.json")])
        if p:Path(p).write_text(json.dumps({"version":1,"magnets":[asdict(m) for m in self.magnets],"target":asdict(self.target)},ensure_ascii=False,indent=2),encoding="utf-8");self.status.set(f"Сохранено: {p}")

    def open_project(self):
        p=filedialog.askopenfilename(filetypes=[("NMR-MOUSE CAD","*.json"),("Все файлы","*.*")])
        if not p:return
        try:
            d=json.loads(Path(p).read_text(encoding="utf-8")); self.snapshot(); self.magnets=[Magnet(**x) for x in d["magnets"]]; self.target=Target(**d.get("target",{})); self.selected=0 if self.magnets else -1
            for k,v in asdict(self.target).items():self.tvars[k].set(str(v))
            self.refresh(True,True);self.status.set(f"Открыто: {p}")
        except Exception as e:messagebox.showerror("Открытие",str(e))

    def show_help(self):
        messagebox.showinfo("Управление","1. Добавьте примитив или нарисуйте контур в XZ.\n2. Выберите магнит в дереве или прямо на сцене.\n3. Перетаскивайте ЛКМ; сетка задаёт точный шаг.\n4. Стрелки двигают в рабочей плоскости.\n5. В 3D ПКМ вращает камеру, панель Matplotlib даёт панораму/масштаб.\n6. Введите глубину мышцы и нажмите «Рассчитать пригодность».\n\nВо время перетаскивания пределы осей фиксированы — геометрия больше не «прыгает».")

    def show_accuracy(self):
        messagebox.showinfo("Точность","Модель разбивает магнит на малые диполи. Она полезна для быстрого сравнения схем и поиска направления оптимизации, но неточна возле поверхности и не моделирует мягкое железо.\n\nФинальный вариант проверьте в FEMM/COMSOL/Ansys Maxwell или измерьте гауссметром. Для NMR отдельно рассчитайте RF-катушку B1, SNR, полосу и нагрев.")


class MagneticApp(App):
    """Magnetic-only workspace; numerical geometry and field share SI conventions."""

    def _build_ui(self):
        super()._build_ui()
        host = self.inspector.master
        self.inspector.destroy()
        # Fixed side-column widths keep the plot visually centred while leaving
        # enough room for complete Russian captions in the controls.
        host.configure(width=340)

        # Visual ROI passport sits below the plot so the drawing area keeps its width.
        main_pw = getattr(self, 'main_paned', host.master)
        passport_height = max(225, min(270, int(self.winfo_screenheight() * .245)))
        far_right = ttk.Frame(getattr(self, 'center_frame', self), padding=(4, 2),
                              height=passport_height)
        far_right.pack(side='bottom', fill='x')
        far_right.pack_propagate(False)
        try:
            self.tabs.pack_forget()
            self.tabs.pack(side='top', fill='both', expand=True)
        except Exception:
            pass
        self.right_settings_frame = host
        self.roi_report_frame = far_right

        # Assembly and selected-magnet settings live together on the left.
        left_host = self.tree.master;
        left_host.configure(width=295)
        self.left_settings_frame = left_host
        for child in left_host.winfo_children():
            if child is self.tree: continue
            try:
                keep = isinstance(child, ttk.Label) and child.cget('text') == 'СБОРКА'
            except tk.TclError:
                keep = False
            if not keep: child.pack_forget()
        self.tree.pack_forget();
        self.tree.configure(height=7)
        self.tree.pack(fill='x', expand=False, pady=(0, 4))
        left_canvas = tk.Canvas(left_host, highlightthickness=0, width=285)
        left_scroll = ttk.Scrollbar(left_host, orient='vertical', command=left_canvas.yview)
        left_panel = ttk.Frame(left_canvas, padding=(2, 2, 6, 8))
        left_window = left_canvas.create_window((0, 0), window=left_panel, anchor='nw')
        left_canvas.configure(yscrollcommand=left_scroll.set)
        self.left_scroll_canvas = left_canvas
        self.left_scroll_panel = left_panel
        left_canvas.pack(side='left', fill='both', expand=True);
        left_scroll.pack(side='right', fill='y')
        left_panel.bind('<Configure>', lambda e: left_canvas.configure(scrollregion=left_canvas.bbox('all')))
        left_canvas.bind('<Configure>', lambda e: left_canvas.itemconfigure(left_window, width=e.width))

        # Experiment, ROI, criteria and the live verdict stay on the right (ОДИН БОЛЬШОЙ СКРОЛЛ).
        right_canvas = tk.Canvas(host, highlightthickness=0, width=330)
        scrollbar = ttk.Scrollbar(host, orient='vertical', command=right_canvas.yview)
        panel = ttk.Frame(right_canvas, padding=(6, 2, 7, 5))
        window_id = right_canvas.create_window((0, 0), window=panel, anchor='nw')
        right_canvas.configure(yscrollcommand=scrollbar.set)
        self.right_scroll_canvas = right_canvas
        self.right_scroll_panel = panel
        right_canvas.pack(side='left', fill='both', expand=True);
        scrollbar.pack(side='right', fill='y')
        panel.bind('<Configure>', lambda e: right_canvas.configure(scrollregion=right_canvas.bbox('all')))
        right_canvas.bind('<Configure>', lambda e: right_canvas.itemconfigure(window_id, width=e.width))

        # Мы убрали скролл паспорта, поэтому привязываем колесо только к левой панели и панели настроек
        self._wheel_areas = [(left_canvas, left_panel), (right_canvas, panel)]
        self.bind_all('<MouseWheel>', self._route_panel_wheel, add='+')
        self.bind_all('<Button-4>', self._route_panel_wheel, add='+')
        self.bind_all('<Button-5>', self._route_panel_wheel, add='+')
        self.bind_class('TCombobox', '<MouseWheel>', lambda e: 'break', add='+')
        self.bind_class('TCombobox', '<Button-4>', lambda e: 'break', add='+')
        self.bind_class('TCombobox', '<Button-5>', lambda e: 'break', add='+')

        ttk.Label(panel, text='ЕДИНЫЙ РАБОЧИЙ СТОЛ ЯМР', style='Section.TLabel').pack(anchor='w', pady=(1, 3))

        # Бейдж статуса теперь над паспортом в 4-й панели
        passport_bar = ttk.Frame(far_right)
        passport_bar.pack(fill='x', pady=(0, 2))
        self.passport_bar = passport_bar
        self.live_badge = tk.Label(passport_bar, text='● Ожидание расчёта', anchor='w',
                                   font=('Segoe UI', 9, 'bold'), bg='#eceff1',
                                   fg='#455a64', padx=8, pady=4)
        self.live_badge.pack(side='left', fill='x', expand=True)

        magnet_box = ttk.LabelFrame(left_panel, text='Настройка выбранного магнита', padding=6);
        magnet_box.pack(fill='x', pady=3)

        def property_row(label, key, values=None):
            row = ttk.Frame(magnet_box);
            row.pack(fill='x', pady=1);
            ttk.Label(row, text=label, width=17).pack(side='left')
            if values is None:
                w = ttk.Entry(row, textvariable=self.vars[key])
            else:
                w = ttk.Combobox(row, textvariable=self.vars[key], values=values, state='readonly')
            w.pack(side='left', fill='x', expand=True);
            w.bind('<Return>', lambda e: self.apply_properties_and_recalculate())
            if values is not None: w.bind('<<ComboboxSelected>>', lambda e: self.apply_properties_and_recalculate())

        property_row('Имя', 'name')
        coordinates = ttk.Frame(magnet_box);
        coordinates.pack(fill='x', pady=2)
        for label, key in [('X', 'x'), ('Y', 'y'), ('Z', 'z')]:
            ttk.Label(coordinates, text=label).pack(side='left');
            entry = ttk.Entry(coordinates, textvariable=self.vars[key], width=7);
            entry.pack(side='left', padx=(2, 5));
            entry.bind('<Return>', lambda e: self.apply_properties_and_recalculate())
        dimensions = ttk.Frame(magnet_box);
        dimensions.pack(fill='x', pady=2)
        for label, key in [('SX', 'sx'), ('SY', 'sy'), ('SZ', 'sz')]:
            ttk.Label(dimensions, text=label).pack(side='left');
            entry = ttk.Entry(dimensions, textvariable=self.vars[key], width=7);
            entry.pack(side='left', padx=(2, 5));
            entry.bind('<Return>', lambda e: self.apply_properties_and_recalculate())
        property_row('Форма', 'shape', ('box', 'cylinder', 'sphere', 'prism'))
        property_row('Марка NdFeB', 'grade', tuple(GRADES));
        property_row('Br вручную, Тл', 'br_manual')
        property_row('M: S → N', 'direction', tuple(DIRS));
        property_row('Ось цилиндра', 'axis', ('x', 'y', 'z'))
        ttk.Button(magnet_box, text='Применить магнит и пересчитать', command=self.apply_properties_and_recalculate,
                   style='Accent.TButton').pack(fill='x', pady=(6, 1))
        self.info = ttk.Label(magnet_box, text='', justify='left', foreground='#555')
        self.info.pack(anchor='w', pady=(4, 1))
        ttk.Button(magnet_box, text='Расстояние и угол двух магнитов…', command=self.pair_dialog).pack(fill='x',
                                                                                                       pady=(5, 2))
        magnet_help = ttk.Label(
            left_panel,
            text='ЛКМ — выбрать и перетащить магнит\n'
                 'Колесо — прокрутка этой панели\n'
                 'ПКМ в 3D — вращение камеры',
            justify='left', foreground='#555')

        roi_box = ttk.LabelFrame(panel, text='2. Рабочий объём и эксперимент', padding=6);
        roi_box.pack(fill='x', pady=3)
        self.nmrvars = {
            'profile': tk.StringVar(value='Мышца L5-S1 / T2 CPMG'), 'nucleus': tk.StringVar(value='1H (протон)'),
            'frequency': tk.StringVar(value='8.38'), 'bandwidth': tk.StringVar(value='43'),
            'grid': tk.StringVar(value='7'),
            'cx': tk.StringVar(value=self.fieldvars['px'].get()), 'cy': tk.StringVar(value=self.fieldvars['py'].get()),
            'cz': tk.StringVar(value=self.fieldvars['pz'].get()),
            'sx': tk.StringVar(value='6.7'), 'sy': tk.StringVar(value='6.7'), 'sz': tk.StringVar(value='1.5'),
            'surface_mode': tk.BooleanVar(value=True), 'surface_plane': tk.StringVar(value='XY'),
            'surface_side': tk.StringVar(value='+'), 'surface_depth': tk.StringVar(value='8'),
            'surface_thickness': tk.StringVar(value='1.5'),
            'map_mode': tk.StringVar(value='|B0|, мТл'),
            'min_b0_mT': tk.StringVar(), 'max_ppm': tk.StringVar(), 'max_angle_deg': tk.StringVar(),
            'max_nonlinearity_pct': tk.StringVar(), 'min_gradient_T_m': tk.StringVar(),
        }

        def nmr_row(label, key, values=None):
            row = ttk.Frame(roi_box);
            row.pack(fill='x', pady=1);
            ttk.Label(row, text=label, width=20).pack(side='left')
            w = (ttk.Combobox(row, textvariable=self.nmrvars[key], values=values,
                              state='readonly') if values else ttk.Entry(row, textvariable=self.nmrvars[key]))
            w.pack(side='right', fill='x', expand=True);
            w.bind('<KeyRelease>', lambda e: self.schedule_live_passport())
            if values: w.bind('<<ComboboxSelected>>',
                              lambda e: self.profile_changed() if key == 'profile' else self.schedule_live_passport())

        nmr_row('Профиль', 'profile', tuple(NMR_PROFILES));
        nmr_row('Ядро', 'nucleus', tuple(NUCLEI_GAMMA_HZ_T))
        nmr_row('Частота, МГц', 'frequency');
        nmr_row('Полная RF-полоса, кГц', 'bandwidth')
        ttk.Label(roi_box, text='Центр ROI, мм', foreground='#455a64').pack(anchor='w', pady=(5, 1))
        row = ttk.Frame(roi_box);
        row.pack(fill='x')
        for label, key in [('X', 'cx'), ('Y', 'cy'), ('Z', 'cz')]:
            ttk.Label(row, text=label).pack(side='left');
            e = ttk.Entry(row, textvariable=self.nmrvars[key], width=8);
            e.pack(side='left', padx=(2, 6));
            e.bind('<KeyRelease>', lambda event: self.schedule_live_passport())
        ttk.Label(roi_box, text='Размер ROI, мм', foreground='#455a64').pack(anchor='w', pady=(5, 1))
        row = ttk.Frame(roi_box);
        row.pack(fill='x')
        for label, key in [('X', 'sx'), ('Y', 'sy'), ('Z', 'sz')]:
            ttk.Label(row, text=label).pack(side='left');
            e = ttk.Entry(row, textvariable=self.nmrvars[key], width=8);
            e.pack(side='left', padx=(2, 6));
            e.bind('<KeyRelease>', lambda event: self.schedule_live_passport())
        ttk.Checkbutton(roi_box, text='Поверхностный ROI (образец снаружи системы)',
                        variable=self.nmrvars['surface_mode'], command=self.surface_layout_changed).pack(anchor='w',
                                                                                                         pady=(7, 2))
        row = ttk.Frame(roi_box);
        row.pack(fill='x', pady=2)
        ttk.Label(row, text='Плоскость поверхности').pack(side='left')
        surface_plane = ttk.Combobox(row, textvariable=self.nmrvars['surface_plane'], values=tuple(PLANES),
                                     state='readonly', width=7);
        surface_plane.pack(side='right');
        surface_plane.bind('<<ComboboxSelected>>', lambda e: self.surface_layout_changed())
        row = ttk.Frame(roi_box);
        row.pack(fill='x', pady=2)
        ttk.Label(row, text='Сторона образца').pack(side='left')
        surface_side = ttk.Combobox(row, textvariable=self.nmrvars['surface_side'], values=('+', '-'), state='readonly',
                                    width=7);
        surface_side.pack(side='right');
        surface_side.bind('<<ComboboxSelected>>', lambda e: self.surface_layout_changed())
        row = ttk.Frame(roi_box);
        row.pack(fill='x', pady=2)
        ttk.Label(row, text='Глубина центра, мм').pack(side='left');
        depth_entry = ttk.Entry(row, textvariable=self.nmrvars['surface_depth'], width=9);
        depth_entry.pack(side='right');
        depth_entry.bind('<KeyRelease>', lambda e: self.schedule_live_passport())
        row = ttk.Frame(roi_box);
        row.pack(fill='x', pady=2)
        ttk.Label(row, text='Толщина по нормали, мм').pack(side='left');
        thick_entry = ttk.Entry(row, textvariable=self.nmrvars['surface_thickness'], width=9);
        thick_entry.pack(side='right');
        thick_entry.bind('<KeyRelease>', lambda e: self.schedule_live_passport())
        nmr_row('Сетка на ось 3…11', 'grid')
        ttk.Button(roi_box, text='Выбрать ROI мышью на 2D…', command=self.start_unified_roi_selection).pack(fill='x',
                                                                                                            pady=(6, 2))

        # Use the free lower part of the left column for acceptance limits.
        # This balances the window and leaves the right column for ROI/actions.
        criteria = ttk.LabelFrame(left_panel, text='3. Требования пригодности', padding=6);
        criteria.pack(fill='x', pady=(4, 3))
        for label, key in [('Минимум B0, мТл', 'min_b0_mT'), ('Макс. ΔB, ppm p-p', 'max_ppm'),
                           ('Макс. поворот B0, °', 'max_angle_deg'),
                           ('Макс. нелинейность G, %', 'max_nonlinearity_pct'),
                           ('Минимум |G|, Тл/м', 'min_gradient_T_m')]:
            row = ttk.Frame(criteria);
            row.pack(fill='x', pady=1);
            ttk.Label(row, text=label, width=23).pack(side='left');
            e = ttk.Entry(row, textvariable=self.nmrvars[key], width=11);
            e.pack(side='right');
            e.bind('<KeyRelease>', lambda event: self.schedule_live_passport())
        magnet_help.pack(anchor='w', pady=(5, 2))

        actions = ttk.LabelFrame(panel, text='4. Расчёт и оптимизация', padding=6);
        actions.pack(fill='x', pady=3)
        self.actions_frame = actions
        map_row = ttk.Frame(actions);
        map_row.pack(fill='x', pady=2);
        ttk.Label(map_row, text='Карта поля').pack(side='left')
        map_box = ttk.Combobox(map_row, textvariable=self.nmrvars['map_mode'],
                               values=('|B0|, мТл', 'ΔB, ppm', 'Bx, мТл', 'By, мТл', 'Bz, мТл'), state='readonly',
                               width=16)
        map_box.pack(side='right');
        map_box.bind('<<ComboboxSelected>>', lambda e: self.show_surface_b0_map())
        ttk.Button(actions, text='Показать карту B0 на поверхности', command=self.show_surface_b0_map).pack(fill='x',
                                                                                                            pady=2)
        ttk.Button(actions, text='Пересчитать сейчас', command=lambda: self.live_passport(True),
                   style='Accent.TButton').pack(fill='x', pady=2)
        ttk.Button(actions, text='Найти лучшее место ROI', command=self.unified_find_roi).pack(fill='x', pady=2)
        ttk.Button(actions, text='Максимизировать пригодный объём', command=self.maximize_usable_volume).pack(fill='x',
                                                                                                              pady=2)
        ttk.Button(actions, text='Выровнять B0 / однородность', command=self.optimize_homogeneity).pack(
            fill='x', pady=2)
        self.apply_optimization_button = ttk.Button(actions, text='Применить зелёную геометрию',
                                                    command=self.apply_optimization_preview, state='disabled')
        self.apply_optimization_button.pack(fill='x', pady=2)
        self.actions_note = ttk.Label(
            actions,
            text='Оптимизация сначала показывается зелёным каркасом в 3D и '
                 'не меняет проект без подтверждения.',
            wraplength=315, justify='left', foreground='#555')
        self.actions_note.pack(anchor='w', fill='x', pady=(4, 1))

        # ===== ВИЗУАЛЬНЫЙ ПАСПОРТ ROI (теперь статичный в 4-й панели, без скролла) =====
        result_box = ttk.LabelFrame(far_right, text='Живой паспорт ROI', padding=2)
        result_box.pack(fill='both', expand=True)

        # Выводим карточки прямо в Frame, чтобы всё было видно сразу
        self.visual_panel = ttk.Frame(result_box, padding=3)
        self.visual_panel.pack(fill='both', expand=True)

        self.report = tk.Text(self, height=1, width=1)
        self._last_report_text = ''

        ttk.Button(passport_bar, text='Копировать отчёт', width=18,
                   command=self.copy_roi_report).pack(side='left', padx=(5, 2))
        ttk.Button(passport_bar, text='Сохранить', width=11,
                   command=self._save_visual_report).pack(side='left')

        self.report_menu = tk.Menu(self, tearoff=False)
        self.report_menu.add_command(label='Копировать отчёт',
                                     command=self.copy_roi_report)
        self.report_menu.add_command(label='Сохранить в файл',
                                     command=self._save_visual_report)
        self.profile_changed()

    def geometry_view(self):
        self._map_valid=False
        self.fig2.clear();self.ax2=self.fig2.add_subplot(111);self.axf=self.ax2
        self.draw_2d(True);self.tabs.select(self.v2)

    def property_window(self):
        if not self.magnets:return
        self.load_properties();win=tk.Toplevel(self);win.title('Свойства выбранного магнита');win.transient(self)
        labels={'name':'Имя','x':'X, мм','y':'Y, мм','z':'Z, мм','sx':'Размер X, мм','sy':'Размер Y, мм','sz':'Размер Z, мм','shape':'Форма','grade':'Марка','br_manual':'Br вручную, Тл (0 = по марке)','direction':'M: S → N','axis':'Ось цилиндра'}
        choices={'shape':('box','cylinder','sphere','prism'),'grade':tuple(GRADES),'direction':tuple(DIRS),'axis':('x','y','z')}
        for row,(key,label) in enumerate(labels.items()):
            ttk.Label(win,text=label).grid(row=row,column=0,padx=10,pady=4,sticky='w')
            w=ttk.Combobox(win,textvariable=self.vars[key],values=choices[key],state='readonly') if key in choices else ttk.Entry(win,textvariable=self.vars[key])
            w.grid(row=row,column=1,padx=10,pady=4)
        ttk.Label(win,text='Br — остаточная индукция материала магнита.\nЭто не B0 в образце: B0 рассчитывается по геометрии всей сборки.',foreground='#555',justify='left').grid(row=len(labels),column=0,columnspan=2,padx=10,pady=(5,2),sticky='w')
        ttk.Button(win,text='Применить',command=self.apply_properties).grid(row=len(labels)+1,column=0,columnspan=2,pady=10)

    def on_press(self,event):
        if event.canvas==self.c2 and getattr(self,'_map_valid',False):return
        return super().on_press(event)

    def flip_poles(self):
        if not self.magnets:return
        self.snapshot();m=self.magnets[self.selected];m.direction=('-' if m.direction[0]=='+' else '+')+m.direction[1:];self.refresh(True,False)

    def draw_3d(self,fit=False):
        super().draw_3d(fit)
        self.ax3.mouse_init(rotate_btn=3,pan_btn=2,zoom_btn=[])
        for m in self.magnets:
            if m.shape!='cylinder':continue
            a=AX[m.axis];rad=[i for i in range(3) if i!=a];t=np.linspace(0,2*np.pi,48)
            faces=[]
            for sign in (-1,1):
                p=np.tile(m.center,(len(t),1)).astype(float);p[:,a]+=sign*m.size[a]/2
                p[:,rad[0]]+=m.size[rad[0]]/2*np.cos(t);p[:,rad[1]]+=m.size[rad[1]]/2*np.sin(t);faces.append(p)
            self.ax3.add_collection3d(Poly3DCollection(faces,facecolor='#a9d6f5',edgecolor='#1769aa',alpha=.55))
        self.c3.draw_idle()

    def show_accuracy(self):
        messagebox.showinfo('Расчёт поля','Блоки, круглые цилиндры и сферы: аналитические формулы Magpylib 5.2.1.\nПризмы и эллипсоиды: приближение распределёнными диполями.\n\nЗадано равномерное намагничивание. Типовое Br марки может отличаться от реального. Мягкое железо и взаимное размагничивание не учитываются. Максимум карты относится к её сетке, а не ко всему пространству.')

    def refresh(self,all_views=False,fit=False):
        super().refresh(all_views,fit)
        if hasattr(self,'_map_valid'):
            self._map_valid=False
            self.axf.set_title('Геометрия изменена — пересчитайте карту B0')
            self.cf.draw_idle()

    def on_motion(self,event):
        if not self.drag or event.canvas!=self.drag[3]:return
        x0,y0,c0,_=self.drag;a,b,_=PLANES[self.plane.get()];indices=[AX[a],AX[b]]
        if event.canvas==self.c2:
            inv=self.ax2.transData.inverted();delta=inv.transform((event.x,event.y))-inv.transform((x0,y0))
        else:
            def project(p):
                x,y,_=proj3d.proj_transform(*p,self.ax3.get_proj());return self.ax3.transData.transform((x,y))
            base=project(c0);cols=[]
            for i in indices:
                p=np.array(c0,float);p[i]+=1;cols.append(project(p)-base)
            mat=np.column_stack(cols)
            if np.linalg.cond(mat)>100:
                self.status.set('Плоскость видна с ребра: поверните камеру или выберите другую плоскость');return
            delta=np.linalg.solve(mat,np.array([event.x-x0,event.y-y0]))
        c=np.array(c0,float)
        for i,d in zip(indices,delta):c[i]+=d
        try:step=float(self.step.get());assert step>0
        except Exception:return
        if self.snap.get():c[indices]=np.round(c[indices]/step)*step
        self.magnets[self.selected].center=c.tolist();self.load_properties();self.draw_2d();self.draw_3d()
        self._map_valid=False

    def on_release(self,event):
        moved=bool(self.drag);super().on_release(event)
        if moved:self.refresh(True,False)

    def on_wheel(self,event):
        if event.canvas!=self.c3:return super().on_wheel(event)
        lo,hi=self.fixed_limits;centre=(lo+hi)/2;radius=(hi-lo)/2*(.82 if event.button=='up' else 1.22)
        self.fixed_limits=(centre-radius,centre+radius);self.draw_3d()

    def draw_2d(self,fit=False):
        if len(self.fig2.axes)>1:
            self.fig2.clear();self.ax2=self.fig2.add_subplot(111);self.axf=self.ax2;self._map_valid=False;fit=True
        super().draw_2d(fit)
        # A cylindrical side projection is rectangular, only its axial view is circular.
        a,b,f=PLANES[self.plane.get()]
        for patch in list(self.ax2.patches):
            gid=patch.get_gid()
            if gid is None:continue
            m=self.magnets[int(gid)]
            if m.shape=='cylinder' and m.axis!=f:
                patch.remove();u,v=np.array(m.center)[[AX[a],AX[b]]];w,h=np.array(m.size)[[AX[a],AX[b]]]
                rect=Rectangle((u-w/2,v-h/2),w,h,facecolor=patch.get_facecolor(),edgecolor=patch.get_edgecolor(),linewidth=patch.get_linewidth(),zorder=1)
                rect.set_gid(gid);self.ax2.add_patch(rect)
        self.c2.draw_idle()

    def _inside(self,points):
        mask=np.zeros(len(points),bool)
        for m in self.magnets:
            q=points-np.asarray(m.center);s=np.asarray(m.size)/2
            inside=np.all(abs(q)<=s+1e-7,axis=1)
            if m.shape=='cylinder':
                r=[i for i in range(3) if i!=AX[m.axis]]
                inside &= np.sum((q[:,r]/s[r])**2,axis=1)<=1.00001
            elif m.shape=='sphere':inside=np.sum((q/s)**2,axis=1)<=1.00001
            elif m.shape=='prism' and m.polygon:inside &= _inside_polygon(q[:,[AX[k] for k in PLANES[m.contour_plane][:2]]],m.polygon)
            mask |= inside
        return mask

    def run_analysis(self):
        if not self.magnets:return
        try:
            values={k:float(v.get().replace(',','.')) for k,v in self.fieldvars.items()}
            if not all(np.isfinite(list(values.values()))) or values['frequency']<=0 or values['bandwidth']<=0:raise ValueError('Введите конечные числа и положительную частоту/полосу.')
            self.status.set('Расчёт карты B0…');self.update_idletasks()
            a,b,f=PLANES[self.plane.get()];ia,ib,ic=AX[a],AX[b],AX[f]
            lo,hi=scene_bounds(self.magnets);us=np.linspace(lo[ia],hi[ia],101);vs=np.linspace(lo[ib],hi[ib],101)
            U,V=np.meshgrid(us,vs);pts=np.zeros((U.size,3));pts[:,ia]=U.ravel();pts[:,ib]=V.ravel();pts[:,ic]=values['offset']
            B=field_B(self.magnets,pts);mag=np.linalg.norm(B,axis=1)*1000;mask=self._inside(pts);mag[mask]=np.nan
            if not np.any(np.isfinite(mag)):raise ValueError('Всё сечение внутри магнитов: измените смещение.')
            self.figf.clear();self.axf=self.figf.add_subplot(111);self.ax2=self.axf;ax=self.axf
            vmax=np.nanpercentile(mag,98);im=ax.pcolormesh(U,V,mag.reshape(U.shape),shading='auto',cmap='viridis',vmin=0,vmax=max(vmax,.001))
            self.figf.colorbar(im,ax=ax,label='|B0|, мТл (цвет до 98-го процентиля)')
            bu=B[:,ia].copy();bv=B[:,ib].copy();bu[mask]=np.nan;bv[mask]=np.nan
            ax.streamplot(us,vs,bu.reshape(U.shape),bv.reshape(U.shape),density=1.05,color='#eeeeee',linewidth=.65,arrowsize=.8)
            resonance=values['frequency']*1e6/GAMMA_HZ_T*1000
            if np.nanmin(mag)<resonance<np.nanmax(mag):
                cs=ax.contour(U,V,mag.reshape(U.shape),levels=[resonance],colors=['#ff6f00'],linewidths=2)
                ax.clabel(cs,fmt=f'{values["frequency"]:g} MHz')
            k=np.nanargmax(mag);ax.plot(pts[k,ia],pts[k,ib],'r*',ms=12,label='Максимум на сетке сечения');ax.legend(fontsize=8)
            ax.set(xlabel=f'{a.upper()}, мм',ylabel=f'{b.upper()}, мм',title=f'Поле {self.plane.get()}, {f.upper()}={values["offset"]:g} мм');ax.set_aspect('equal')
            point=np.array([values['px'],values['py'],values['pz']]);bp=field_B(self.magnets,[point])[0];norm=np.linalg.norm(bp)
            point_inside=bool(self._inside([point])[0])
            eps=.05;gradient=[]
            for i in range(3):
                d=np.eye(3)[i]*eps;gradient.append((np.linalg.norm(field_B(self.magnets,[point+d])[0])-np.linalg.norm(field_B(self.magnets,[point-d])[0]))/(2*eps*.001))
            approx=any(analytic_source(m) is None for m in self.magnets)
            point_warning=('\n\n⚠ ТОЧКА НАХОДИТСЯ ВНУТРИ МАГНИТА. Это поле нельзя использовать как характеристику рабочего объёма образца.' if point_inside else '')
            txt=f'{"Смешанная модель: есть приближённые формы" if approx else "Аналитическая модель Magpylib"}{point_warning}\n\nТочка XYZ: {point} мм\nBx / By / Bz: {bp[0]*1000:.3f} / {bp[1]*1000:.3f} / {bp[2]*1000:.3f} мТл\n|B0|: {norm*1000:.4f} мТл\nf протонов: {norm*GAMMA_HZ_T/1e6:.6f} МГц\nГрадиент |B|: {np.linalg.norm(gradient):.3f} Тл/м\n\nМаксимум сетки: {mag[k]:.3f} мТл\nXYZ: {np.round(pts[k],2)} мм\n\nОранжевая линия: резонанс {resonance:.2f} мТл.\nПолная RF-полоса ΔB: {values["bandwidth"]*1e6/GAMMA_HZ_T:.3f} мТл.\n\nЛинии показывают проекцию B на сечение. Области внутри магнитов скрыты. Клик по карте измеряет поле в точке.\n\nЗадано равномерное намагничивание; ярмо и взаимное размагничивание не учтены.'
            self.report.config(state='normal');self.report.delete('1.0','end');self.report.insert('1.0',txt);self.report.config(state='disabled')
            self._map_plane=(ia,ib,ic,values['offset']);self._map_valid=True;self.tabs.select(self.vf);self.cf.draw_idle();self.status.set('Карта рассчитана. Изменение геометрии требует пересчёта.')
        except Exception as e:messagebox.showerror('Расчёт поля',str(e));self.status.set('Проверьте параметры поля или размеры цилиндра')

    def probe_map(self,event):
        if not self._map_valid or event.inaxes!=self.axf or event.xdata is None:return
        ia,ib,ic,offset=self._map_plane;p=np.zeros(3);p[ia]=event.xdata;p[ib]=event.ydata;p[ic]=offset
        for key,val in zip(('px','py','pz'),p):self.fieldvars[key].set(f'{val:.3f}')
        self.run_analysis()

    def show_help(self):
        messagebox.showinfo('Управление','Добавьте магнит или стартовую пару цилиндров.\nЛКМ по магниту — выбор и движение в рабочей плоскости.\nПКМ в 3D — вращение камеры. Колесо — масштаб.\nСтрелки — шаг по плоскости.\nN ↔ S — смена полюсов.\nКонтур в XZ: точки мышью, Enter — завершить.\nПоле и ЯМР: карта выбранного сечения, клик — измерение в точке.')

class NMRPassportDialog(tk.Toplevel):
    """Finite-ROI suitability report for the current magnetic assembly."""
    def __init__(self, app):
        super().__init__(app)
        self.app = app
        self.title("Паспорт пригодности для ЯМР")
        self.geometry("1120x900")
        self.minsize(930, 680)
        self.transient(app)
        self.vars = {
            "mode": tk.StringVar(value="Мышца L5-S1 / T2 CPMG"),
            "nucleus": tk.StringVar(value="1H (протон)"),
            "construction_plane": tk.StringVar(value=app.plane.get()),
            "extrusion": tk.StringVar(value="1.5"),
            "lock_plane": tk.BooleanVar(value=True),
            "cx": tk.StringVar(value=app.fieldvars["px"].get()),
            "cy": tk.StringVar(value=app.fieldvars["py"].get()),
            "cz": tk.StringVar(value=app.fieldvars["pz"].get()),
            "sx": tk.StringVar(value="10"), "sy": tk.StringVar(value="10"),
            "sz": tk.StringVar(value="5"), "grid": tk.StringVar(value="7"),
            "frequency": tk.StringVar(value=app.fieldvars["frequency"].get()),
            "bandwidth": tk.StringVar(value=app.fieldvars["bandwidth"].get()),
            "min_b0_mT": tk.StringVar(), "max_ppm": tk.StringVar(),
            "max_angle_deg": tk.StringVar(), "max_nonlinearity_pct": tk.StringVar(),
            "min_gradient_T_m": tk.StringVar(),
        }
        self._previous_plane=app.plane.get()
        self._last_text = ""
        self.geometry_recommendation = None
        self.geometry_preview_window = None
        self._build()
        self.apply_profile()

    def _build(self):
        left = ttk.Frame(self, padding=12, width=330); left.pack(side="left", fill="y")
        right = ttk.Frame(self, padding=(0,12,12,12)); right.pack(side="left", fill="both", expand=True)
        ttk.Label(left, text="Эксперимент и ядро", style="Section.TLabel").pack(anchor="w", pady=(0,5))
        mode = ttk.Combobox(left, textvariable=self.vars["mode"], values=list(NMR_PROFILES), state="readonly", width=32)
        mode.pack(fill="x", pady=3); mode.bind("<<ComboboxSelected>>", lambda e:self.apply_profile())
        ttk.Combobox(left, textvariable=self.vars["nucleus"], values=list(NUCLEI_GAMMA_HZ_T), state="readonly", width=32).pack(fill="x", pady=3)

        def row(label, key):
            frame=ttk.Frame(left);frame.pack(fill="x",pady=2)
            ttk.Label(frame,text=label).pack(side="left")
            ttk.Entry(frame,textvariable=self.vars[key],width=12).pack(side="right")
        ttk.Label(left,text="Рабочий объём ROI",style="Section.TLabel").pack(anchor="w",pady=(12,4))
        plane_row=ttk.Frame(left);plane_row.pack(fill='x',pady=2)
        ttk.Label(plane_row,text='Плоскость построения').pack(side='left')
        plane_box=ttk.Combobox(plane_row,textvariable=self.vars['construction_plane'],values=list(PLANES),state='readonly',width=8)
        plane_box.pack(side='right');plane_box.bind('<<ComboboxSelected>>',self.on_construction_plane_changed)
        row("Толщина выдавливания, мм","extrusion")
        ttk.Checkbutton(left,text='Автопоиск только в этой плоскости',variable=self.vars['lock_plane']).pack(anchor='w',pady=2)
        for label,key in [("Центр X, мм","cx"),("Центр Y, мм","cy"),("Центр Z, мм","cz"),
                          ("Размер X, мм","sx"),("Размер Y, мм","sy"),("Размер Z, мм","sz"),
                          ("Сетка на ось 3…15","grid")]: row(label,key)
        ttk.Button(left,text="Построить 2D ROI и выдавить…",command=self.start_mouse_selection).pack(fill="x",pady=(6,2))
        ttk.Label(left,text="RF-система",style="Section.TLabel").pack(anchor="w",pady=(12,4))
        row("Частота настройки, МГц","frequency");row("Полная RF-полоса, кГц","bandwidth")
        ttk.Label(left,text="Критерии допуска",style="Section.TLabel").pack(anchor="w",pady=(12,4))
        for label,key in [("Минимум B0, мТл","min_b0_mT"),("Макс. ΔB, ppm p-p","max_ppm"),
                          ("Макс. поворот B0, °","max_angle_deg"),("Макс. нелинейность G, %","max_nonlinearity_pct"),
                          ("Минимум |G|, Тл/м","min_gradient_T_m")]: row(label,key)
        ttk.Button(left,text="Восстановить пороги профиля",command=self.apply_profile).pack(fill="x",pady=(8,2))
        ttk.Button(left,text="АВТО: найти лучшее место образца",command=self.find_best_location,style="Accent.TButton").pack(fill="x",pady=(10,3))
        ttk.Button(left,text="АВТО: предложить размеры магнитов",command=self.recommend_dimensions).pack(fill="x",pady=3)
        self.preview_geometry_button=ttk.Button(left,text="Показать рекомендацию в 3D",command=self.show_geometry_recommendation_3d,state="disabled")
        self.preview_geometry_button.pack(fill="x",pady=3)
        self.apply_geometry_button=ttk.Button(left,text="Применить предложенные размеры",command=self.apply_recommended_dimensions,state="disabled")
        self.apply_geometry_button.pack(fill="x",pady=3)
        ttk.Button(left,text="Рассчитать паспорт в заданном ROI",command=self.calculate).pack(fill="x",pady=3)
        ttk.Button(left,text="Закрыть окно и показать ROI в 3D",command=self.show_3d).pack(fill="x",pady=3)
        ttk.Button(left,text="Сохранить отчёт…",command=self.save_report).pack(fill="x",pady=3)
        ttk.Label(left,text="ROI — реальный объём образца, а не одна точка.\nПороги являются начальными и должны быть\nзаменены требованиями вашей методики.",foreground="#555",justify="left").pack(anchor="w",pady=10)
        self.report = tk.Text(right, wrap="word", font=("Consolas",10), padx=12, pady=10)
        scroll=ttk.Scrollbar(right,orient="vertical",command=self.report.yview);self.report.configure(yscrollcommand=scroll.set)
        scroll.pack(side="right",fill="y");self.report.pack(side="left",fill="both",expand=True)
        self.report.insert("1.0","Задайте размеры образца и нажмите «АВТО: найти лучшее место образца». Программа проверит свободный 3D-объём, поставит ROI в лучшую найденную точку и выдаст предварительное ДА/НЕТ.\n\nДля NMR-MOUSE оценивается пригодность постоянного градиента; для МРТ и спектроскопии — однородность B0.")
        self.report.config(state="disabled")

    def apply_profile(self):
        mode=self.vars["mode"].get();profile=NMR_PROFILES[mode]
        for key,value in profile.items():self.vars[key].set(f"{value:g}")
        if mode=='Мышца L5-S1 / T2 CPMG':
            self.vars['frequency'].set('8.38');self.vars['bandwidth'].set('43')
            self.vars['grid'].set('9');self.vars['extrusion'].set('1.5')
            # 67.5 mm^3 sweet spot with 1.5 mm thickness corresponds to an
            # equivalent lateral square of about 6.7 x 6.7 mm.
            plane=self.vars['construction_plane'].get();third=AX[PLANES[plane][2]]
            sizes=np.array([6.7,6.7,6.7]);sizes[third]=1.5
            for key,value in zip(('sx','sy','sz'),sizes):self.vars[key].set(f'{value:g}')

    def on_construction_plane_changed(self,event=None):
        new_plane=self.vars['construction_plane'].get();old_plane=self._previous_plane
        try:
            sizes=np.array([float(self.vars[k].get().replace(',','.')) for k in ('sx','sy','sz')])
            extrusion=float(self.vars['extrusion'].get().replace(',','.'))
            old_third=AX[PLANES[old_plane][2]];new_third=AX[PLANES[new_plane][2]]
            lateral=max(float(np.max(sizes)),extrusion,1.0)
            if old_third!=new_third:sizes[old_third]=lateral
            sizes[new_third]=extrusion
            for key,value in zip(('sx','sy','sz'),sizes):self.vars[key].set(f'{value:g}')
        except ValueError:
            pass
        self._previous_plane=new_plane

    def start_mouse_selection(self):
        plane=self.vars['construction_plane'].get();third_axis=PLANES[plane][2];third_index=AX[third_axis]
        centre_keys=('cx','cy','cz');size_keys=('sx','sy','sz')
        try:initial_offset=float(self.vars[centre_keys[third_index]].get().replace(',','.'))
        except ValueError:initial_offset=0.0
        offset=simpledialog.askfloat(f'Плоскость {plane}',
            f'На какой координате {third_axis.upper()}, мм, построить плоскость {plane}?',
            initialvalue=initial_offset,parent=self)
        if offset is None:return
        try:initial_extrusion=float(self.vars['extrusion'].get().replace(',','.'))
        except ValueError:initial_extrusion=1.5
        extrusion=simpledialog.askfloat('Выдавливание ROI',
            f'Толщина выдавливания вдоль {third_axis.upper()}, мм:',
            initialvalue=initial_extrusion,minvalue=1e-4,parent=self)
        if extrusion is None:return
        self.vars['extrusion'].set(f'{extrusion:g}')
        self.vars[centre_keys[third_index]].set(f'{offset:g}')
        self.vars[size_keys[third_index]].set(f'{extrusion:g}')
        self.app.plane.set(plane);self.app.fieldvars['offset'].set(f'{offset:g}')
        self.app.refresh(True,True)
        self.app.begin_roi_selection(self)
        self.withdraw()

    def show_3d(self):
        self.withdraw()
        self.app.tabs.select(self.app.v3)
        self.app.draw_3d()
        self.app.status.set("3D-карта ROI: цвет показывает B0, звезда — максимум, ромб — минимум")

    def _number(self,key,positive=False):
        value=float(self.vars[key].get().replace(",","."))
        if not np.isfinite(value) or (positive and value<=0):
            raise ValueError(f"Некорректное значение: {key}")
        return value

    def _roi_size(self):
        size=np.array([self._number(k,True) for k in ('sx','sy','sz')])
        third=AX[PLANES[self.vars['construction_plane'].get()][2]]
        size[third]=self._number('extrusion',True)
        for key,value in zip(('sx','sy','sz'),size):self.vars[key].set(f'{value:g}')
        return size

    def calculate(self):
        try:
            centre=[self._number(k) for k in ("cx","cy","cz")]
            size=self._roi_size()
            grid=int(self._number("grid",True))
            limits={key:self._number(key) for key in ("min_b0_mT","max_ppm","max_angle_deg","max_nonlinearity_pct","min_gradient_T_m")}
            if min(limits.values())<0:raise ValueError("Пороговые значения не могут быть отрицательными.")
            self.app.status.set("Расчёт паспорта ЯМР во всём ROI…");self.app.update_idletasks()
            metrics=nmr_roi_metrics(self.app.magnets,centre,size,self.vars["nucleus"].get(),grid)
            text,decision=build_nmr_report(metrics,self.vars["mode"].get(),self._number("frequency",True),self._number("bandwidth",True),limits)
            self._last_text=text;self.app.last_nmr_report={"text":text,"metrics":metrics,"decision":decision}
            self.app.set_nmr_roi_visualization(metrics,decision)
            self.report.config(state="normal");self.report.delete("1.0","end");self.report.insert("1.0",text);self.report.config(state="disabled")
            self.app.status.set("Паспорт ЯМР рассчитан: "+("условно подходит" if decision["suitable"] else "есть несоответствия"))
        except Exception as e:
            messagebox.showerror("Паспорт ЯМР",str(e),parent=self);self.app.status.set("Не удалось рассчитать паспорт ЯМР")

    def find_best_location(self):
        try:
            size=self._roi_size()
            limits={key:self._number(key) for key in ('min_b0_mT','max_ppm','max_angle_deg','max_nonlinearity_pct','min_gradient_T_m')}
            if min(limits.values())<0:raise ValueError('Пороговые значения не могут быть отрицательными.')
            frequency=self._number('frequency',True);bandwidth=self._number('bandwidth',True)
            fixed_axis=fixed_coordinate=None;search_scope='по всему свободному объёму XYZ'
            if self.vars['lock_plane'].get():
                plane=self.vars['construction_plane'].get();third=PLANES[plane][2];fixed_axis=AX[third]
                fixed_coordinate=self._number(('cx','cy','cz')[fixed_axis])
                search_scope=f'в плоскости {plane} при {third.upper()}={fixed_coordinate:g} мм с заданным выдавливанием'
            def progress(done,total):
                self.app.status.set(f'Автопоиск ROI: проверено {done} из {total} основных кандидатов…')
                self.app.update_idletasks()
            result=find_best_nmr_roi(self.app.magnets,size,self.vars['nucleus'].get(),
                                     self.vars['mode'].get(),frequency,bandwidth,limits,progress,
                                     fixed_axis=fixed_axis,fixed_coordinate=fixed_coordinate)
            metrics=result['metrics']
            for key,value in zip(('cx','cy','cz'),metrics['centre_mm']):self.vars[key].set(f'{value:.5g}')
            for key,value in zip(('px','py','pz'),metrics['centre_mm']):self.app.fieldvars[key].set(f'{value:.5g}')
            report,decision=build_nmr_report(metrics,self.vars['mode'].get(),frequency,bandwidth,limits)
            verdict=('ДА — НАЙДЕНО ПОДХОДЯЩЕЕ МЕСТО ПО ЗАДАННЫМ КРИТЕРИЯМ' if decision['suitable']
                     else 'НЕТ — В ИССЛЕДОВАННОЙ ОБЛАСТИ КРИТЕРИИ НЕ ВЫПОЛНЕНЫ')
            alt_lines=[]
            for i,item in enumerate(result['alternatives'],1):
                alt_lines.append(f"{i}. XYZ={np.round(item['centre_mm'],2)} мм • B0={item['b_mT']:.3f} мТл • f={item['f_MHz']:.5f} МГц")
            header=(f'АВТОМАТИЧЕСКИЙ ПОИСК ЛУЧШЕГО ПОЛОЖЕНИЯ\n{verdict}\n\n'
                    f"Рекомендуемый центр образца: X={metrics['centre_mm'][0]:.3f}, Y={metrics['centre_mm'][1]:.3f}, Z={metrics['centre_mm'][2]:.3f} мм\n"
                    f"Размер образца ROI: {np.round(metrics['size_mm'],3)} мм\n"
                    f"Оценка кандидата: {result['score']:.3f}; невыполненных групп требований: {result['failed']}\n"
                    f"Область автопоиска: {search_scope}.\n"
                    'Приоритет поиска: полный ROI вне магнитов → заданная частота/RF-полоса → качество поля и градиента → направление B0.\n'
                    'Важно: этот автопоиск перемещает только ROI и не меняет геометрию магнитов. Если все кандидаты плохие, требуется перестройка магнитной системы.\n'
                    'Поиск выполнен только в показанном свободном объёме модели.\n\n'
                    'ЛУЧШИЕ КАНДИДАТЫ\n'+'\n'.join(alt_lines)+'\n\n')
            text=header+report
            self._last_text=text;self.app.last_nmr_report={'text':text,'metrics':metrics,'decision':decision,'search':result}
            self.app.set_nmr_roi_visualization(metrics,decision)
            self.report.config(state='normal');self.report.delete('1.0','end');self.report.insert('1.0',text);self.report.config(state='disabled')
            self.app.status.set('Автопоиск завершён: '+('система условно подходит' if decision['suitable'] else 'подходящего ROI по текущим требованиям нет'))
        except Exception as e:
            messagebox.showerror('Автопоиск ROI',str(e),parent=self);self.app.status.set('Автопоиск ROI не завершён')

    def recommend_dimensions(self):
        """Search bounded size/spacing variants and present them without modifying the assembly."""
        try:
            size=self._roi_size()
            limits={key:self._number(key) for key in ('min_b0_mT','max_ppm','max_angle_deg','max_nonlinearity_pct','min_gradient_T_m')}
            if min(limits.values())<0:raise ValueError('Пороговые значения не могут быть отрицательными.')
            frequency=self._number('frequency',True);bandwidth=self._number('bandwidth',True)
            fixed_axis=fixed_coordinate=None;search_scope='во всём свободном объёме XYZ'
            if self.vars['lock_plane'].get():
                plane=self.vars['construction_plane'].get();third=PLANES[plane][2];fixed_axis=AX[third]
                fixed_coordinate=self._number(('cx','cy','cz')[fixed_axis])
                search_scope=f'в плоскости {plane} при {third.upper()}={fixed_coordinate:g} мм'
            def progress(done,total):
                self.app.status.set(f'Подбор размеров магнитов: проверено {done} из {total} вариантов…')
                self.app.update_idletasks()
            result=recommend_magnet_dimensions(self.app.magnets,size,self.vars['nucleus'].get(),
                                               self.vars['mode'].get(),frequency,bandwidth,limits,
                                               fixed_axis=fixed_axis,fixed_coordinate=fixed_coordinate,
                                               progress=progress)
            metrics=result['search']['metrics']
            passport,decision=build_nmr_report(metrics,self.vars['mode'].get(),frequency,bandwidth,limits)
            current=self.app.magnets;proposed=result['magnets'];changes=[]
            for old,new in zip(current,proposed):
                changes.append(
                    f"• {old.name}: размер {np.round(old.size,2)} → {np.round(new.size,2)} мм; "
                    f"центр {np.round(old.center,2)} → {np.round(new.center,2)} мм")
            spacing=''
            if len(current)==2:
                old_distance=np.linalg.norm(np.asarray(current[1].center)-np.asarray(current[0].center))
                new_distance=np.linalg.norm(np.asarray(proposed[1].center)-np.asarray(proposed[0].center))
                spacing=f'Расстояние между центрами: {old_distance:.2f} → {new_distance:.2f} мм\n'
            verdict=('ПРОГНОЗ: ПОДХОДИТ ПО ЗАДАННЫМ КРИТЕРИЯМ' if decision['suitable']
                     else 'ПРОГНОЗ: ПОЛНОГО СООТВЕТСТВИЯ ПОКА НЕТ')
            scale_text=(f"Масштаб диаметра: ×{result['radial_scale']:.2f}; толщины: ×{result['thickness_scale']:.2f}; "
                        f"расстояния между центрами: ×{result['spacing_scale']:.2f}."
                        if result['two_cylinders'] else
                        f"Масштаб размеров: ×{result['radial_scale']:.2f}; разнос центров: ×{result['spacing_scale']:.2f}.")
            header=(f'РЕКОМЕНДАЦИЯ ПО РАЗМЕРАМ МАГНИТНОЙ СИСТЕМЫ\n{verdict}\n\n'
                    f'{scale_text}\n{spacing}'+'\n'.join(changes)+'\n\n'
                    f"Прогнозируемый центр ROI: {np.round(metrics['centre_mm'],3)} мм\n"
                    f"Размер ROI: {np.round(metrics['size_mm'],3)} мм\n"
                    f"Область поиска ROI: {search_scope}.\n"
                    'Br, направление полюсов и формы магнитов не изменялись.\n\n'
                    'Изменения ещё НЕ применены. Проверьте размеры ниже и нажмите «Применить предложенные размеры», если хотите изменить сборку.\n'
                    'Это ограниченный параметрический поиск, а не полный инженерный синтез. Если прогноз всё ещё отрицательный, требуется другая топология, ярмо или отдельная оптимизация полюсных наконечников.\n\n')
            text=header+passport
            self.geometry_recommendation=result
            self.preview_geometry_button.config(state='normal')
            self.apply_geometry_button.config(state='normal')
            self._last_text=text
            self.app.last_nmr_report={'text':text,'metrics':metrics,'decision':decision,'geometry_recommendation':result}
            self.report.config(state='normal');self.report.delete('1.0','end');self.report.insert('1.0',text);self.report.config(state='disabled')
            self.app.status.set('Рекомендация размеров рассчитана: '+('найден проходящий вариант' if decision['suitable'] else 'найден лучший вариант, но нужен более глубокий редизайн'))
            self.show_geometry_recommendation_3d()
        except Exception as e:
            messagebox.showerror('Подбор размеров магнитов',str(e),parent=self);self.app.status.set('Подбор размеров магнитов не завершён')

    def show_geometry_recommendation_3d(self):
        """Open a non-destructive 3D comparison of current and proposed geometry."""
        result=self.geometry_recommendation
        if not result:return
        if self.geometry_preview_window is not None and self.geometry_preview_window.winfo_exists():
            self.geometry_preview_window.destroy()
        win=tk.Toplevel(self);self.geometry_preview_window=win
        win.title('3D — текущая и рекомендуемая магнитная система');win.geometry('920x760');win.transient(self)
        ttk.Label(win,text='Синее заполнение — текущая сборка   •   зелёный каркас — рекомендуемые размеры   •   оранжевый объём — ROI',
                  justify='center').pack(fill='x',padx=8,pady=(8,2))
        fig=Figure(figsize=(8.5,6.6));ax=fig.add_subplot(111,projection='3d')
        canvas=FigureCanvasTkAgg(fig,master=win);canvas.get_tk_widget().pack(fill='both',expand=True)
        toolbar=NavigationToolbar2Tk(canvas,win);toolbar.update()
        for m in self.app.magnets:self.app._box3d(ax,m,-100)

        def wire_box(lo,hi,colour='#00a65a',lw=2.1):
            corners=np.array([[x,y,z] for x in (lo[0],hi[0]) for y in (lo[1],hi[1]) for z in (lo[2],hi[2])])
            for i in range(len(corners)):
                for j in range(i+1,len(corners)):
                    if np.count_nonzero(abs(corners[i]-corners[j])>1e-9)==1:
                        ax.plot(*np.vstack([corners[i],corners[j]]).T,color=colour,linewidth=lw,alpha=.95)

        for m in result['magnets']:
            c=np.asarray(m.center,float);s=np.asarray(m.size,float)
            if m.shape=='cylinder':
                a=AX[m.axis];rad=[k for k in range(3) if k!=a];t=np.linspace(0,2*np.pi,56)
                for sign in (-1,1):
                    ring=np.tile(c,(len(t),1));ring[:,a]+=sign*s[a]/2
                    ring[:,rad[0]]+=s[rad[0]]/2*np.cos(t);ring[:,rad[1]]+=s[rad[1]]/2*np.sin(t)
                    ax.plot(*ring.T,color='#00a65a',linewidth=2.2)
                for angle in np.linspace(0,2*np.pi,12,endpoint=False):
                    line=np.tile(c,(2,1));line[:,a]+=np.array([-1,1])*s[a]/2
                    line[:,rad[0]]+=s[rad[0]]/2*np.cos(angle);line[:,rad[1]]+=s[rad[1]]/2*np.sin(angle)
                    ax.plot(*line.T,color='#00a65a',linewidth=.9,alpha=.8)
            elif m.shape=='sphere':
                u=np.linspace(0,2*np.pi,30);v=np.linspace(0,np.pi,16)
                x=c[0]+s[0]/2*np.outer(np.cos(u),np.sin(v));y=c[1]+s[1]/2*np.outer(np.sin(u),np.sin(v));z=c[2]+s[2]/2*np.outer(np.ones_like(u),np.cos(v))
                ax.plot_wireframe(x,y,z,color='#00a65a',rstride=3,cstride=3,linewidth=.7,alpha=.85)
            else:
                wire_box(c-s/2,c+s/2)
            ax.text(*c,f'  НОВЫЙ: {m.name}',color='#00783e',fontsize=8,fontweight='bold')
        metrics=result['search']['metrics'];roi_c=np.asarray(metrics['centre_mm']);roi_s=np.asarray(metrics['size_mm'])
        wire_box(roi_c-roi_s/2,roi_c+roi_s/2,colour='#ff8f00',lw=2.4);ax.scatter(*roi_c,marker='x',s=80,color='#ff8f00')
        all_lo=[];all_hi=[]
        for m in list(self.app.magnets)+list(result['magnets']):
            lo,hi=magnet_bounds(m);all_lo.append(lo);all_hi.append(hi)
        all_lo.append(roi_c-roi_s/2);all_hi.append(roi_c+roi_s/2)
        lo=np.min(all_lo,axis=0);hi=np.max(all_hi,axis=0);margin=np.maximum((hi-lo)*.12,3)
        lo-=margin;hi+=margin;ax.set_xlim(lo[0],hi[0]);ax.set_ylim(lo[1],hi[1]);ax.set_zlim(lo[2],hi[2]);ax.set_box_aspect(np.maximum(hi-lo,1))
        ax.set(xlabel='X, мм',ylabel='Y, мм',zlabel='Z, мм');ax.view_init(elev=24,azim=-55)
        ax.set_title('3D-предпросмотр — конструкция ещё не изменена',fontsize=11)
        canvas.draw_idle()

    def apply_recommended_dimensions(self):
        result=self.geometry_recommendation
        if not result:return
        if not messagebox.askokcancel('Применить размеры',
            'Изменить размеры и координаты центров магнитов по рассчитанной рекомендации?\n\nBr, марки, формы и направления полюсов сохранятся. Изменение можно отменить обычной кнопкой отмены.',parent=self):return
        self.app.snapshot()
        self.app.magnets=copy.deepcopy(result['magnets'])
        metrics=result['search']['metrics']
        for key,value in zip(('cx','cy','cz'),metrics['centre_mm']):self.vars[key].set(f'{value:.5g}')
        for key,value in zip(('px','py','pz'),metrics['centre_mm']):self.app.fieldvars[key].set(f'{value:.5g}')
        self.app.refresh(True,True)
        self.geometry_recommendation=None
        self.preview_geometry_button.config(state='disabled');self.apply_geometry_button.config(state='disabled')
        if self.geometry_preview_window is not None and self.geometry_preview_window.winfo_exists():self.geometry_preview_window.destroy()
        self.calculate()
        self.app.status.set('Предложенные размеры применены; паспорт пересчитан для новой сборки')

    def save_report(self):
        if not self._last_text:
            messagebox.showinfo("Сохранение","Сначала рассчитайте паспорт.",parent=self);return
        path=filedialog.asksaveasfilename(parent=self,defaultextension=".txt",filetypes=[("Текстовый отчёт","*.txt"),("Все файлы","*.*")])
        if path:
            Path(path).write_text(self._last_text,encoding="utf-8")
            self.app.status.set(f"Отчёт сохранён: {path}")


class IntegratedApp(MagneticApp):
    SHAPES={'box':'Блок','cylinder':'Цилиндр','sphere':'Эллипсоид / сфера','prism':'Призма по контуру'}

    def __init__(self):
        self.field_cache=None
        self.volume_cache=None
        self.field_colorbar=None
        self.volume_colorbar=None
        self.volume_bounds=None
        self.global_peak_3d=None
        self.last_nmr_report=None
        self.roi_definition=None
        self.roi_metrics_cache=None
        self.roi_select_mode=False
        self.roi_drag_start=None
        self.roi_rect_artist=None
        self.roi_dialog_window=None
        super().__init__()

    def _build_ui(self):
        super()._build_ui()
        report_parent = self.report.master
        pack_options = {'fill': 'x', 'pady': 5}
        if self.report.winfo_manager():
            pack_options['before'] = self.report
        elif hasattr(self, 'actions_frame'):
            report_parent = self.actions_frame
            extra_row = ttk.Frame(report_parent)
            row_pack = {'fill': 'x', 'pady': 1}
            if hasattr(self, 'actions_note') and self.actions_note.winfo_manager():
                row_pack['before'] = self.actions_note
            extra_row.pack(**row_pack)
            ttk.Button(extra_row, text='Полный паспорт…',
                       command=self.nmr_passport).pack(side='left', fill='x', expand=True)
            ttk.Button(extra_row, text='Как читать карту…',
                       command=self.show_nmr_map_guide).pack(side='left', fill='x',
                                                             expand=True, padx=(3, 0))
            return
        elif hasattr(self, 'roi_report_frame'):
            report_parent = self.roi_report_frame
            pack_options = {'fill': 'x', 'pady': 1}
        ttk.Button(report_parent,text='Полный паспорт пригодности…',command=self.nmr_passport).pack(**pack_options)
        guide_pack = {'fill': 'x', 'pady': 2} if self.report.winfo_manager() else {'fill': 'x', 'pady': 1}
        ttk.Button(report_parent,text='Как определить пригодность по карте…',command=self.show_nmr_map_guide).pack(**guide_pack)

    def nmr_passport(self):
        if not self.magnets:
            messagebox.showinfo('Паспорт ЯМР','Сначала добавьте хотя бы один магнит.');return
        NMRPassportDialog(self)

    def show_nmr_map_guide(self):
        messagebox.showinfo('Как читать магнитную карту',
            '1. Рабочий ROI должен полностью находиться вне магнитов и металла.\n\n'
            '2. Среднее B0 задаёт частоту Лармора: для 1H примерно 42.577 МГц/Тл. Максимум возле поверхности магнита не является рабочим полем.\n\n'
            '3. Вся полоса частот ROI должна помещаться в RF-полосу катушки. Если нет — сигнал придёт только от части объёма.\n\n'
            '4. Для NMR-MOUSE нужен устойчивый почти линейный градиент. Толщина слоя примерно Δz = BW/(γ·|G|). Смотрите нелинейность градиента, а не только его величину.\n\n'
            '5. Для МРТ и особенно спектроскопии нужен малый разброс B0 в ppm. Яркие цвета сами по себе ничего не гарантируют: важен одинаковый цвет во всём ROI.\n\n'
            '6. Стрелки B в ROI должны быть почти параллельны. RF-поле B1 катушки должно быть поперечно B0.\n\n'
            '7. Вердикт окончательно подтверждают измеренной 3D-картой B0, RF-катушкой, SNR и FEM-моделью.',parent=self)

    def begin_roi_selection(self,dialog):
        """Let the user drag two opposite ROI corners in the active 2D plane."""
        self.roi_dialog_window=dialog
        self.roi_select_mode=True
        self.roi_drag_start=None
        self.tabs.select(self.v2)
        self.status.set("ROI: зажмите ЛКМ и протяните прямоугольник на 2D; толщина по третьей оси берётся из паспорта")

    def set_nmr_roi_visualization(self,metrics,decision):
        self.roi_metrics_cache={"metrics":metrics,"decision":decision}
        self.roi_definition={"centre":np.asarray(metrics["centre_mm"],float),
                             "size":np.asarray(metrics["size_mm"],float)}
        self.draw_2d()
        self.draw_3d()

    def _finish_roi_selection(self,event):
        start=self.roi_drag_start
        self.roi_drag_start=None
        if start is None or event.xdata is None or event.ydata is None:return
        u0,v0=start;u1,v1=event.xdata,event.ydata
        if abs(u1-u0)<1e-6 or abs(v1-v0)<1e-6:
            self.status.set("ROI не выбран: протяните прямоугольник ненулевого размера")
            return
        dialog=self.roi_dialog_window
        if dialog is None or not dialog.winfo_exists():
            self.roi_select_mode=False;return
        a,b,f=PLANES[self.plane.get()];indices=[AX[a],AX[b],AX[f]]
        centre=np.array([float(dialog.vars[k].get().replace(',','.')) for k in ('cx','cy','cz')])
        size=np.array([float(dialog.vars[k].get().replace(',','.')) for k in ('sx','sy','sz')])
        centre[indices[0]]=(u0+u1)/2;centre[indices[1]]=(v0+v1)/2
        centre[indices[2]]=float(self.fieldvars['offset'].get().replace(',','.'))
        size[indices[0]]=abs(u1-u0);size[indices[1]]=abs(v1-v0)
        for key,value in zip(('cx','cy','cz'),centre):dialog.vars[key].set(f'{value:.4g}')
        for key,value in zip(('sx','sy','sz'),size):dialog.vars[key].set(f'{value:.4g}')
        self.roi_definition={"centre":centre,"size":size};self.roi_metrics_cache=None
        self.roi_select_mode=False
        if self.roi_rect_artist is not None:
            try:self.roi_rect_artist.remove()
            except ValueError:pass
            self.roi_rect_artist=None
        self.draw_2d();self.draw_3d()
        dialog.deiconify();dialog.lift();dialog.focus_force()
        self.status.set(f"ROI выбран: центр {np.round(centre,2)} мм, размер {np.round(size,2)} мм — нажмите «Рассчитать паспорт»")

    def pair_dialog(self):
        if len(self.magnets)<2:
            messagebox.showinfo('Пара магнитов','Добавьте хотя бы два магнита.');return
        return PairDialog(self)

    def populate_tree(self):
        super().populate_tree()
        for iid,m in zip(self.tree.get_children(),self.magnets):
            self.tree.item(iid,values=(self.SHAPES.get(m.shape,m.shape),m.direction))
        self.tree.column('type',width=125)

    def load_properties(self):
        super().load_properties()
        if self.magnets:
            m=self.magnets[self.selected]
            br_source='вручную' if m.remanence_T>0 else m.grade
            self.status.set(f'{m.name} • {self.SHAPES[m.shape]} • Br={m.br:.3f} Тл ({br_source}) • M {m.direction} • размеры {m.size} мм')

    def property_window(self):
        super().property_window()
        for win in self.winfo_children():
            if not isinstance(win,tk.Toplevel) or win.title()!='Свойства выбранного магнита':continue
            ttk.Button(win,text='Редактировать контур…',command=lambda:self.contour_editor(edit_index=self.selected)).grid(row=20,column=0,columnspan=2,pady=6)
            for widget in win.winfo_children():
                if isinstance(widget,ttk.Combobox) and tuple(widget.cget('values'))==('box','cylinder','sphere','prism'):
                    shape_label = tk.StringVar(value=self.SHAPES[self.vars['shape'].get()])
                    widget.configure(textvariable=shape_label, values=list(self.SHAPES.values()), width=24)
                    widget._shape_label = shape_label
                    widget.bind('<<ComboboxSelected>>', self._on_shape_label_selected)

    def _on_shape_label_selected(self, event):
        selected_label = event.widget.get()
        for shape_key, label in self.SHAPES.items():
            if label == selected_label:
                self.vars['shape'].set(shape_key)
                break

    def refresh(self,all_views=False,fit=False):
        self.field_cache=None
        self.volume_cache=None
        self.global_peak_3d=None
        self.roi_metrics_cache=None
        super().refresh(all_views,fit)

    def on_motion(self,event):
        if self.roi_select_mode and self.roi_drag_start is not None and event.canvas==self.c2 and event.inaxes==self.ax2 and event.xdata is not None:
            u0,v0=self.roi_drag_start
            if self.roi_rect_artist is None:
                self.roi_rect_artist=Rectangle((u0,v0),0,0,fill=True,facecolor='#ffb300',alpha=.22,edgecolor='#ff6f00',linewidth=2.2,zorder=20)
                self.ax2.add_patch(self.roi_rect_artist)
            self.roi_rect_artist.set_xy((min(u0,event.xdata),min(v0,event.ydata)))
            self.roi_rect_artist.set_width(abs(event.xdata-u0));self.roi_rect_artist.set_height(abs(event.ydata-v0))
            self.c2.draw_idle();return
        if self.drag:self.field_cache=None;self.volume_cache=None
        super().on_motion(event)

    def _nearest_2d(self,event,canvas3d=False):
        if event.inaxes not in (self.ax2,self.ax3):return None
        if not canvas3d:
            if event.xdata is None:return None
            a,b,_=PLANES[self.plane.get()];ia,ib=AX[a],AX[b]
            from matplotlib.path import Path as ShapePath
            for i in reversed(range(len(self.magnets))):
                m=self.magnets[i];q=np.array([event.xdata-m.center[ia],event.ydata-m.center[ib]]);s=np.array(m.size)[[ia,ib]]/2
                hit=np.all(abs(q)<=s)
                if m.shape=='sphere' or (m.shape=='cylinder' and m.axis==PLANES[self.plane.get()][2]):hit=np.sum((q/s)**2)<=1
                elif m.shape=='prism' and self.plane.get()==m.contour_plane:hit=ShapePath(m.polygon).contains_point(q)
                if hit:return i
            return None
        from scipy.spatial import ConvexHull
        from matplotlib.path import Path as ShapePath
        hits=[]
        for i,m in enumerate(self.magnets):
            lo,hi=magnet_bounds(m)
            corners=np.array(np.meshgrid(*zip(lo,hi))).reshape(3,-1).T
            if m.shape=='cylinder':
                t=np.linspace(0,2*np.pi,36);a=AX[m.axis];rad=[j for j in range(3) if j!=a];rings=[]
                for sign in (-1,1):
                    p=np.tile(m.center,(len(t),1)).astype(float);p[:,a]+=sign*m.size[a]/2;p[:,rad[0]]+=m.size[rad[0]]/2*np.cos(t);p[:,rad[1]]+=m.size[rad[1]]/2*np.sin(t);rings.append(p)
                corners=np.concatenate(rings)
            x,y,z=proj3d.proj_transform(*corners.T,self.ax3.get_proj());screen=self.ax3.transData.transform(np.c_[x,y])
            try:inside=ShapePath(screen[ConvexHull(screen).vertices]).contains_point((event.x,event.y))
            except Exception:inside=False
            if inside:hits.append((float(np.min(z)),i))
        return min(hits)[1] if hits else None

    def on_press(self,event):
        if event.button!=1:return
        if self.roi_select_mode:
            if event.canvas==self.c2 and event.inaxes==self.ax2 and event.xdata is not None:
                self.roi_drag_start=(event.xdata,event.ydata)
                if self.roi_rect_artist is not None:
                    try:self.roi_rect_artist.remove()
                    except ValueError:pass
                self.roi_rect_artist=None
                self.status.set('ROI: тяните до противоположного угла и отпустите ЛКМ')
            return
        if event.dblclick:
            idx=self._nearest_2d(event,event.canvas==self.c3)
            if idx is not None:
                self.drag=None;self.selected=idx;self.populate_tree();self.load_properties();self.draw_2d();self.draw_3d()
            return
        App.on_press(self,event)
        if self.drag:
            self.draw_2d();self.draw_3d()

    def on_release(self,event):
        if self.roi_select_mode:
            if event.canvas==self.c2 and event.inaxes==self.ax2:self._finish_roi_selection(event)
            return
        # A selection click does not invalidate an already calculated field.
        if self.drag:
            changed=not np.allclose(self.drag[2],self.magnets[self.selected].center)
            self.drag=None
            if changed:self.refresh(True,False)

    def geometry_view(self):
        self.field_colorbar=None
        super().geometry_view()
        self.field_colorbar=None

    def run_analysis(self):
        view=self.tabs.select()
        super().run_analysis()
        if not self._map_valid:return
        a,b,f=PLANES[self.plane.get()];ia,ib,ic=AX[a],AX[b],AX[f]
        # Поле рассчитывается во всём объёме вокруг магнитов и ROI; ROI —
        # только рабочее окно оценки, а не граница физической карты.
        scene_lo,scene_hi=scene_bounds(self.magnets)
        if self.roi_definition is not None:
            roi_lo=self.roi_definition['centre']-self.roi_definition['size']/2
            roi_hi=self.roi_definition['centre']+self.roi_definition['size']/2
            scene_lo=np.minimum(scene_lo,roi_lo);scene_hi=np.maximum(scene_hi,roi_hi)
        span=np.maximum(scene_hi-scene_lo,12.0);padding=np.maximum(span*.22,5.0)
        lo,hi=scene_lo-padding,scene_hi+padding
        self.volume_bounds=(lo.copy(),hi.copy())
        us=np.linspace(lo[ia],hi[ia],81);vs=np.linspace(lo[ib],hi[ib],81);u,v=np.meshgrid(us,vs)
        pts=np.zeros((u.size,3));pts[:,ia]=u.ravel();pts[:,ib]=v.ravel();pts[:,ic]=float(self.fieldvars['offset'].get().replace(',','.'))
        B=field_B(self.magnets,pts);mask=self._inside(pts);B[mask]=np.nan
        self.field_cache=(us,vs,pts,B,(ia,ib,ic))
        # An independent Cartesian volume, not a copy of the active 2D slice.
        axes=[np.linspace(lo[k],hi[k],23) for k in range(3)]
        xyz=np.array(np.meshgrid(*axes,indexing='ij')).reshape(3,-1).T
        vectors=field_B(self.magnets,xyz);valid=~self._inside(xyz)&np.all(np.isfinite(vectors),axis=1)
        xyz=xyz[valid];vectors=vectors[valid];strength=np.linalg.norm(vectors,axis=1)*1000
        self.volume_cache=(xyz,vectors,strength)
        if len(strength):
            peak=int(np.argmax(strength));p=xyz[peak]
            self.global_peak_3d={'point':p.copy(),'strength_mT':float(strength[peak]),'vector_T':vectors[peak].copy()}
            # The base calculation reports a maximum of the currently selected
            # 2D plane.  Remove that block: the user-facing maximum must always
            # refer to the full XYZ grid and therefore not depend on XZ/XY/YZ.
            source_lines=self.report.get('1.0','end').splitlines();kept=[];skip_xyz=False
            for line in source_lines:
                if line.startswith('Максимум сетки:') or line.startswith('Максимум сетки 2D-сечения:'):
                    skip_xyz=True;continue
                if skip_xyz and line.startswith('XYZ:'):
                    skip_xyz=False;continue
                skip_xyz=False;kept.append(line)
            old='\n'.join(kept).lstrip()
            self.report.config(state='normal')
            self.report.delete('1.0','end')
            self.report.insert('1.0',f'ГЛОБАЛЬНЫЙ МАКСИМУМ 3D: сетка 23 × 23 × 23\nBmax: {strength[peak]:.3f} мТл\nX={p[0]:.3f}, Y={p[1]:.3f}, Z={p[2]:.3f} мм\nBx / By / Bz: {vectors[peak,0]*1000:.3f} / {vectors[peak,1]*1000:.3f} / {vectors[peak,2]*1000:.3f} мТл\nДиапазоны поиска XYZ: {np.round(lo,2)} … {np.round(hi,2)} мм\nПримечание: глобальный максимум обычно находится у поверхности и не является критерием пригодности ЯМР; проверяйте свободный ROI.\n\n'+old)
            self.report.config(state='disabled')
        self.draw_2d(True);self.draw_3d();self.tabs.select(view)
        self.status.set('2D: полное сечение • 3D: всё расчётное пространство XYZ • двойной щелчок выделяет магнит')

    def draw_2d(self,fit=False):
        if self.field_colorbar is not None:
            try:self.field_colorbar.remove()
            except (KeyError,ValueError,AttributeError):pass
            self.field_colorbar=None
        super().draw_2d(fit)
        if self.field_cache is None:
            self._draw_roi_2d();return
        us,vs,pts,B,(ia,ib,ic)=self.field_cache;shape=(len(vs),len(us));norm=np.linalg.norm(B,axis=1)*1000;finite=np.isfinite(norm)
        if not np.any(finite):
            self._draw_roi_2d();return
        mode_var=getattr(self,'nmrvars',{}).get('map_mode');map_mode=mode_var.get() if mode_var is not None else '|B0|, мТл'
        if map_mode=='ΔB, ppm':
            reference=(self.roi_metrics_cache['metrics']['b_mean_T']*1000 if self.roi_metrics_cache else np.nanmean(norm))
            scalar=(norm-reference)/max(reference,1e-12)*1e6;limit=max(float(np.nanpercentile(abs(scalar),98)),1.0)
            cmap='coolwarm';vmin,vmax=-limit,limit;label='ΔB относительно среднего ROI, ppm';title='Неоднородность ΔB: синий ниже среднего, красный выше'
        elif map_mode in ('Bx, мТл','By, мТл','Bz, мТл'):
            component={'Bx, мТл':0,'By, мТл':1,'Bz, мТл':2}[map_mode];scalar=B[:,component]*1000
            limit=max(float(np.nanpercentile(abs(scalar),98)),.001);cmap='coolwarm';vmin,vmax=-limit,limit;label=map_mode;title=f'Компонента {map_mode}; белые линии — проекция направления B'
        else:
            scalar=norm;cmap='viridis';vmin=max(float(np.nanpercentile(norm,2)),0);vmax=max(float(np.nanpercentile(norm,98)),vmin+.001);label='|B0|, мТл';title='Модуль B0 на плоскости образца; белые линии — направление'
        im=self.ax2.pcolormesh(us,vs,scalar.reshape(shape),cmap=cmap,vmin=vmin,vmax=vmax,shading='auto',zorder=-2)
        self.field_colorbar=self.fig2.colorbar(im,ax=self.ax2,label=label,pad=.025,fraction=.045)
        self.fig2.subplots_adjust(left=.10, right=.88, bottom=.10, top=.90)
        self.ax2.streamplot(us,vs,B[:,ia].reshape(shape),B[:,ib].reshape(shape),color='#ffffff',density=1,linewidth=.65,zorder=0)
        target=float(self.fieldvars['frequency'].get().replace(',','.'))*1e9/GAMMA_HZ_T
        if map_mode=='|B0|, мТл' and np.nanmin(norm)<target<np.nanmax(norm):self.ax2.contour(us,vs,norm.reshape(shape),levels=[target],colors=['#ff8300'],linewidths=1.7,zorder=1)
        if self.global_peak_3d is not None:
            peak_point=self.global_peak_3d['point'];_,_,third=PLANES[self.plane.get()]
            self.ax2.plot(peak_point[ia],peak_point[ib],marker='*',ms=15,color='red',
                          markeredgecolor='white',markeredgewidth=.8,zorder=22,label='проекция MAX 3D')
            self.ax2.annotate(f"MAX 3D {self.global_peak_3d['strength_mT']:.3f} мТл\n{third.upper()}={peak_point[ic]:.2f} мм",
                              (peak_point[ia],peak_point[ib]),xytext=(8,8),textcoords='offset points',
                              fontsize=8,color='red',zorder=23)
        self.ax2.set_title(title,fontsize=9)
        xmid=(float(us[0])+float(us[-1]))/2;ymid=(float(vs[0])+float(vs[-1]))/2
        half=max(float(us[-1]-us[0]),float(vs[-1]-vs[0]))/2
        half=max(half,1.0)
        self.ax2.set_xlim(xmid-half,xmid+half);self.ax2.set_ylim(ymid-half,ymid+half)
        self._draw_roi_2d()
        self.c2.draw_idle()

    def _draw_roi_2d(self):
        if self.roi_definition is None:return
        centre=self.roi_definition['centre'];size=self.roi_definition['size']
        a,b,_=PLANES[self.plane.get()];ia,ib=AX[a],AX[b]
        u0=centre[ia]-size[ia]/2;v0=centre[ib]-size[ib]/2
        roi_colour=('#00a65a' if self.roi_metrics_cache and self.roi_metrics_cache['decision']['suitable']
                    else '#d32f2f' if self.roi_metrics_cache else '#ff6f00')
        box=Rectangle((u0,v0),size[ia],size[ib],facecolor=roi_colour,alpha=.12,
                      edgecolor=roi_colour,linewidth=2.2,linestyle='--',zorder=15)
        self.ax2.add_patch(box)
        self.ax2.plot(centre[ia],centre[ib],marker='x',ms=10,mew=2,color='white',zorder=18,label='центр ROI')
        if self.roi_metrics_cache is not None:
            m=self.roi_metrics_cache['metrics'];points=m['points_mm'];strength=m['strength_T']*1000
            self.ax2.scatter(points[:,ia],points[:,ib],c=strength,cmap='plasma',s=8,alpha=.34,zorder=16)
            pmax=m['max_point_mm'];pmin=m['min_point_mm']
            self.ax2.plot(pmax[ia],pmax[ib],'r*',ms=14,zorder=20,label='максимум ROI')
            self.ax2.plot(pmin[ia],pmin[ib],marker='D',color='#00e5ff',ms=7,zorder=20,label='минимум ROI')
        self.ax2.legend(fontsize=8,loc='best')
        self.c2.draw_idle()

    def draw_3d(self,fit=False):
        if self.volume_colorbar is not None:
            self.volume_colorbar.remove();self.volume_colorbar=None
        super().draw_3d(fit)
        self.ax3.set_position([.03,.08,.77,.82])
        if getattr(self,'volume_bounds',None) is not None and self.volume_cache is not None:
            lo,hi=self.volume_bounds
            self.ax3.set_xlim(lo[0],hi[0]);self.ax3.set_ylim(lo[1],hi[1]);self.ax3.set_zlim(lo[2],hi[2])
            self.ax3.set_box_aspect(np.maximum(hi-lo,1))
        self._draw_full_volume_field()
        if self.roi_definition is not None:
            self._draw_roi_3d();return
        if self.volume_cache is None:return

    def _draw_full_volume_field(self):
        """Показывает карту B0 во всём рассчитанном объёме."""
        if self.volume_cache is None:return
        xyz,vectors,strength=self.volume_cache
        if not len(xyz):return
        low=float(np.nanpercentile(strength,2));high=float(np.nanpercentile(strength,98))
        if high<=low:high=low+max(abs(low)*1e-6,1e-9)
        norm=matplotlib.colors.Normalize(vmin=low,vmax=high);cmap=matplotlib.colormaps['viridis']
        self.ax3.scatter(*xyz[::2].T,c=strength[::2],cmap=cmap,norm=norm,s=4,alpha=.16,depthshade=False,zorder=-5)
        idx=np.linspace(0,len(xyz)-1,min(420,len(xyz)),dtype=int);p=xyz[idx];b=vectors[idx]
        length=max(np.ptp(xyz,axis=0).max()/26,1)
        self.ax3.quiver(*p.T,*b.T,normalize=True,length=length,colors=cmap(norm(strength[idx])),alpha=.48,linewidth=.65,arrow_length_ratio=.26)
        k=int(np.argmax(strength));self.ax3.scatter(*xyz[k],marker='*',s=95,color='red',depthshade=False)
        color_axis=self.fig3.add_axes([.86,.22,.025,.56])
        self.volume_colorbar=self.fig3.colorbar(matplotlib.cm.ScalarMappable(norm=norm,cmap=cmap),cax=color_axis,label='|B0| во всём объёме, мТл')
        self.ax3.set_title('Объём XYZ • модуль и направление B0',fontsize=10)
        self.c3.draw_idle()

    def _draw_roi_3d(self):
        centre=np.asarray(self.roi_definition['centre']);size=np.asarray(self.roi_definition['size'])
        lo,hi=centre-size/2,centre+size/2
        roi_colour=('#00a65a' if self.roi_metrics_cache and self.roi_metrics_cache['decision']['suitable']
                    else '#d32f2f' if self.roi_metrics_cache else '#ff8f00')
        corners=np.array([[x,y,z] for x in (lo[0],hi[0]) for y in (lo[1],hi[1]) for z in (lo[2],hi[2])])
        for i in range(len(corners)):
            for j in range(i+1,len(corners)):
                if np.count_nonzero(abs(corners[i]-corners[j])>1e-9)==1:
                    self.ax3.plot(*np.vstack([corners[i],corners[j]]).T,color=roi_colour,linewidth=2.0,alpha=.9)
        self.ax3.scatter(*centre,marker='x',s=75,color='white',linewidth=2.2,depthshade=False)
        if self.roi_metrics_cache is None:
            self.ax3.set_title('Весь объём B0 • ROI выделен оранжевым каркасом',fontsize=10)
            self.c3.draw_idle();return
        m=self.roi_metrics_cache['metrics'];decision=self.roi_metrics_cache['decision']
        points=m['points_mm'];vectors=m['vectors_T'];strength=m['strength_T']*1000
        self.ax3.scatter(*points.T,c='#ffca28',s=16,alpha=.66,depthshade=False)
        stride=max(1,len(points)//180);q=points[::stride];bv=vectors[::stride]
        arrow=max(float(np.min(size))/18,.25)
        self.ax3.quiver(*q.T,*bv.T,normalize=True,length=arrow,color='#f5f5f5',alpha=.32,linewidth=.45,arrow_length_ratio=.25)
        pmax=m['max_point_mm'];pmin=m['min_point_mm']
        self.ax3.scatter(*pmax,marker='*',s=180,color='red',edgecolor='white',linewidth=.8,depthshade=False)
        self.ax3.scatter(*pmin,marker='D',s=55,color='#00e5ff',edgecolor='black',linewidth=.5,depthshade=False)
        self.ax3.text(*pmax,f"  MAX {m['b_max_T']*1000:.3f} мТл\n  {np.round(pmax,2)} мм",color='red',fontsize=8)
        slice_mm=decision.get('slice_thickness_mm',math.inf)
        slice_text=f'{slice_mm:.3f} мм' if np.isfinite(slice_mm) else 'не определяется'
        verdict='ПОДХОДИТ' if decision['suitable'] else 'НЕ ПОДХОДИТ'
        self.ax3.set_title(f"{verdict} • весь объём B0 + ROI • MAX ROI {m['b_max_T']*1000:.3f} мТл • срез {slice_text}",fontsize=10,color=roi_colour)
        self.c3.draw_idle()

    def set_mode(self,mode):
        if mode=='sketch':self.contour_editor();return
        super().set_mode(mode)

    def add_magnet(self,shape):
        self.new_magnet_dialog(shape)

    def new_magnet_dialog(self,shape):
        win=tk.Toplevel(self);win.title('Создать магнит');win.transient(self)
        chosen=tk.StringVar(value=self.SHAPES[shape]);grade_var=tk.StringVar(value='N45');entries={}
        ttk.Label(win,text='Форма магнита').grid(row=0,column=0,padx=10,pady=6)
        ttk.Combobox(win,textvariable=chosen,values=list(self.SHAPES.values()),state='readonly',width=24).grid(row=0,column=1,padx=10)
        for i,(k,label,value) in enumerate([('name','Имя','Новый магнит'),('sx','Размер X, мм','30'),('sy','Размер Y, мм','30'),('sz','Размер Z, мм','15')],1):
            entries[k]=tk.StringVar(value=value);ttk.Label(win,text=label).grid(row=i,column=0,padx=10,pady=5);ttk.Entry(win,textvariable=entries[k]).grid(row=i,column=1,padx=10)
        ttk.Label(win,text='Марка').grid(row=5,column=0,padx=10,pady=5);ttk.Combobox(win,textvariable=grade_var,values=tuple(GRADES),state='readonly').grid(row=5,column=1,padx=10)
        entries['br_manual']=tk.StringVar(value='0');ttk.Label(win,text='Br вручную, Тл (0 = по марке)').grid(row=6,column=0,padx=10,pady=5);ttk.Entry(win,textvariable=entries['br_manual']).grid(row=6,column=1,padx=10)
        def create():
            try:
                sizes=[float(entries[k].get().replace(',','.')) for k in ('sx','sy','sz')]
                custom_br=float(entries['br_manual'].get().replace(',','.'))
                if not all(np.isfinite(sizes)) or min(sizes)<=0 or not np.isfinite(custom_br) or custom_br<0 or custom_br>3:raise ValueError
            except ValueError:messagebox.showerror('Размеры и Br','Размеры должны быть положительными; Br вручную — 0…3 Тл.',parent=win);return
            s=next(k for k,v in self.SHAPES.items() if v==chosen.get());name=entries['name'].get();win.destroy()
            if s=='prism':self.contour_editor(name=name,thickness=sizes[1],new_grade=grade_var.get(),new_remanence=custom_br);return
            self.snapshot();self.magnets.append(Magnet(name,s,[0,0,0],sizes,grade=grade_var.get(),remanence_T=custom_br));self.selected=len(self.magnets)-1;self.refresh(True,True)
        ttk.Button(win,text='Создать / нарисовать контур',command=create).grid(row=7,column=0,columnspan=2,pady=12)

    def contour_editor(self,name='Контур',thickness=20,edit_index=None,new_grade='N45',new_remanence=0.0):
        return ContourEditor(self,name,thickness,edit_index,new_grade,new_remanence)

    def _legacy_contour_editor(self,name='Контур',thickness=20):
        win=tk.Toplevel(self);win.title('Магнит по точкам — сечение XZ');win.geometry('820x730');win.transient(self)
        ttk.Label(win,text='ЛКМ: добавить точку или перетащить существующую • ПКМ: удалить точку').pack(pady=5)
        row=ttk.Frame(win);row.pack(fill='x');variables={}
        for k,label,val in [('x','X','0'),('z','Z','0'),('length','Длина','10'),('angle','Угол °','0'),('depth','Толщина Y',str(thickness))]:
            ttk.Label(row,text=label).pack(side='left');variables[k]=tk.StringVar(value=val);ttk.Entry(row,textvariable=variables[k],width=6).pack(side='left',padx=3)
        fig=Figure(figsize=(7,5));ax=fig.add_subplot(111);canvas=FigureCanvasTkAgg(fig,win);canvas.get_tk_widget().pack(fill='both',expand=True)
        points=[];state={'drag':None};info=ttk.Label(win,text='');info.pack()
        def redraw():
            ax.clear();ax.set(xlim=(-50,50),ylim=(-40,40),xlabel='X, мм',ylabel='Z, мм');ax.set_aspect('equal');ax.grid(alpha=.3)
            if points:
                p=np.asarray(points);closed=np.vstack([p,p[0]]) if len(p)>2 else p;ax.plot(*closed.T,'o-',color='#1769aa')
                for i,q in enumerate(p):ax.annotate(str(i+1),q,xytext=(4,4),textcoords='offset points')
                ax.set_xlim(min(-50,p[:,0].min()-10),max(50,p[:,0].max()+10));ax.set_ylim(min(-40,p[:,1].min()-10),max(40,p[:,1].max()+10))
            info.config(text=f'Точек: {len(points)}. Замкнутый контур будет вытянут вдоль Y.');canvas.draw_idle()
        def numeric(polar=False):
            try:
                if polar:
                    length=float(variables['length'].get().replace(',','.'));angle=math.radians(float(variables['angle'].get().replace(',','.')));p=np.array(points[-1] if points else [0,0])+length*np.array([math.cos(angle),math.sin(angle)])
                else:p=np.array([float(variables[k].get().replace(',','.')) for k in ('x','z')])
                if not np.all(np.isfinite(p)):raise ValueError
                points.append(p.tolist());redraw()
            except ValueError:messagebox.showerror('Координаты','Введите корректные числа',parent=win)
        def press(e):
            if e.inaxes!=ax or e.xdata is None:return
            nearest=None
            if points:
                dist=np.linalg.norm(ax.transData.transform(points)-[e.x,e.y],axis=1);j=int(np.argmin(dist));nearest=j if dist[j]<12 else None
            if e.button==3:
                if nearest is not None:points.pop(nearest);redraw()
            elif e.button==1:
                if nearest is not None:state['drag']=nearest
                else:points.append([e.xdata,e.ydata]);redraw()
        def motion(e):
            if state['drag'] is not None and e.inaxes==ax and e.xdata is not None:points[state['drag']]=[e.xdata,e.ydata];redraw()
        def save():
            try:
                p=np.asarray(points);depth=float(variables['depth'].get().replace(',','.'))
                if len(p)<3 or not np.isfinite(depth) or depth<=0:raise ValueError
                area=abs(np.sum(p[:,0]*np.roll(p[:,1],-1)-p[:,1]*np.roll(p[:,0],-1)))/2
                if area<.01 or min(np.ptp(p,axis=0))<.01:raise ValueError
                # Reject crossings of non-adjacent edges.
                def cross(a,b,c):return np.cross(b-a,c-a).item()
                for i in range(len(p)):
                    for j in range(i+2,len(p)):
                        if i==0 and j==len(p)-1:continue
                        a,b=p[i],p[(i+1)%len(p)];c,d=p[j],p[(j+1)%len(p)]
                        if cross(a,b,c)*cross(a,b,d)<=0 and cross(c,d,a)*cross(c,d,b)<=0:raise ValueError
                centre=(p.min(axis=0)+p.max(axis=0))/2;size=np.ptp(p,axis=0)
            except ValueError:messagebox.showerror('Контур','Нужно минимум 3 точки без самопересечений, ненулевая площадь и положительная толщина.',parent=win);return
            self.snapshot();self.magnets.append(Magnet(name,'prism',[centre[0],0,centre[1]],[size[0],depth,size[1]],polygon=(p-centre).tolist()));self.selected=len(self.magnets)-1;win.destroy();self.refresh(True,True)
        buttons=ttk.Frame(win);buttons.pack(fill='x',pady=8)
        for label,command in [('Добавить X,Z',lambda:numeric()),('Отрезок L, угол',lambda:numeric(True)),('Убрать последнюю',lambda:(points.pop() if points else None,redraw())),('Создать магнит',save)]:ttk.Button(buttons,text=label,command=command).pack(side='left',padx=4)
        canvas.mpl_connect('button_press_event',press);canvas.mpl_connect('motion_notify_event',motion);canvas.mpl_connect('button_release_event',lambda e:state.update(drag=None));redraw()

def pair_positions(first, second, distance, azimuth, elevation, symmetric=False):
    values = np.asarray([distance, azimuth, elevation], float)
    if not np.all(np.isfinite(values)) or distance < 0:
        raise ValueError('Расстояние должно быть неотрицательным, углы — конечными числами.')

    az = math.radians(azimuth)
    el = math.radians(elevation)

    delta = distance * np.array([
        math.cos(el) * math.cos(az),
        math.cos(el) * math.sin(az),
        math.sin(el),
    ])

    first = np.asarray(first, float)
    second = np.asarray(second, float)
    if symmetric:
        centre = (first + second) / 2
        return centre - delta / 2, centre + delta / 2
    return first, first + delta


class PairDialog(tk.Toplevel):
    def __init__(self,app):
        super().__init__(app);self.app=app;self.title('Расстояние и угол между магнитами');self.transient(app);self.grab_set();self.resizable(False,False)
        frame=ttk.Frame(self,padding=15);frame.pack(fill='both',expand=True)
        names=[f'{i+1}. {m.name}' for i,m in enumerate(app.magnets)]
        self.first=ttk.Combobox(frame,values=names,state='readonly',width=40);self.second=ttk.Combobox(frame,values=names,state='readonly',width=40)
        ttk.Label(frame,text='Первый / опорный магнит').grid(row=0,column=0,sticky='w');self.first.grid(row=1,column=0,columnspan=2,sticky='ew',pady=(2,8))
        ttk.Label(frame,text='Второй / перемещаемый магнит').grid(row=2,column=0,sticky='w');self.second.grid(row=3,column=0,columnspan=2,sticky='ew',pady=(2,8))
        self.first.current(0);self.second.current(1)
        self.vars={k:tk.StringVar() for k in ('distance','azimuth','elevation')};self.symmetric=tk.BooleanVar(value=False)
        for row,(key,label) in enumerate([('distance','Расстояние между центрами, мм'),('azimuth','Азимут φ: от +X к +Y, °'),('elevation','Подъём θ: от XY к +Z, °')],4):
            ttk.Label(frame,text=label).grid(row=row,column=0,sticky='w',pady=5);ttk.Entry(frame,textvariable=self.vars[key],width=14).grid(row=row,column=1,padx=8)
        ttk.Checkbutton(frame,text='Двигать оба симметрично вокруг середины пары',variable=self.symmetric,command=self.preview).grid(row=7,column=0,columnspan=2,sticky='w',pady=8)
        quick=ttk.Frame(frame);quick.grid(row=8,column=0,columnspan=2,sticky='w')
        for title, az, el in [('По X', 0, 0), ('По Y', 90, 0), ('По Z', 0, 90), ('Наклон 45°', 0, 45)]:
            ttk.Button(quick, text=title,
                       command=lambda a=az, e=el: self.quick(a, e)).pack(side='left', padx=2)
        self.info=ttk.Label(frame,text='',wraplength=450);self.info.grid(row=9,column=0,columnspan=2,sticky='w',pady=10)
        ttk.Label(frame,text='Углы меняют положение центров пары.\nФорма и собственная ориентация магнитов не вращаются.\nРасстояние между центрами не равно зазору между поверхностями.',foreground='#555').grid(row=10,column=0,columnspan=2,sticky='w',pady=5)
        buttons=ttk.Frame(frame);buttons.grid(row=11,column=0,columnspan=2,pady=8)
        ttk.Button(buttons,text='Применить',command=self.apply).pack(side='left',padx=5);ttk.Button(buttons,text='Текущие значения',command=self.read_current).pack(side='left',padx=5);ttk.Button(buttons,text='Закрыть',command=self.destroy).pack(side='left',padx=5)
        for v in self.vars.values():v.trace_add('write',lambda *_:self.preview())
        self.first.bind('<<ComboboxSelected>>',lambda e:self.read_current());self.second.bind('<<ComboboxSelected>>',lambda e:self.read_current());self.read_current()

    def quick(self,az,el):self.vars['azimuth'].set(str(az));self.vars['elevation'].set(str(el))

    def read_current(self):
        i,j=self.first.current(),self.second.current();delta=np.asarray(self.app.magnets[j].center)-self.app.magnets[i].center
        values=[np.linalg.norm(delta),np.degrees(np.arctan2(delta[1],delta[0])),np.degrees(np.arctan2(delta[2],np.hypot(delta[0],delta[1])))]
        for key,value in zip(self.vars,values):self.vars[key].set(f'{value:.6g}')

    def targets(self):
        i,j=self.first.current(),self.second.current()
        if i==j:raise ValueError('Выберите два разных магнита.')
        values=[float(self.vars[k].get().replace(',','.')) for k in self.vars]
        first,second=pair_positions(self.app.magnets[i].center,self.app.magnets[j].center,*values,self.symmetric.get())
        return i,j,first,second

    def preview(self):
        try:
            i,j,p,q=self.targets();self.info.config(text=f'Первый XYZ: {np.round(p,3)} мм\nВторой XYZ: {np.round(q,3)} мм\nИтоговое расстояние: {np.linalg.norm(q-p):.3f} мм')
        except ValueError as e:self.info.config(text=str(e))

    def apply(self):
        try:i,j,p,q=self.targets()
        except ValueError as e:messagebox.showerror('Пара магнитов',str(e),parent=self);return
        self.app.snapshot();self.app.magnets[i].center=p.tolist();self.app.magnets[j].center=q.tolist();self.app.selected=j;self.app.refresh(True,True);self.preview()


def contour_template(kind,w,h):
    templates={
        'Прямоугольник':[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]],
        'Треугольник':[[0,h/2],[w/2,-h/2],[-w/2,-h/2]],
        'Трапеция':[[-w/2,-h/2],[w/2,-h/2],[w*.3,h/2],[-w*.3,h/2]],
        'L-образный':[[-w/2,-h/2],[w/2,-h/2],[w/2,0],[0,0],[0,h/2],[-w/2,h/2]],
    }
    if kind in templates:return templates[kind]
    if kind=='Шестиугольник':
        t=np.arange(6)*np.pi/3+np.pi/2;return np.c_[w/2*np.cos(t),h/2*np.sin(t)].tolist()
    if kind=='Звезда':
        t=np.arange(10)*np.pi/5-np.pi/2;r=np.where(np.arange(10)%2==0,.5,.25)
        return np.c_[w*r*np.cos(t),h*r*np.sin(t)].tolist()
    t=np.linspace(-np.pi/3,np.pi/3,11);outer=np.c_[w/2*np.sin(t),w/2*np.cos(t)-w/2+h/2];inner=np.c_[w/4*np.sin(t[::-1]),w/4*np.cos(t[::-1])-w/2+h/2]
    return np.vstack([outer,inner]).tolist()


def validate_contour(points):
    p=np.asarray(points,float)
    if len(p)<3:raise ValueError('Нужно минимум три вершины.')
    if p.shape!=(len(p),2) or not np.all(np.isfinite(p)):raise ValueError('Недопустимые координаты.')
    tol=1e-8
    if any(np.linalg.norm(p[i]-p[j])<tol for i in range(len(p)) for j in range(i)):
        raise ValueError('Вершины повторяются. Последнюю точку не нужно совмещать с первой: контур замыкается автоматически.')
    def cross(a,b,c):
        u=b-a;v=c-a;return u[0]*v[1]-u[1]*v[0]
    def on(a,b,c):return abs(cross(a,b,c))<tol and np.all(c>=np.minimum(a,b)-tol) and np.all(c<=np.maximum(a,b)+tol)
    for i in range(len(p)):
        for j in range(i+2,len(p)):
            if i==0 and j==len(p)-1:continue
            a,b=p[i],p[(i+1)%len(p)];c,d=p[j],p[(j+1)%len(p)]
            crosses=cross(a,b,c)*cross(a,b,d)<0 and cross(c,d,a)*cross(c,d,b)<0
            if crosses or on(a,b,c) or on(a,b,d) or on(c,d,a) or on(c,d,b):
                raise ValueError(f'Рёбра {i+1} и {j+1} пересекаются или касаются.')
    area=abs(np.sum(p[:,0]*np.roll(p[:,1],-1)-p[:,1]*np.roll(p[:,0],-1)))/2
    if area<1e-6:raise ValueError('Контур имеет нулевую площадь.')
    return area


class ContourEditor(tk.Toplevel):
    TEMPLATE_NAMES=('Шестиугольник','Прямоугольник','Треугольник','Трапеция','L-образный','Звезда','Кольцевой сектор (дуга)')
    def __init__(self,app,name,thickness,index=None,new_grade='N45',new_remanence=0.0):
        super().__init__(app);self.app=app;self.index=index;self.name=name;self.new_grade=new_grade;self.new_remanence=new_remanence;self.points=[];self.selected=None;self.drag=None;self.undo_data=[];self.redo_data=[];self.syncing=False
        self.title('Редактор формы магнита — контур XZ');self.geometry('1080x780');self.minsize(940,660);self.transient(app);self.grab_set()
        self.original=copy.deepcopy(app.magnets[index]) if index is not None else None
        self.plane=self.original.contour_plane if self.original and self.original.shape=='prism' else app.plane.get()
        self.axis_a,self.axis_b,self.axis_depth=PLANES[self.plane]
        self.ia,self.ib,self.ic=[AX[k] for k in PLANES[self.plane]]
        self.title(f'Редактор формы магнита — контур {self.plane}')
        width,height=40,20
        if self.original:
            m=self.original;self.name=m.name;thickness=m.size[self.ic];width,height=m.size[self.ia],m.size[self.ib]
            self.points=copy.deepcopy(m.polygon) if m.shape=='prism' and m.polygon else contour_template('Прямоугольник',width,height)
        self.vars={k:tk.StringVar(value=str(v)) for k,v in dict(template='Шестиугольник',w=width,h=height,depth=thickness,x=0,z=0,length=10,angle=0,step=1).items()}
        self.snap=tk.BooleanVar(value=False)
        self.tool=tk.StringVar(value='move')
        ttk.Label(self,text='ЛКМ: добавить / перетащить вершину • ПКМ: удалить • Колесо: масштаб • координаты относительно центра магнита').pack(padx=10,pady=7,anchor='w')
        if self.original and self.original.shape!='prism':
            ttk.Label(self,text=f'При применении магнит станет призмой по контуру {self.plane}. Имя, марка и намагничивание сохранятся.',foreground='#805c15').pack(padx=10,anchor='w')
        bar=ttk.Frame(self,padding=(10,2));bar.pack(fill='x')
        ttk.Combobox(bar,textvariable=self.vars['template'],values=self.TEMPLATE_NAMES,state='readonly',width=24).pack(side='left')
        for key,label in [('w','X, мм'),('h','Z, мм')]:self.entry(bar,key,label,6)
        ttk.Button(bar,text='Загрузить шаблон',command=self.load_template).pack(side='left',padx=5)
        ttk.Button(bar,text='Очистить',command=self.clear).pack(side='left',padx=4)
        self.entry(bar,'depth','Толщина Y, мм',7)
        bar2=ttk.Frame(self,padding=(10,2));bar2.pack(fill='x')
        for text,fn in [('↶ Отмена',self.undo),('↷ Повтор',self.redo),('Вписать',lambda:self.redraw(True)),('Повернуть 90°',self.rotate),(f'Зеркало {self.axis_a.upper()}',self.mirror)]:ttk.Button(bar2,text=text,command=fn).pack(side='left',padx=3)
        ttk.Checkbutton(bar2,text='Привязка',variable=self.snap).pack(side='left',padx=6);self.entry(bar2,'step','Шаг, мм',5)
        modes=ttk.Frame(self,padding=(10,2));modes.pack(fill='x')
        ttk.Radiobutton(modes,text='Двигать точки',variable=self.tool,value='move').pack(side='left',padx=4)
        ttk.Radiobutton(modes,text='Добавлять точки',variable=self.tool,value='add').pack(side='left',padx=4)
        ttk.Label(modes,text='В режиме движения клик по пустому месту не создаёт вершину.',foreground='#555').pack(side='left',padx=10)
        main=ttk.Frame(self);main.pack(fill='both',expand=True)
        side=ttk.Frame(main,padding=8,width=245);side.pack(side='right',fill='y')
        self.table=ttk.Treeview(side,columns=('x','z'),show='tree headings',height=10,selectmode='browse');self.table.heading('#0',text='№');self.table.column('#0',width=35);self.table.heading('x',text='X, мм');self.table.heading('z',text='Z, мм');self.table.column('x',width=80);self.table.column('z',width=80)
        self.table.heading('x',text=f'{self.axis_a.upper()}, мм');self.table.heading('z',text=f'{self.axis_b.upper()}, мм')
        self.table.bind('<Double-1>',self.edit_cell)
        scroll=ttk.Scrollbar(side,orient='vertical',command=self.table.yview);self.table.configure(yscrollcommand=scroll.set);scroll.pack(side='right',fill='y');self.table.pack(fill='x');self.table.bind('<<TreeviewSelect>>',self.choose)
        for key,label in [('x','X, мм'),('z','Z, мм'),('length','Длина L, мм'),('angle','Угол α, °')]:
            row=ttk.Frame(side);row.pack(fill='x',pady=4);self.entry(row,key,label,9)
        for text,fn in [('Добавить X,Z',self.add_xy),('Изменить выбранную',self.update_point),('Вставить после выбранной',self.insert_point),('Отрезок L, α',self.add_polar),('Удалить выбранную',self.delete)]:ttk.Button(side,text=text,command=fn).pack(fill='x',pady=3)
        ttk.Label(side,text='Угол: от +X к +Z.\nОтрезок строится от последней\nвершины. Enter в поле не\nзакрывает редактор.',foreground='#555').pack(pady=8,anchor='w')
        self.fig=Figure(figsize=(7,5));self.ax=self.fig.add_subplot(111);self.canvas=FigureCanvasTkAgg(self.fig,main);self.canvas.get_tk_widget().pack(side='left',fill='both',expand=True)
        self.info=ttk.Label(self,wraplength=1000);self.info.pack(fill='x',padx=12,pady=4)
        bottom=ttk.Frame(self,padding=8);bottom.pack(fill='x')
        ttk.Button(bottom,text='Применить к магниту' if index is not None else 'Создать магнит',command=self.save,style='Accent.TButton').pack(side='right',padx=5)
        ttk.Button(bottom,text='Отмена / закрыть',command=self.destroy).pack(side='right',padx=5)
        ttk.Label(bottom,text='Изменения применяются только после нажатия кнопки.').pack(side='left')
        # Reserve footer height before allocating expandable canvas/sidebar space.
        bottom.pack_configure(side='bottom',before=main)
        self.info.pack_configure(side='bottom',before=main)
        for event,fn in [('button_press_event',self.press),('motion_notify_event',self.motion),('button_release_event',self.release),('scroll_event',self.zoom)]:self.canvas.mpl_connect(event,fn)
        self.bind('<Control-z>',lambda e:(self.undo(),'break')[1]);self.bind('<Control-y>',lambda e:(self.redo(),'break')[1]);self.bind('<Escape>',lambda e:self.destroy())
        self.vars['depth'].trace_add('write',lambda *_:self.summary())
        if not self.points:
            self.points=contour_template('Шестиугольник',width,height)
        replacements={'Добавить X,Z':f'Добавить {self.axis_a.upper()},{self.axis_b.upper()}',
                      'Угол: от +X к +Z.\nОтрезок строится от последней\nвершины. Enter в поле не\nзакрывает редактор.':f'Угол: от +{self.axis_a.upper()} к +{self.axis_b.upper()}.\nEnter в координате изменяет\nвыбранную вершину. Двойной\nщелчок по ячейке — ввод.'}
        def relabel(parent):
            for child in parent.winfo_children():
                if isinstance(child,(ttk.Label,ttk.Button)):
                    text=child.cget('text')
                    if text in replacements:child.config(text=replacements[text])
                relabel(child)
        relabel(self)
        self.redraw(True)

    def entry(self,parent,key,label,width):
        if key in ('x','w'):label=f'{self.axis_a.upper()}, мм'
        elif key in ('z','h'):label=f'{self.axis_b.upper()}, мм'
        elif key=='depth':label=f'Толщина {self.axis_depth.upper()}, мм'
        ttk.Label(parent,text=label).pack(side='left',padx=(5,2))
        entry=ttk.Entry(parent,textvariable=self.vars[key],width=width);entry.pack(side='left',padx=2)
        if key in ('x','z'):entry.bind('<Return>',lambda e:(self.update_point(),'break')[1])

    def edit_cell(self,event):
        row=self.table.identify_row(event.y);column=self.table.identify_column(event.x)
        if not row or column not in ('#1','#2'):return
        index=int(row);coord=int(column[1:])-1;box=self.table.bbox(row,column)
        if not box:return
        entry=ttk.Entry(self.table);entry.insert(0,f'{self.points[index][coord]:.12g}');entry.place(x=box[0],y=box[1],width=box[2],height=box[3]);entry.focus_set();entry.select_range(0,'end')
        def commit(e=None):
            try:
                value=float(entry.get().replace(',','.'))
                if not np.isfinite(value):raise ValueError
            except ValueError:entry.bell();return 'break'
            self.checkpoint();self.points[index][coord]=value;self.selected=index;entry.destroy();self.redraw();return 'break'
        entry.bind('<Return>',commit);entry.bind('<Escape>',lambda e:entry.destroy());entry.bind('<FocusOut>',lambda e:entry.destroy())

    def number(self,key,positive=False):
        n=float(self.vars[key].get().replace(',','.'))
        if not np.isfinite(n) or (positive and n<=0):raise ValueError('Введите конечное число'+(' больше нуля.' if positive else '.'))
        return n

    def checkpoint(self):
        self.undo_data.append(copy.deepcopy(self.points));self.undo_data=self.undo_data[-100:];self.redo_data.clear()

    def undo(self):
        if self.undo_data:self.redo_data.append(copy.deepcopy(self.points));self.points=self.undo_data.pop();self.selected=None;self.redraw()

    def redo(self):
        if self.redo_data:self.undo_data.append(copy.deepcopy(self.points));self.points=self.redo_data.pop();self.selected=None;self.redraw()

    def load_template(self):
        try:p=contour_template(self.vars['template'].get(),self.number('w',True),self.number('h',True))
        except ValueError as e:messagebox.showerror('Шаблон',str(e),parent=self);return
        self.checkpoint();self.points=p;self.selected=None;self.redraw(True)

    def clear(self):self.checkpoint();self.points=[];self.selected=None;self.tool.set('add');self.redraw()

    def rotate(self):
        if self.points:self.checkpoint();self.points=[[-z,x] for x,z in self.points];self.redraw(True)

    def mirror(self):
        if self.points:self.checkpoint();self.points=[[-x,z] for x,z in self.points];self.redraw(True)

    def numeric_point(self):return [self.number('x'),self.number('z')]

    def add_xy(self):
        try:p=self.numeric_point()
        except ValueError as e:messagebox.showerror('Точка',str(e),parent=self);return
        self.checkpoint();self.points.append(p);self.selected=len(self.points)-1;self.redraw()

    def update_point(self):
        if self.selected is None:return
        try:p=self.numeric_point()
        except ValueError as e:messagebox.showerror('Точка',str(e),parent=self);return
        self.checkpoint();self.points[self.selected]=p;self.redraw()

    def insert_point(self):
        if self.selected is None:return self.add_xy()
        try:p=self.numeric_point()
        except ValueError as e:messagebox.showerror('Точка',str(e),parent=self);return
        self.checkpoint();self.selected+=1;self.points.insert(self.selected,p);self.redraw()

    def add_polar(self):
        try:l=self.number('length',True);t=math.radians(self.number('angle'));p=np.array(self.points[-1] if self.points else [0,0])+l*np.array([math.cos(t),math.sin(t)])
        except ValueError as e:messagebox.showerror('Отрезок',str(e),parent=self);return
        self.checkpoint();self.points.append(p.tolist());self.selected=len(self.points)-1;self.redraw()

    def delete(self):
        if self.selected is not None:self.checkpoint();self.points.pop(self.selected);self.selected=None;self.redraw()

    def choose(self,event=None):
        if self.syncing:return
        ids=self.table.selection()
        if ids:
            index=int(ids[0])
            if index==self.selected:return
            self.selected=index;self.redraw()

    def summary(self):
        try:area=validate_contour(self.points);depth=self.number('depth',True);text=f'Точек: {len(self.points)} • Площадь: {area:.2f} мм² • Объём: {area*depth/1000:.3f} см³ • Контур корректен'
        except ValueError as e:text=f'Точек: {len(self.points)} • {e}'
        self.info.config(text=text)

    def redraw(self,fit=False):
        limits=(self.ax.get_xlim(),self.ax.get_ylim());self.ax.clear();self.ax.set(xlabel=f'{self.axis_a.upper()}, мм',ylabel=f'{self.axis_b.upper()}, мм',title=f'Сечение {self.plane} — выдавливание вдоль {self.axis_depth.upper()}');self.ax.set_aspect('equal');self.ax.grid(alpha=.25)
        if self.points:
            p=np.asarray(self.points);q=np.vstack([p,p[0]]) if len(p)>2 else p;self.contour_line,=self.ax.plot(*q.T,'o-',color='#2376ac',ms=8,picker=16)
            self.contour_fill=self.ax.fill(*p.T,color='#9acfe9',alpha=.35)[0] if len(p)>2 else None
            self.vertex_labels=[self.ax.annotate(str(i+1),point,xytext=(7,7),textcoords='offset points',fontsize=9) for i,point in enumerate(p)]
            self.active_vertex=None
            if self.selected is not None and self.selected<len(p):
                self.active_vertex,=self.ax.plot(*p[self.selected],'o',ms=12,color='#e87c20');self.vars['x'].set(f'{p[self.selected,0]:.5g}');self.vars['z'].set(f'{p[self.selected,1]:.5g}')
        if fit:
            p=np.asarray(self.points) if self.points else np.array([[-40,-30],[40,30]]);low=p.min(axis=0);high=p.max(axis=0);pad=np.maximum((high-low)*.2,5);self.ax.set_xlim(low[0]-pad[0],high[0]+pad[0]);self.ax.set_ylim(low[1]-pad[1],high[1]+pad[1])
        else:self.ax.set_xlim(limits[0]);self.ax.set_ylim(limits[1])
        self.syncing=True
        self.table.delete(*self.table.get_children())
        for i,(x,z) in enumerate(self.points):self.table.insert('','end',iid=str(i),text=i+1,values=(f'{x:.5g}',f'{z:.5g}'))
        if self.selected is not None and self.selected<len(self.points):self.table.selection_set(str(self.selected));self.table.see(str(self.selected))
        self.syncing=False;self.summary();self.canvas.draw_idle()

    def snapped(self,e):
        p=np.array([e.xdata,e.ydata])
        if self.snap.get():step=self.number('step',True);p=np.round(p/step)*step
        return p.tolist()

    def press(self,e):
        if e.inaxes!=self.ax or e.xdata is None:return
        idx=None
        if self.points:
            dist=np.linalg.norm(self.ax.transData.transform(self.points)-[e.x,e.y],axis=1);j=int(np.argmin(dist));idx=j if dist[j]<18 else None
        if e.button==3:
            if idx is not None:self.selected=idx;self.delete()
        elif e.button==1:
            if idx is not None:
                self.selected=idx;self.drag=idx;self.drag_before=copy.deepcopy(self.points);self.redraw();self.canvas.get_tk_widget().configure(cursor='fleur')
            elif self.tool.get()=='add':
                try:p=self.snapped(e)
                except ValueError as err:messagebox.showerror('Сетка',str(err),parent=self);return
                self.checkpoint();self.points.append(p);self.selected=len(self.points)-1;self.redraw()

    def motion(self,e):
        if self.drag is not None and e.inaxes==self.ax and e.xdata is not None:
            try:
                self.points[self.drag]=self.snapped(e)
                p=np.asarray(self.points);q=np.vstack([p,p[0]]) if len(p)>2 else p
                self.contour_line.set_data(q[:,0],q[:,1])
                if self.contour_fill is not None:self.contour_fill.set_xy(p)
                for annotation,point in zip(self.vertex_labels,p):annotation.xy=point
                if self.active_vertex is not None:self.active_vertex.set_data([p[self.drag,0]],[p[self.drag,1]])
                self.vars['x'].set(f'{p[self.drag,0]:.5g}');self.vars['z'].set(f'{p[self.drag,1]:.5g}')
                self.table.item(str(self.drag),values=(f'{p[self.drag,0]:.5g}',f'{p[self.drag,1]:.5g}'))
                self.summary();self.canvas.draw_idle()
            except ValueError:return

    def release(self,e):
        if self.drag is not None:
            if not np.allclose(self.points,self.drag_before):self.undo_data.append(self.drag_before);self.undo_data=self.undo_data[-100:];self.redo_data.clear()
            self.drag=None;self.canvas.get_tk_widget().configure(cursor='');self.redraw()

    def zoom(self,e):
        if e.inaxes!=self.ax:return
        factor=.8 if e.button=='up' else 1.25
        for limits,centre,setter in [(self.ax.get_xlim(),e.xdata,self.ax.set_xlim),(self.ax.get_ylim(),e.ydata,self.ax.set_ylim)]:setter(*(centre+(np.array(limits)-centre)*factor))
        self.canvas.draw_idle()

    def save(self):
        try:validate_contour(self.points);depth=self.number('depth',True)
        except ValueError as e:messagebox.showerror('Контур',str(e),parent=self);return
        p=np.asarray(self.points);mid=(p.min(axis=0)+p.max(axis=0))/2;size=np.ptp(p,axis=0)
        m=copy.deepcopy(self.original) if self.original else Magnet(name=self.name,grade=self.new_grade,remanence_T=self.new_remanence)
        m.shape='prism';m.contour_plane=self.plane;m.size[self.ia]=float(size[0]);m.size[self.ib]=float(size[1]);m.size[self.ic]=depth;m.polygon=(p-mid).tolist()
        # Local coordinates remain at the same world positions when recentered.
        shift=np.zeros(3);shift[self.ia]=mid[0];shift[self.ib]=mid[1];m.center=(np.asarray(m.center)+shift).tolist()
        self.app.snapshot()
        if self.index is None:self.app.magnets.append(m);self.app.selected=len(self.app.magnets)-1
        else:self.app.magnets[self.index]=m;self.app.selected=self.index
        self.app.refresh(True,True);self.destroy()


class UnifiedIntegratedApp(IntegratedApp):
    """Single-window CAD, ROI requirements, live verdict and geometry optimisation."""

    def __init__(self):
        self._dashboard_ready = False
        self._live_job = None
        self.optimization_preview = None
        super().__init__()
        self._dashboard_ready = True
        self.schedule_live_passport(150)

    def _build_ui(self):
        super()._build_ui()
        return

        # self.inspector уже уничтожен в MagneticApp._build_ui.
        # Берем сохраненные контейнеры, а не первый дочерний виджет окна:
        # первым дочерним элементом Tk может оказаться Menu.
        main_pw = getattr(self, 'main_paned', None)
        host = getattr(self, 'right_settings_frame', None)
        far_right = getattr(self, 'roi_report_frame', None)
        if main_pw is None or host is None or far_right is None:
            panes = []
            for child in self.winfo_children():
                if hasattr(child, 'panes'):
                    main_pw = child
                    panes = child.panes()
                    break
            if main_pw is None or len(panes) < 4:
                raise RuntimeError('Не удалось найти главные панели интерфейса.')
            host = main_pw.nametowidget(panes[2])
            far_right = main_pw.nametowidget(panes[3])

        host.configure(width=405)

        # Находим существующие панели внутри Canvas, чтобы не дублировать их
        panel = getattr(self, 'right_scroll_panel', None)
        left_panel = getattr(self, 'left_scroll_panel', None)

        for child in host.winfo_children():
            if isinstance(child, tk.Canvas):
                for sub in child.winfo_children():
                    if isinstance(sub, ttk.Frame):
                        panel = sub
                        break

        left_host = self.tree.master
        for child in left_host.winfo_children():
            if isinstance(child, tk.Canvas):
                for sub in child.winfo_children():
                    if isinstance(sub, ttk.Frame):
                        left_panel = sub
                        break

        # Fallback: если по какой-то причине панели не нашлись, создаем их заново
        if not panel:
            right_canvas = tk.Canvas(host, highlightthickness=0, width=385)
            scrollbar = ttk.Scrollbar(host, orient='vertical', command=right_canvas.yview)
            panel = ttk.Frame(right_canvas, padding=(7, 4, 8, 8))
            window_id = right_canvas.create_window((0, 0), window=panel, anchor='nw')
            right_canvas.configure(yscrollcommand=scrollbar.set)
            self.right_scroll_canvas = right_canvas
            self.right_scroll_panel = panel
            right_canvas.pack(side='left', fill='both', expand=True)
            scrollbar.pack(side='right', fill='y')
            panel.bind('<Configure>', lambda e: right_canvas.configure(scrollregion=right_canvas.bbox('all')))
            right_canvas.bind('<Configure>', lambda e: right_canvas.itemconfigure(window_id, width=e.width))

        if not left_panel:
            left_canvas = tk.Canvas(left_host, highlightthickness=0, width=320)
            left_scroll = ttk.Scrollbar(left_host, orient='vertical', command=left_canvas.yview)
            left_panel = ttk.Frame(left_canvas, padding=(2, 2, 6, 8))
            left_window = left_canvas.create_window((0, 0), window=left_panel, anchor='nw')
            left_canvas.configure(yscrollcommand=left_scroll.set)
            self.left_scroll_canvas = left_canvas
            self.left_scroll_panel = left_panel
            left_canvas.pack(side='left', fill='both', expand=True)
            left_scroll.pack(side='right', fill='y')
            left_panel.bind('<Configure>', lambda e: left_canvas.configure(scrollregion=left_canvas.bbox('all')))
            left_canvas.bind('<Configure>', lambda e: left_canvas.itemconfigure(left_window, width=e.width))

        # Привязываем колесо мыши к найденным панелям
        self._wheel_areas = [
            (getattr(self, 'left_scroll_canvas', left_host), left_panel),
            (getattr(self, 'right_scroll_canvas', host), panel),
        ]
        self.bind_all('<MouseWheel>', self._route_panel_wheel, add='+')
        self.bind_all('<Button-4>', self._route_panel_wheel, add='+')
        self.bind_all('<Button-5>', self._route_panel_wheel, add='+')

        # === ДАЛЕЕ ИДЕТ ОРИГИНАЛЬНЫЙ КОД СОЗДАНИЯ ВИДЖЕТОВ ===

        ttk.Label(panel, text='ЕДИНЫЙ РАБОЧИЙ СТОЛ ЯМР', style='Section.TLabel').pack(anchor='w', pady=(2, 6))

        # Бейдж статуса теперь над паспортом в 4-й панели
        self.live_badge = tk.Label(far_right, text='● Ожидание расчёта', anchor='w', font=('Segoe UI', 11, 'bold'),
                                   bg='#eceff1', fg='#455a64', padx=9, pady=7)
        self.live_badge.pack(fill='x', pady=(0, 7))

        magnet_box = ttk.LabelFrame(left_panel, text='Настройка выбранного магнита', padding=7)
        magnet_box.pack(fill='x', pady=4)

        def property_row(label, key, values=None):
            row = ttk.Frame(magnet_box)
            row.pack(fill='x', pady=2)
            ttk.Label(row, text=label, width=17).pack(side='left')
            if values is None:
                w = ttk.Entry(row, textvariable=self.vars[key])
            else:
                w = ttk.Combobox(row, textvariable=self.vars[key], values=values, state='readonly')
            w.pack(side='left', fill='x', expand=True)
            w.bind('<Return>', lambda e: self.apply_properties_and_recalculate())
            if values is not None: w.bind('<<ComboboxSelected>>', lambda e: self.apply_properties_and_recalculate())

        property_row('Имя', 'name')
        coordinates = ttk.Frame(magnet_box)
        coordinates.pack(fill='x', pady=2)
        for label, key in [('X', 'x'), ('Y', 'y'), ('Z', 'z')]:
            ttk.Label(coordinates, text=label).pack(side='left')
            entry = ttk.Entry(coordinates, textvariable=self.vars[key], width=7)
            entry.pack(side='left', padx=(2, 5))
            entry.bind('<Return>', lambda e: self.apply_properties_and_recalculate())

        dimensions = ttk.Frame(magnet_box)
        dimensions.pack(fill='x', pady=2)
        for label, key in [('SX', 'sx'), ('SY', 'sy'), ('SZ', 'sz')]:
            ttk.Label(dimensions, text=label).pack(side='left')
            entry = ttk.Entry(dimensions, textvariable=self.vars[key], width=7)
            entry.pack(side='left', padx=(2, 5))
            entry.bind('<Return>', lambda e: self.apply_properties_and_recalculate())

        property_row('Форма', 'shape', ('box', 'cylinder', 'sphere', 'prism'))
        property_row('Марка NdFeB', 'grade', tuple(GRADES))
        property_row('Br вручную, Тл', 'br_manual')
        property_row('M: S → N', 'direction', tuple(DIRS))
        property_row('Ось цилиндра', 'axis', ('x', 'y', 'z'))

        ttk.Button(magnet_box, text='Применить магнит и пересчитать', command=self.apply_properties_and_recalculate,
                   style='Accent.TButton').pack(fill='x', pady=(6, 1))

        self.info = ttk.Label(magnet_box, text='', justify='left', foreground='#555')
        self.info.pack(anchor='w', pady=(4, 1))

        ttk.Button(magnet_box, text='Расстояние и угол двух магнитов…', command=self.pair_dialog).pack(fill='x',
                                                                                                       pady=(5, 2))

        ttk.Label(left_panel,
                  text='ЛКМ — выбрать и перетащить магнит\nКолесо — прокрутка этой панели\nПКМ в 3D — вращение камеры',
                  justify='left', foreground='#555').pack(anchor='w', pady=7)

        roi_box = ttk.LabelFrame(panel, text='2. Рабочий объём и эксперимент', padding=7)
        roi_box.pack(fill='x', pady=4)

        self.nmrvars = {
            'profile': tk.StringVar(value='Мышца L5-S1 / T2 CPMG'), 'nucleus': tk.StringVar(value='1H (протон)'),
            'frequency': tk.StringVar(value='8.38'), 'bandwidth': tk.StringVar(value='43'),
            'grid': tk.StringVar(value='7'),
            'cx': tk.StringVar(value=self.fieldvars['px'].get()), 'cy': tk.StringVar(value=self.fieldvars['py'].get()),
            'cz': tk.StringVar(value=self.fieldvars['pz'].get()),
            'sx': tk.StringVar(value='6.7'), 'sy': tk.StringVar(value='6.7'), 'sz': tk.StringVar(value='1.5'),
            'surface_mode': tk.BooleanVar(value=True), 'surface_plane': tk.StringVar(value='XY'),
            'surface_side': tk.StringVar(value='+'), 'surface_depth': tk.StringVar(value='8'),
            'surface_thickness': tk.StringVar(value='1.5'),
            'map_mode': tk.StringVar(value='|B0|, мТл'),
            'min_b0_mT': tk.StringVar(), 'max_ppm': tk.StringVar(), 'max_angle_deg': tk.StringVar(),
            'max_nonlinearity_pct': tk.StringVar(), 'min_gradient_T_m': tk.StringVar(),
        }

        def nmr_row(label, key, values=None):
            row = ttk.Frame(roi_box)
            row.pack(fill='x', pady=2)
            ttk.Label(row, text=label, width=20).pack(side='left')
            w = (ttk.Combobox(row, textvariable=self.nmrvars[key], values=values,
                              state='readonly') if values else ttk.Entry(row, textvariable=self.nmrvars[key]))
            w.pack(side='right', fill='x', expand=True)
            w.bind('<KeyRelease>', lambda e: self.schedule_live_passport())
            if values: w.bind('<<ComboboxSelected>>',
                              lambda e: self.profile_changed() if key == 'profile' else self.schedule_live_passport())

        nmr_row('Профиль', 'profile', tuple(NMR_PROFILES))
        nmr_row('Ядро', 'nucleus', tuple(NUCLEI_GAMMA_HZ_T))
        nmr_row('Частота, МГц', 'frequency')
        nmr_row('Полная RF-полоса, кГц', 'bandwidth')

        ttk.Label(roi_box, text='Центр ROI, мм', foreground='#455a64').pack(anchor='w', pady=(5, 1))
        row = ttk.Frame(roi_box)
        row.pack(fill='x')
        for label, key in [('X', 'cx'), ('Y', 'cy'), ('Z', 'cz')]:
            ttk.Label(row, text=label).pack(side='left')
            e = ttk.Entry(row, textvariable=self.nmrvars[key], width=8)
            e.pack(side='left', padx=(2, 6))
            e.bind('<KeyRelease>', lambda event: self.schedule_live_passport())

        ttk.Label(roi_box, text='Размер ROI, мм', foreground='#455a64').pack(anchor='w', pady=(5, 1))
        row = ttk.Frame(roi_box)
        row.pack(fill='x')
        for label, key in [('X', 'sx'), ('Y', 'sy'), ('Z', 'sz')]:
            ttk.Label(row, text=label).pack(side='left')
            e = ttk.Entry(row, textvariable=self.nmrvars[key], width=8)
            e.pack(side='left', padx=(2, 6))
            e.bind('<KeyRelease>', lambda event: self.schedule_live_passport())

        ttk.Checkbutton(roi_box, text='Поверхностный ROI (образец снаружи системы)',
                        variable=self.nmrvars['surface_mode'], command=self.surface_layout_changed).pack(anchor='w',
                                                                                                         pady=(7, 2))

        row = ttk.Frame(roi_box)
        row.pack(fill='x', pady=2)
        ttk.Label(row, text='Плоскость поверхности').pack(side='left')
        surface_plane = ttk.Combobox(row, textvariable=self.nmrvars['surface_plane'], values=tuple(PLANES),
                                     state='readonly', width=7)
        surface_plane.pack(side='right')
        surface_plane.bind('<<ComboboxSelected>>', lambda e: self.surface_layout_changed())

        row = ttk.Frame(roi_box)
        row.pack(fill='x', pady=2)
        ttk.Label(row, text='Сторона образца').pack(side='left')
        surface_side = ttk.Combobox(row, textvariable=self.nmrvars['surface_side'], values=('+', '-'), state='readonly',
                                    width=7)
        surface_side.pack(side='right')
        surface_side.bind('<<ComboboxSelected>>', lambda e: self.surface_layout_changed())

        row = ttk.Frame(roi_box)
        row.pack(fill='x', pady=2)
        ttk.Label(row, text='Глубина центра, мм').pack(side='left')
        depth_entry = ttk.Entry(row, textvariable=self.nmrvars['surface_depth'], width=9)
        depth_entry.pack(side='right')
        depth_entry.bind('<KeyRelease>', lambda e: self.schedule_live_passport())

        row = ttk.Frame(roi_box)
        row.pack(fill='x', pady=2)
        ttk.Label(row, text='Толщина по нормали, мм').pack(side='left')
        thick_entry = ttk.Entry(row, textvariable=self.nmrvars['surface_thickness'], width=9)
        thick_entry.pack(side='right')
        thick_entry.bind('<KeyRelease>', lambda e: self.schedule_live_passport())

        nmr_row('Сетка на ось 3…11', 'grid')

        ttk.Button(roi_box, text='Выбрать ROI мышью на 2D…', command=self.start_unified_roi_selection).pack(fill='x',
                                                                                                            pady=(6, 2))

        criteria = ttk.LabelFrame(panel, text='3. Требования пригодности', padding=7)
        criteria.pack(fill='x', pady=4)
        for label, key in [('Минимум B0, мТл', 'min_b0_mT'), ('Макс. ΔB, ppm p-p', 'max_ppm'),
                           ('Макс. поворот B0, °', 'max_angle_deg'),
                           ('Макс. нелинейность G, %', 'max_nonlinearity_pct'),
                           ('Минимум |G|, Тл/м', 'min_gradient_T_m')]:
            row = ttk.Frame(criteria)
            row.pack(fill='x', pady=2)
            ttk.Label(row, text=label, width=23).pack(side='left')
            e = ttk.Entry(row, textvariable=self.nmrvars[key], width=11)
            e.pack(side='right')
            e.bind('<KeyRelease>', lambda event: self.schedule_live_passport())

        actions = ttk.LabelFrame(panel, text='4. Расчёт и оптимизация', padding=7)
        actions.pack(fill='x', pady=4)

        map_row = ttk.Frame(actions)
        map_row.pack(fill='x', pady=2)
        ttk.Label(map_row, text='Карта поля').pack(side='left')
        map_box = ttk.Combobox(map_row, textvariable=self.nmrvars['map_mode'],
                               values=('|B0|, мТл', 'ΔB, ppm', 'Bx, мТл', 'By, мТл', 'Bz, мТл'), state='readonly',
                               width=16)
        map_box.pack(side='right')
        map_box.bind('<<ComboboxSelected>>', lambda e: self.show_surface_b0_map())

        ttk.Button(actions, text='Показать карту B0 на поверхности', command=self.show_surface_b0_map).pack(fill='x',
                                                                                                            pady=2)
        ttk.Button(actions, text='Пересчитать сейчас', command=lambda: self.live_passport(True),
                   style='Accent.TButton').pack(fill='x', pady=2)
        ttk.Button(actions, text='Найти лучшее место ROI', command=self.unified_find_roi).pack(fill='x', pady=2)
        ttk.Button(actions, text='МАКСИМИЗИРОВАТЬ пригодный объём', command=self.maximize_usable_volume).pack(fill='x',
                                                                                                              pady=2)
        ttk.Button(actions, text='ВЫРОВНЯТЬ B0 / оптимизировать однородность', command=self.optimize_homogeneity).pack(
            fill='x', pady=2)

        self.apply_optimization_button = ttk.Button(actions, text='Применить зелёную геометрию',
                                                    command=self.apply_optimization_preview, state='disabled')
        self.apply_optimization_button.pack(fill='x', pady=2)

        ttk.Label(actions,
                  text='Оптимизация сначала показывается зелёным каркасом в 3D и не меняет проект без подтверждения.',
                  wraplength=350, foreground='#555').pack(anchor='w', pady=(5, 1))

        # ===== ВИЗУАЛЬНЫЙ ПАСПОРТ ROI =====
        result_box = ttk.LabelFrame(far_right, text='Живой паспорт ROI', padding=4)
        result_box.pack(fill='both', expand=True, pady=4)

        self.visual_panel = ttk.Frame(result_box, padding=6)
        self.visual_panel.pack(fill='both', expand=True)

        self.report = tk.Text(self, height=1, width=1)
        self._last_report_text = ''

        copy_row = ttk.Frame(far_right)
        copy_row.pack(fill='x', pady=(0, 5))
        ttk.Button(copy_row, text='Копировать отчёт', command=self.copy_roi_report).pack(side='left', fill='x',
                                                                                         expand=True)
        ttk.Button(copy_row, text='Сохранить в файл', command=self._save_visual_report).pack(side='left', padx=4)

        self.report_menu = tk.Menu(self, tearoff=False)
        self.report_menu.add_command(label='Копировать отчёт', command=self.copy_roi_report)
        self.report_menu.add_command(label='Сохранить в файл', command=self._save_visual_report)

        self.profile_changed()

    def _route_panel_wheel(self, event):
        """Scroll whichever settings column is currently under the mouse pointer."""
        target = self.winfo_containing(event.x_root, event.y_root)
        if isinstance(target, tk.Text): return  # let the report use its own scrollbar
        widget = target
        while widget is not None:
            try:
                if isinstance(widget, ttk.Combobox) or widget.winfo_class() == 'TCombobox':
                    return 'break'
            except tk.TclError:
                break
            widget = getattr(widget, 'master', None)
        for canvas, content in getattr(self, '_wheel_areas', []):
            widget = target
            while widget is not None:
                if widget is canvas or widget is content:
                    if getattr(event, 'num', None) == 4:
                        steps = -1
                    elif getattr(event, 'num', None) == 5:
                        steps = 1
                    else:
                        delta = getattr(event, 'delta', 0)
                        if delta == 0: return
                        steps = -1 if delta > 0 else 1
                        if abs(delta) >= 240: steps *= max(1, abs(delta) // 120)
                    canvas.yview_scroll(int(steps), 'units')
                    return 'break'
                widget = getattr(widget, 'master', None)

    def copy_roi_report(self, selected=False):
        text = getattr(self, '_last_report_text', '')
        if not text.strip():
            messagebox.showinfo('Копирование', 'Отчёт ROI пока пуст.',
                                parent=self)
            return
        self.clipboard_clear()
        self.clipboard_append(text)
        self.update_idletasks()
        self.status.set('Отчёт ROI скопирован в буфер обмена')

    def select_all_roi_report(self):
        self.report.tag_add('sel', '1.0', 'end-1c');
        self.report.mark_set('insert', '1.0');
        self.report.see('1.0');
        self.report.focus_set()

    def show_roi_report_menu(self, event):
        try:
            self.report_menu.tk_popup(event.x_root, event.y_root)
        finally:
            self.report_menu.grab_release()

    def profile_changed(self):
        profile = NMR_PROFILES[self.nmrvars['profile'].get()]
        for key, value in profile.items(): self.nmrvars[key].set(f'{value:g}')
        if self.nmrvars['profile'].get() == 'Мышца L5-S1 / T2 CPMG':
            self.nmrvars['frequency'].set('8.38');
            self.nmrvars['bandwidth'].set('43')
            self.nmrvars['surface_mode'].set(True);
            self.nmrvars['surface_depth'].set('8');
            self.nmrvars['surface_thickness'].set('1.5')
        self.schedule_live_passport(100)

    def surface_layout_changed(self):
        if self.nmrvars['surface_mode'].get():
            self.plane.set(self.nmrvars['surface_plane'].get())
            self.refresh(True, True)
        self.schedule_live_passport(80)

    def _surface_constraint(self):
        if not self.nmrvars['surface_mode'].get(): return None
        plane = self.nmrvars['surface_plane'].get();
        normal = AX[PLANES[plane][2]]
        sign = 1 if self.nmrvars['surface_side'].get() == '+' else -1
        depth = float(self.nmrvars['surface_depth'].get().replace(',', '.'))
        thickness = float(self.nmrvars['surface_thickness'].get().replace(',', '.'))
        if depth <= 0 or thickness <= 0: raise ValueError(
            'Глубина и толщина поверхностного ROI должны быть положительными.')
        faces = [magnet_bounds(m)[1 if sign > 0 else 0][normal] for m in self.magnets if m.visible]
        if not faces: raise ValueError('Нет видимых магнитов для определения поверхности.')
        surface = max(faces) if sign > 0 else min(faces)
        return {'plane': plane, 'axis': normal, 'sign': sign, 'depth_mm': depth,
                'thickness_mm': thickness, 'surface_coordinate_mm': float(surface),
                'centre_coordinate_mm': float(surface + sign * depth)}

    def _update_surface_slice_cache(self, centre, size, surface):
        """Keep the main 2D view synchronized with the selected sample plane."""
        plane = surface['plane'];
        self.plane.set(plane)
        a, b, f = PLANES[plane];
        ia, ib, ic = AX[a], AX[b], AX[f]
        scene_lo,scene_hi=scene_bounds(self.magnets)
        roi_lo=centre-size/2;roi_hi=centre+size/2
        scene_lo=np.minimum(scene_lo,roi_lo);scene_hi=np.maximum(scene_hi,roi_hi)
        span=np.maximum(scene_hi-scene_lo,12.0);padding=np.maximum(span*.22,5.0)
        lo,hi=scene_lo-padding,scene_hi+padding
        self.volume_bounds=(lo.copy(),hi.copy())
        us = np.linspace(lo[ia], hi[ia], 81);
        vs = np.linspace(lo[ib], hi[ib], 81);
        u, v = np.meshgrid(us, vs)
        points = np.tile(centre, (u.size, 1));
        points[:, ia] = u.ravel();
        points[:, ib] = v.ravel();
        points[:, ic] = centre[ic]
        vectors = field_B(self.magnets, points, density=5);
        vectors[self._inside(points)] = np.nan
        self.field_cache = (us, vs, points, vectors, (ia, ib, ic));
        self.fieldvars['offset'].set(f'{centre[ic]:.6g}')

    def _dashboard_inputs(self):
        number = lambda key: float(self.nmrvars[key].get().replace(',', '.'))
        centre = np.array([number(k) for k in ('cx', 'cy', 'cz')]);
        size = np.array([number(k) for k in ('sx', 'sy', 'sz')])
        if not np.all(np.isfinite(centre)) or not np.all(np.isfinite(size)) or np.min(size) <= 0: raise ValueError(
            'ROI: размеры должны быть положительными числами.')
        surface = self._surface_constraint()
        if surface is not None:
            normal = surface['axis'];
            centre[normal] = surface['centre_coordinate_mm'];
            size[normal] = surface['thickness_mm']
            centre_key = ('cx', 'cy', 'cz')[normal];
            size_key = ('sx', 'sy', 'sz')[normal]
            self.nmrvars[centre_key].set(f'{centre[normal]:.6g}');
            self.nmrvars[size_key].set(f'{size[normal]:.6g}')
        grid = int(number('grid'))
        if not 3 <= grid <= 11: raise ValueError('Сетка ROI должна быть от 3 до 11.')
        limits = {k: number(k) for k in
                  ('min_b0_mT', 'max_ppm', 'max_angle_deg', 'max_nonlinearity_pct', 'min_gradient_T_m')}
        if min(limits.values()) < 0: raise ValueError('Критерии не могут быть отрицательными.')
        frequency = number('frequency');
        bandwidth = number('bandwidth')
        if frequency <= 0 or bandwidth <= 0: raise ValueError('Частота и RF-полоса должны быть положительными.')
        return centre, size, grid, limits, frequency, bandwidth

    def schedule_live_passport(self, delay=450):
        if not getattr(self, '_dashboard_ready', False): return
        if self._live_job is not None: self.after_cancel(self._live_job)
        self._live_job = self.after(delay, self.live_passport)

    def apply_properties_and_recalculate(self):
        self.apply_properties();
        self.optimization_preview = None
        if hasattr(self, 'apply_optimization_button'): self.apply_optimization_button.config(state='disabled')
        self.schedule_live_passport(80)

    def live_passport(self, full=False):
        self._live_job = None
        try:
            centre, size, grid, limits, frequency, bandwidth = self._dashboard_inputs()
            self.status.set('Живой пересчёт поля во всём ROI…')
            self.update_idletasks()
            metrics = nmr_roi_metrics(self.magnets, centre, size,
                                      self.nmrvars['nucleus'].get(),
                                      grid if full else min(grid, 7))
            text, decision = build_nmr_report(metrics,
                                              self.nmrvars['profile'].get(),
                                              frequency, bandwidth, limits)

            volume = float(np.prod(size))
            passed = sum(item['passed'] for item in decision['criteria'])
            total = len(decision['criteria'])
            surface = self._surface_constraint()
            surface_line = (
                f"Поверхностный ROI: плоскость {surface['plane']}, "
                f"сторона {'+' if surface['sign'] > 0 else '-'}, "
                f"поверхность {surface['surface_coordinate_mm']:.3f} мм, "
                f"центр на глубине {surface['depth_mm']:.3f} мм\n"
                if surface is not None else 'ROI свободно расположен в объёме XYZ\n')
            summary = (
                f"{'ПОДХОДИТ' if decision['suitable'] else 'НЕ ПОДХОДИТ'} • "
                f"ROI {volume:.1f} мм³ • критерии {passed}/{total}\n"
                f"{surface_line}"
                f"B0 min/mean/max: {metrics['b_min_T'] * 1000:.3f} / "
                f"{metrics['b_mean_T'] * 1000:.3f} / "
                f"{metrics['b_max_T'] * 1000:.3f} мТл\n"
                f"Разброс: {metrics['b_span_T'] * 1000:.3f} мТл = "
                f"{metrics['ppm_p2p']:.0f} ppm p-p\n"
                f"Частота центра: {metrics['f_mean_MHz']:.6f} МГц; "
                f"диапазон: {metrics['f_span_kHz']:.3f} кГц\n"
                f"Поворот B0: max {metrics['angle_max_deg']:.2f}°; "
                f"|G| центра: {metrics['gradient_norm_T_m']:.4f} Тл/м\n\n")

            self._last_report_text = summary + text
            self.report.config(state='normal')
            self.report.delete('1.0', 'end')
            self.report.insert('1.0', self._last_report_text)
            self.report.config(state='disabled')

            colour = ('#dff5e7', '#08783e') if decision['suitable'] else ('#ffe5e5', '#b71c1c')
            self.live_badge.config(
                text=('● ПОДХОДИТ ПО ЗАДАННЫМ КРИТЕРИЯМ'
                      if decision['suitable']
                      else '● НЕ ПОДХОДИТ — СМ. КРАСНЫЕ КАРТОЧКИ НИЖЕ'),
                bg=colour[0], fg=colour[1])

            self._render_visual_passport(metrics, decision, surface)

            self.last_nmr_report = {'text': self._last_report_text,
                                    'metrics': metrics,
                                    'decision': decision}
            if surface is not None:
                self._update_surface_slice_cache(centre, size, surface)
            self.set_nmr_roi_visualization(metrics, decision)
            for key, value in zip(('px', 'py', 'pz'), centre):
                self.fieldvars[key].set(f'{value:.6g}')
            self.fieldvars['frequency'].set(f'{frequency:g}')
            self.fieldvars['bandwidth'].set(f'{bandwidth:g}')
            self.status.set('ROI пересчитан автоматически после изменения параметров')
        except Exception as e:
            self.live_badge.config(text='● НУЖНЫ КОРРЕКТНЫЕ ПАРАМЕТРЫ',
                                   bg='#fff3cd', fg='#7a5700')
            self._last_report_text = str(e)
            self.report.config(state='normal')
            self.report.delete('1.0', 'end')
            self.report.insert('1.0', str(e))
            self.report.config(state='disabled')

            try:
                for child in self.visual_panel.winfo_children():
                    child.destroy()
                err_frame = tk.Frame(self.visual_panel, bg='#fff3cd',
                                     highlightbackground='#ff9800',
                                     highlightthickness=1)
                err_frame.pack(fill='x', pady=6)
                tk.Label(err_frame, text='Ошибка расчёта:',
                         bg='#fff3cd', fg='#7a5700',
                         font=('Segoe UI', 10, 'bold'),
                         anchor='w').pack(fill='x', padx=8, pady=6)
                tk.Label(err_frame, text=str(e),
                         bg='#fff3cd', fg='#5d4037',
                         font=('Segoe UI', 9), anchor='w',
                         justify='left', wraplength=310).pack(
                    fill='x', padx=8, pady=8)
            except Exception:
                pass

    def _render_visual_passport(self, metrics, decision, surface):
        """Draw a compact bottom ROI passport: verdict plus key engineering numbers."""
        for child in self.visual_panel.winfo_children():
            child.destroy()

        ok = decision['suitable']
        head_bg = '#dff5e7' if ok else '#ffe5e5'
        head_fg = '#08783e' if ok else '#b71c1c'
        head = tk.Frame(self.visual_panel, bg=head_bg,
                        highlightbackground=head_fg, highlightthickness=2)
        head.pack(side='left', fill='y', padx=(0, 6))
        tk.Label(head,
                 text=('✓ ПОДХОДИТ' if ok else '✗ НЕ ПОДХОДИТ'),
                 bg=head_bg, fg=head_fg,
                 font=('Segoe UI', 9, 'bold'),
                 padx=7, pady=3).pack(fill='x')
        passed = sum(1 for c in decision['criteria'] if c['passed'])
        total = len(decision['criteria'])
        tk.Label(head,
                 text=f'ROI {np.prod(metrics["size_mm"]):.1f} мм³\nкритерии {passed}/{total}',
                 bg=head_bg, fg=head_fg,
                 font=('Segoe UI', 8), padx=7, pady=3,
                 justify='center').pack(fill='x')

        body = ttk.Frame(self.visual_panel)
        body.pack(side='left', fill='both', expand=True)
        # Criteria and advice contain sentences and need more width; numeric
        # columns remain narrower. This prevents clipped text on common screens.
        for i, weight in enumerate((14, 10, 10, 11, 14)):
            body.columnconfigure(i, weight=weight)

        criteria_col = ttk.Frame(body)
        field_col = ttk.Frame(body)
        rf_col = ttk.Frame(body)
        gradient_col = ttk.Frame(body)
        advice_col = ttk.Frame(body)
        for i, col in enumerate((criteria_col, field_col, rf_col, gradient_col, advice_col)):
            col.grid(row=0, column=i, sticky='nsew', padx=(1, 2))

        self._section_label(criteria_col, 'КРИТЕРИИ')
        for crit in decision['criteria']:
            self._criterion_card(crit['name'], crit['passed'], criteria_col)

        self._section_label(field_col, 'ПОЛЕ B0')
        self._kv_row('Среднее',
                     f"{metrics['b_mean_T'] * 1000:.2f} мТл", '#0d47a1', field_col)
        self._kv_row('Мин / Макс',
                     f"{metrics['b_min_T'] * 1000:.1f} / "
                     f"{metrics['b_max_T'] * 1000:.1f} мТл", '#455a64', field_col)
        self._kv_row('Разброс',
                     f"{metrics['b_span_T'] * 1000:.3f} мТл "
                     f"({metrics['ppm_p2p']:.0f} ppm)",
                     '#b71c1c' if metrics['ppm_p2p'] > 50000 else '#08783e', field_col)
        self._kv_row('Поворот B0',
                     f"{metrics['angle_max_deg']:.2f}°", '#455a64', field_col)

        self._section_label(rf_col, 'RF И РЕЗОНАНС')
        self._kv_row('Лармор в центре',
                     f"{metrics['f_centre_MHz']:.4f} МГц", '#0d47a1', rf_col)
        try:
            freq_set = float(self.nmrvars['frequency'].get().replace(',', '.'))
        except Exception:
            freq_set = float('nan')
        self._kv_row('Заданная частота',
                     f"{freq_set:.4f} МГц", '#455a64', rf_col)
        self._kv_row('Разброс частот',
                     f"{metrics['f_span_kHz']:.1f} кГц",
                     '#b71c1c' if metrics['f_span_kHz'] > 1000 else '#08783e', rf_col)

        self._section_label(gradient_col, 'ГРАДИЕНТ / СБОРКА')
        self._kv_row('|G|',
                     f"{metrics['gradient_norm_T_m']:.3f} Тл/м", '#0d47a1', gradient_col)
        self._kv_row('Нелинейность',
                     f"{metrics['gradient_nonlinearity_pct']:.3f}%",
                     '#455a64', gradient_col)
        if np.isfinite(decision.get('slice_thickness_mm', math.inf)):
            self._kv_row('Толщина среза',
                         f"{decision['slice_thickness_mm']:.3f} мм", '#0d47a1', gradient_col)
        self._kv_row('Магнитов', f"{metrics['magnet_count']}", '#455a64', gradient_col)
        self._kv_row('Объём',
                     f"{metrics['magnet_volume_cm3']:.2f} см³", '#455a64', gradient_col)
        if surface is not None:
            self._kv_row('Поверхность',
                         f"{surface['plane']} / "
                         f"{surface['surface_coordinate_mm']:.1f} мм",
                         '#455a64', gradient_col)
            self._kv_row('Глубина центра',
                         f"{surface['depth_mm']:.1f} мм", '#455a64', gradient_col)

        if not ok:
            self._section_label(advice_col, 'ЧТО ИСПРАВИТЬ')
            for line in self._failure_advice(metrics, decision)[:3]:
                frame = tk.Frame(advice_col, bg='#fff3e0',
                                 highlightbackground='#ff9800',
                                 highlightthickness=1)
                frame.pack(fill='x', pady=1)
                tk.Label(frame, text='→', bg='#fff3e0', fg='#e65100',
                         font=('Segoe UI', 10, 'bold'),
                         width=2).pack(side='left')
                tk.Label(frame, text=line, bg='#fff3e0', fg='#5d4037',
                         font=('Segoe UI', 7), anchor='w',
                         justify='left', wraplength=230).pack(
                    side='left', fill='x', expand=True, padx=3, pady=2)

    def _section_label(self, parent, text):
        tk.Label(parent, text=text, font=('Segoe UI', 7, 'bold'),
                 fg='#37474f', anchor='w').pack(fill='x', pady=(0, 1))

    def _criterion_card(self, name, passed, parent=None):
        parent = parent or self.visual_panel
        bg = '#dff5e7' if passed else '#ffe5e5'
        fg = '#08783e' if passed else '#b71c1c'
        bd = '#00a65a' if passed else '#d32f2f'
        icon = '✓' if passed else '✗'
        frame = tk.Frame(parent, bg=bg,
                         highlightbackground=bd, highlightthickness=1)
        frame.pack(fill='x', pady=1)
        tk.Label(frame, text=icon, bg=bg, fg=fg,
                 font=('Segoe UI', 8, 'bold'),
                 width=2).pack(side='left')
        tk.Label(frame, text=name, bg=bg, fg=fg,
                 font=('Segoe UI', 7), anchor='w', justify='left',
                 wraplength=245).pack(side='left', fill='x',
                                      expand=True, padx=2, pady=1)

    def _kv_row(self, key, value, colour='#263238', parent=None):
        parent = parent or self.visual_panel
        frame = tk.Frame(parent, bg='#ffffff',
                         highlightbackground='#e0e0e0',
                         highlightthickness=1)
        frame.pack(fill='x', pady=1)
        tk.Label(frame, text=key, bg='#ffffff', fg='#546e7a',
                 font=('Segoe UI', 7), anchor='w',
                 width=12).pack(side='left', padx=2, pady=1)
        tk.Label(frame, text=value, bg='#ffffff', fg=colour,
                 font=('Consolas', 7, 'bold'), anchor='w',
                 justify='left').pack(side='left', fill='x',
                                      expand=True, padx=2, pady=1)

    def _failure_advice(self, metrics, decision):
        advice = []
        freq_set = float(self.nmrvars['frequency'].get().replace(',', '.'))
        delta = metrics['f_centre_MHz'] - freq_set
        if abs(delta) * 1000 > float(self.nmrvars['bandwidth'].get()
                                             .replace(',', '.')) / 2:
            advice.append(
                f"Перенастройте RF с {freq_set:.3f} на "
                f"{metrics['f_centre_MHz']:.3f} МГц")
        slice_mm = decision.get('slice_thickness_mm', math.inf)
        if np.isfinite(slice_mm):
            if slice_mm < 0.3:
                advice.append(
                    f"Срез слишком тонкий ({slice_mm:.3f} мм). "
                    "Расширьте полосу до 200–800 кГц")
            elif slice_mm > 3.0:
                advice.append(
                    f"Срез слишком толстый ({slice_mm:.3f} мм). "
                    "Сузьте полосу или усильте градиент")
        if metrics['angle_max_deg'] > float(
                self.nmrvars['max_angle_deg'].get().replace(',', '.')):
            advice.append("Поворот B0 слишком большой. Сдвиньте ROI "
                          "к оси симметрии сборки")
        if not advice:
            advice.append("Откройте текстовый отчёт для подробностей")
        return advice

    def _save_visual_report(self):
        if not self._last_report_text:
            messagebox.showinfo('Сохранение',
                                'Сначала рассчитайте паспорт.', parent=self)
            return
        path = filedialog.asksaveasfilename(
            parent=self, defaultextension='.txt',
            filetypes=[('Текстовый отчёт', '*.txt'), ('Все файлы', '*.*')])
        if path:
            Path(path).write_text(self._last_report_text, encoding='utf-8')
            self.status.set(f'Отчёт сохранён: {path}')

    def refresh(self, all_views=False, fit=False):
        super().refresh(all_views, fit)
        if getattr(self, '_dashboard_ready', False): self.schedule_live_passport()

    def start_unified_roi_selection(self):
        try:
            centre, size, _, _, _, _ = self._dashboard_inputs();
            plane = self.plane.get();
            third = AX[PLANES[plane][2]]
            offset = simpledialog.askfloat(f'ROI в плоскости {plane}', f'Координата {PLANES[plane][2].upper()}, мм:',
                                           initialvalue=centre[third], parent=self)
            if offset is None: return
            thickness = simpledialog.askfloat('Толщина ROI', f'Толщина вдоль {PLANES[plane][2].upper()}, мм:',
                                              initialvalue=size[third], minvalue=.001, parent=self)
            if thickness is None: return
            centre[third] = offset;
            size[third] = thickness
            for key, value in zip(('cx', 'cy', 'cz'), centre): self.nmrvars[key].set(f'{value:g}')
            for key, value in zip(('sx', 'sy', 'sz'), size): self.nmrvars[key].set(f'{value:g}')
            self._unified_roi_third = third;
            self.roi_select_mode = True;
            self.roi_drag_start = None;
            self.tabs.select(self.v2)
            self.status.set('ROI: протяните ЛКМ прямоугольник на 2D-карте')
        except Exception as e:
            messagebox.showerror('Выбор ROI', str(e), parent=self)

    def _finish_roi_selection(self, event):
        if not hasattr(self, '_unified_roi_third'): return super()._finish_roi_selection(event)
        start = self.roi_drag_start;
        self.roi_drag_start = None
        if start is None or event.xdata is None or event.ydata is None: return
        u0, v0 = start;
        u1, v1 = event.xdata, event.ydata
        if abs(u1 - u0) < 1e-6 or abs(v1 - v0) < 1e-6: return
        a, b, _ = PLANES[self.plane.get()];
        ia, ib = AX[a], AX[b]
        self.nmrvars[('cx', 'cy', 'cz')[ia]].set(f'{(u0 + u1) / 2:.6g}');
        self.nmrvars[('cx', 'cy', 'cz')[ib]].set(f'{(v0 + v1) / 2:.6g}')
        self.nmrvars[('sx', 'sy', 'sz')[ia]].set(f'{abs(u1 - u0):.6g}');
        self.nmrvars[('sx', 'sy', 'sz')[ib]].set(f'{abs(v1 - v0):.6g}')
        self.roi_select_mode = False;
        del self._unified_roi_third
        if self.roi_rect_artist is not None:
            try:
                self.roi_rect_artist.remove()
            except ValueError:
                pass
            self.roi_rect_artist = None
        self.live_passport(True)

    def unified_find_roi(self):
        try:
            _, size, _, limits, frequency, bandwidth = self._dashboard_inputs()
            self.status.set('Ищу лучшее свободное место ROI…')
            self.update_idletasks()
            surface = self._surface_constraint()
            fixed_axis = fixed_coordinate = None
            surface_depth = None
            if surface is not None:
                fixed_axis = surface['axis']
                fixed_coordinate = surface['centre_coordinate_mm']
                surface_depth = surface['depth_mm']
            result = find_best_nmr_roi(
                self.magnets, size, self.nmrvars['nucleus'].get(),
                self.nmrvars['profile'].get(), frequency, bandwidth, limits,
                fixed_axis=fixed_axis, fixed_coordinate=fixed_coordinate,
                surface_depth_mm=surface_depth)
            for key, value in zip(('cx', 'cy', 'cz'),
                                  result['metrics']['centre_mm']):
                self.nmrvars[key].set(f'{value:.6g}')
            self.live_passport(True)
        except Exception as e:
            messagebox.showerror('Поиск ROI', str(e), parent=self)

    def show_surface_b0_map(self):
        try:
            centre, size, _, _, _, _ = self._dashboard_inputs();
            surface = self._surface_constraint()
            if surface is None:
                plane = self.plane.get();
                surface = {'plane': plane, 'axis': AX[PLANES[plane][2]],
                           'centre_coordinate_mm': centre[AX[PLANES[plane][2]]]}
            self._update_surface_slice_cache(centre, size, surface);
            self.draw_2d(True);
            self.tabs.select(self.v2)
            self.status.set(
                f"Показана карта {self.nmrvars['map_mode'].get()} в плоскости {surface['plane']} через центр ROI")
        except Exception as e:
            messagebox.showerror('Карта B0', str(e), parent=self)

    def maximize_usable_volume(self):
        try:
            _, base_size, _, limits, frequency, bandwidth = self._dashboard_inputs()
            if not messagebox.askokcancel('Максимизация пригодного ROI',
                                          'Будет выполнена непрерывная оптимизация объёма ROI, размеров магнитов, расстояния между ними и положения образца. Это может занять несколько минут. Текущая сборка не изменится до отдельного подтверждения.',
                                          parent=self): return

            def progress(generation, total, volume):
                self.status.set(f'Оптимизация объёма: поколение {generation}/{total}, текущий ROI ≈ {volume:.1f} мм³…')
                self.update_idletasks()

            result = maximize_usable_roi(self.magnets, base_size, self.nmrvars['nucleus'].get(),
                                         self.nmrvars['profile'].get(), frequency, bandwidth, limits, progress,
                                         surface_constraint=self._surface_constraint())
            test_size = result['roi_size_mm']
            report, decision = build_nmr_report(result['search']['metrics'], self.nmrvars['profile'].get(), frequency,
                                                bandwidth, limits)
            best = (result, test_size, report, decision);
            self.optimization_preview = best
            lines = []
            for old, new in zip(self.magnets, result['magnets']): lines.append(
                f"• {old.name}: {np.round(old.size, 2)} → {np.round(new.size, 2)} мм; центр {np.round(old.center, 2)} → {np.round(new.center, 2)} мм")
            header = (
                        f"ОПТИМИЗАЦИЯ БОЛЬШОГО РАБОЧЕГО ОБЪЁМА\n{'НАЙДЕН ПРИГОДНЫЙ ВАРИАНТ' if decision['suitable'] else 'ЛУЧШИЙ ВАРИАНТ ЕЩЁ НЕ ПРОШЁЛ ВСЕ КРИТЕРИИ'}\n"
                        f"Предлагаемый ROI: {np.round(test_size, 3)} мм; объём {np.prod(test_size):.1f} мм³\n" + '\n'.join(
                    lines) + "\n\nЗелёный каркас в 3D — предложение; синие магниты — текущая сборка.\n\n")
            header += (
                f"Непрерывная оптимизация: {result['evaluations']} оценок поля; масштаб ROI ×{result['roi_scale']:.3f}; "
                f"размеры магнитов radial ×{result['radial_scale']:.3f}, axial ×{result['thickness_scale']:.3f}; "
                f"расстояние центров ×{result['spacing_scale']:.3f}.\n"
                f"Компоновка: {'поверхностная пара — магниты рядом, полюсные поверхности выровнены' if result['layout'] == 'surface_pair' else 'масштабирование исходной компоновки'}.\n"
                f"Статус решателя: {result['optimizer_message']}\n\n")
            self.report.config(state='normal');
            self.report.delete('1.0', 'end');
            self.report.insert('1.0', header + report);
            self.report.config(state='disabled')
            self.apply_optimization_button.config(state='normal');
            self.tabs.select(self.v3);
            self.draw_3d(True)
            self.status.set('Предложение готово; сначала изучите зелёный 3D-каркас')
        except Exception as e:
            messagebox.showerror('Максимизация ROI', str(e), parent=self);self.status.set('Оптимизация не завершена')

    def optimize_homogeneity(self):
        try:
            centre, size, _, limits, frequency, bandwidth = self._dashboard_inputs()
            if not messagebox.askokcancel('Оптимизация однородности',
                                          'Перемещать отдельные магниты вдоль выбранной поверхности, чтобы уменьшить ΔB и разброс частот в текущем ROI? Сначала будет показан зелёный предпросмотр.',
                                          parent=self): return

            def progress(generation, total):
                self.status.set(f'Оптимизация однородности: поколение {generation}/{total}…');self.update_idletasks()

            result = optimize_roi_homogeneity(self.magnets, size, centre, self.nmrvars['nucleus'].get(),
                                              self.nmrvars['profile'].get(),
                                              frequency, bandwidth, limits, self._surface_constraint(), progress)
            metrics = result['search']['metrics'];
            report, decision = build_nmr_report(metrics, self.nmrvars['profile'].get(), frequency, bandwidth, limits)
            self.optimization_preview = (result, size, report, decision)
            lines = [f"• {old.name}: центр {np.round(old.center, 2)} → {np.round(new.center, 2)} мм" for old, new in
                     zip(self.magnets, result['magnets'])]
            header = (
                        f"ОПТИМИЗАЦИЯ ОДНОРОДНОСТИ ТЕКУЩЕГО ROI\n{'КРИТЕРИИ ВЫПОЛНЕНЫ' if decision['suitable'] else 'ОДНОРОДНОСТЬ УЛУЧШЕНА, НО НЕ ВСЕ КРИТЕРИИ ВЫПОЛНЕНЫ'}\n"
                        f"ROI остаётся {np.round(size, 3)} мм; проверено {result['evaluations']} вариантов.\n" + '\n'.join(
                    lines) + "\n\n")
            self.report.config(state='normal');
            self.report.delete('1.0', 'end');
            self.report.insert('1.0', header + report);
            self.report.config(state='disabled')
            self.apply_optimization_button.config(state='normal');
            self.tabs.select(self.v3);
            self.draw_3d(True)
            self.status.set('Зелёный каркас показывает расположение с лучшей однородностью')
        except Exception as e:
            messagebox.showerror('Оптимизация однородности', str(e), parent=self);self.status.set(
                'Оптимизация однородности не завершена')

    def apply_optimization_preview(self):
        if self.optimization_preview is None: return
        result, size, _, _ = self.optimization_preview
        if not messagebox.askokcancel('Применить оптимизацию',
                                      'Заменить размеры и расположение магнитов зелёным вариантом?',
                                      parent=self): return
        self.snapshot();
        self.magnets = copy.deepcopy(result['magnets'])
        metrics = result['search']['metrics']
        for key, value in zip(('cx', 'cy', 'cz'), metrics['centre_mm']): self.nmrvars[key].set(f'{value:.6g}')
        for key, value in zip(('sx', 'sy', 'sz'), size): self.nmrvars[key].set(f'{value:.6g}')
        self.optimization_preview = None;
        self.apply_optimization_button.config(state='disabled');
        self.refresh(True, True);
        self.live_passport(True)

    def draw_3d(self, fit=False):
        super().draw_3d(fit)
        if getattr(self, 'nmrvars', {}).get('surface_mode') is not None and self.nmrvars['surface_mode'].get():
            self._draw_surface_field_3d()
        if not self.optimization_preview: return
        result, size, _, decision = self.optimization_preview
        for m in result['magnets']:
            c = np.asarray(m.center);
            s = np.asarray(m.size)
            if m.shape == 'cylinder':
                a = AX[m.axis];
                rad = [k for k in range(3) if k != a];
                t = np.linspace(0, 2 * np.pi, 56)
                for sign in (-1, 1):
                    ring = np.tile(c, (len(t), 1));
                    ring[:, a] += sign * s[a] / 2;
                    ring[:, rad[0]] += s[rad[0]] / 2 * np.cos(t);
                    ring[:, rad[1]] += s[rad[1]] / 2 * np.sin(t);
                    self.ax3.plot(*ring.T, color='#00c853', lw=2.3)
                for angle in np.linspace(0, 2 * np.pi, 10, endpoint=False):
                    line = np.tile(c, (2, 1));
                    line[:, a] += np.array([-1, 1]) * s[a] / 2;
                    line[:, rad[0]] += s[rad[0]] / 2 * np.cos(angle);
                    line[:, rad[1]] += s[rad[1]] / 2 * np.sin(angle);
                    self.ax3.plot(*line.T, color='#00c853', lw=.8)
            else:
                lo, hi = c - s / 2, c + s / 2;
                corners = np.array([[x, y, z] for x in (lo[0], hi[0]) for y in (lo[1], hi[1]) for z in (lo[2], hi[2])])
                for i in range(8):
                    for j in range(i + 1, 8):
                        if np.count_nonzero(abs(corners[i] - corners[j]) > 1e-9) == 1: self.ax3.plot(
                            *np.vstack((corners[i], corners[j])).T, color='#00c853', lw=2)
        centre = result['search']['metrics']['centre_mm'];
        lo = centre - size / 2;
        hi = centre + size / 2
        corners = np.array([[x, y, z] for x in (lo[0], hi[0]) for y in (lo[1], hi[1]) for z in (lo[2], hi[2])])
        for i in range(8):
            for j in range(i + 1, 8):
                if np.count_nonzero(abs(corners[i] - corners[j]) > 1e-9) == 1: self.ax3.plot(
                    *np.vstack((corners[i], corners[j])).T, color='#ff8f00', lw=2.4)
        all_objects = list(self.magnets) + list(result['magnets']);
        all_lo = [magnet_bounds(m)[0] for m in all_objects] + [lo];
        all_hi = [magnet_bounds(m)[1] for m in all_objects] + [hi]
        view_lo = np.min(all_lo, axis=0);
        view_hi = np.max(all_hi, axis=0);
        margin = np.maximum((view_hi - view_lo) * .12, 3);
        view_lo -= margin;
        view_hi += margin
        self.fixed_limits = (view_lo, view_hi);
        self.ax3.set_xlim(view_lo[0], view_hi[0]);
        self.ax3.set_ylim(view_lo[1], view_hi[1]);
        self.ax3.set_zlim(view_lo[2], view_hi[2]);
        self.ax3.set_box_aspect(np.maximum(view_hi - view_lo, 1))
        self.ax3.set_title(('ПРЕДЛОЖЕНИЕ ПОДХОДИТ' if decision[
            'suitable'] else 'ПРЕДЛОЖЕНИЕ ЕЩЁ НЕ ПРОШЛО КРИТЕРИИ') + ' • зелёный — новые магниты',
                           color='#08783e' if decision['suitable'] else '#b71c1c', fontsize=10)
        self.c3.draw_idle()

    def _draw_surface_field_3d(self):
        try:
            centre, size, _, _, _, _ = self._dashboard_inputs();
            surface = self._surface_constraint()
            ia, ib, normal = AX[PLANES[surface['plane']][0]], AX[PLANES[surface['plane']][1]], surface['axis']
            span_a = max(float(size[ia]) * 2.2, 18.0);
            span_b = max(float(size[ib]) * 2.2, 18.0)
            us = np.linspace(centre[ia] - span_a / 2, centre[ia] + span_a / 2, 31);
            vs = np.linspace(centre[ib] - span_b / 2, centre[ib] + span_b / 2, 31)
            U, V = np.meshgrid(us, vs);
            points = np.tile(centre, (U.size, 1));
            points[:, ia] = U.ravel();
            points[:, ib] = V.ravel();
            points[:, normal] = centre[normal]
            strength = np.linalg.norm(field_B(self.magnets, points, density=5), axis=1).reshape(U.shape) * 1000
            low = float(np.percentile(strength, 2));
            high = float(np.percentile(strength, 98))
            if high <= low: high = low + 1e-9
            norm = matplotlib.colors.Normalize(low, high);
            colours = matplotlib.colormaps['viridis'](norm(strength))
            xyz = [np.full(U.shape, centre[k], float) for k in range(3)];
            xyz[ia] = U;
            xyz[ib] = V
            self.ax3.plot_surface(*xyz, facecolors=colours, shade=False, alpha=.46, linewidth=0, antialiased=False)
            a0, a1 = us[0], us[-1];
            b0, b1 = vs[0], vs[-1];
            outline = []
            for a, b in ((a0, b0), (a1, b0), (a1, b1), (a0, b1), (a0, b0)):
                p = centre.copy();
                p[ia] = a;
                p[ib] = b;
                outline.append(p)
            self.ax3.plot(*np.asarray(outline).T, color='#00bcd4', lw=2.0, alpha=.95)
            self.ax3.text(*np.asarray(outline)[0],
                          f"  поверхность {surface['plane']} • глубина {surface['depth_mm']:g} мм", color='#007c91',
                          fontsize=8)
            self.c3.draw_idle()
        except Exception:
            return


if __name__ == '__main__':
    UnifiedIntegratedApp().mainloop()
