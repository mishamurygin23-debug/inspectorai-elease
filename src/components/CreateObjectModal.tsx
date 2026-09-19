import React, { useState } from 'react';
import {
  Building2,
  X,
  Sparkles,
  MapPin,
  FileCheck,
  Briefcase,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ConstructionObject, UploadScenario } from '../types';

interface CreateObjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSuccess: (newObject: ConstructionObject) => void;
}

const SAMPLE_PRESETS = [
  {
    name: 'ЖК «Северный квартал», Корпус 3 с подземным паркингом',
    address: 'г. Москва, САО, Бескудниковский район, Дмитровское ш., вл. 73, корп. 3',
    customer: 'АО «Москапстрой-Инвест»',
    contractor: 'ООО «ГлавМосСтрой-Монолит»',
    permit_number: '№ 77-04-023811-2026 от 14.01.2026',
    category: 'Жилое многоквартирное',
  },
  {
    name: 'Школа на 1100 мест с физкультурно-оздоровительным комплексом',
    address: 'г. Москва, НАО, поселение Сосенское, пос. Коммунарка, ул. Липовый Парк, уч. 9',
    customer: 'КП «Управление гражданского строительства» (КП «УГС»)',
    contractor: 'АО «ПИК-Индустрия»',
    permit_number: '№ 77-17-022940-2026 от 03.02.2026',
    category: 'Образовательное учреждение (Соцкультбыт)',
  },
  {
    name: 'Многофункциональный общественно-деловой центр «ТехноПарк Юг»',
    address: 'г. Москва, ЮАО, Варшавское ш., вл. 125, стр. 18-20',
    customer: 'ООО «Деловой Вектор»',
    contractor: 'АО «Монолитное строительное управление-1» (АО «МСУ-1»)',
    permit_number: '№ 77-05-024519-2026 от 28.02.2026',
    category: 'Общественно-деловое здание',
  },
];

export const CreateObjectModal: React.FC<CreateObjectModalProps> = ({
  isOpen,
  onClose,
  onCreateSuccess,
}) => {
  const [name, setName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [permitNumber, setPermitNumber] = useState<string>('');
  const [customer, setCustomer] = useState<string>('');
  const [contractor, setContractor] = useState<string>('');
  const [uploadScenario, setUploadScenario] = useState<UploadScenario>('PD_RD_ONLY');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setName(preset.name);
    setAddress(preset.address);
    setPermitNumber(preset.permit_number);
    setCustomer(preset.customer);
    setContractor(preset.contractor);
    setErrorMessage(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMessage('Укажите наименование объекта капитального строительства');
      return;
    }
    if (!address.trim()) {
      setErrorMessage('Укажите адрес объекта в г. Москве');
      return;
    }
    if (!permitNumber.trim()) {
      setErrorMessage('Укажите номер разрешения на строительство (РНС)');
      return;
    }

    const newObjId = `obj-custom-${Date.now()}`;
    const newObject: ConstructionObject = {
      id: newObjId,
      name: name.trim(),
      address: address.trim(),
      customer: customer.trim() || 'Застройщик г. Москвы',
      contractor: contractor.trim() || 'Генеральная подрядная организация',
      permit_number: permitNumber.trim(),
      status: 'YELLOW', // Initially in preparation / review
      active_protocol_id: `prot-${Date.now()}`,
      created_at: new Date().toISOString(),
      scenarios: {
        upload_scenario: uploadScenario,
        stage_statuses: {
          pd: 'PD_MISSING',
          rd: 'RD_MISSING',
          id: 'ID_MISSING',
        },
      },
      stats: {
        total_params_checked: 132,
        confirmed_violations: 0,
        candidate_findings: 0,
        negative_verified: 0,
        clarification_required: 0,
        missing_evidence: 0,
        suspicions_count: 0,
      },
      iais_rin_sync: {
        process_id: `proc-new-${Date.now()}`,
        ukep_signature: {
          signatory: 'Иванов А.С., Инспектор 1-й кат. Мосгосстройнадзора',
          certificate_serial: `00E${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
          valid_until: '31.12.2026',
          valid: true,
        },
        status: 'PENDING',
      },
    };

    onCreateSuccess(newObject);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 my-8 animate-fade-in">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-700 to-indigo-700 text-white flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 mb-1">
                Шаг 1 из 3 • Регистрация объекта
              </span>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                Создать новый объект государственного надзора
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets for Inspector convenience */}
        <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200/70">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Быстрое заполнение типового объекта Москвы:
            </span>
            <span className="text-[10px] text-purple-600 font-medium">Кликните для автозаполнения</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SAMPLE_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="text-left p-2 rounded-lg bg-white hover:bg-purple-100/60 border border-purple-200 text-xs transition-colors cursor-pointer group shadow-2xs"
              >
                <div className="font-bold text-slate-800 line-clamp-1 group-hover:text-purple-900">
                  {p.name.split(',')[0]}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                  {p.category}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form fields */}
        <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-800 font-bold mb-1">
              Наименование объекта строительства <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: ЖК «Символ», Корпус 14 со встроенным ДОУ"
              className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/50 text-slate-900 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Адрес объекта в г. Москве <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="г. Москва, ЮВАО, ул. Золоторожский Вал, вл. 11"
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/50 text-slate-900 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5 text-slate-500" />
                Номер разрешения на строительство (РНС) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={permitNumber}
                onChange={(e) => setPermitNumber(e.target.value)}
                placeholder="№ 77-04-021840-2026 от 15.01.2026"
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/50 text-slate-900 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                Застройщик / Заказчик
              </label>
              <input
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="ООО «Дон-Строй Инвест»"
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/50 text-slate-900 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                Генеральный подрядчик
              </label>
              <input
                type="text"
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
                placeholder="АО «ФОДД Констракшн»"
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/50 text-slate-900 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Сценарий проверки документации (ТЗ Раздел 9.1):
            </label>
            <select
              value={uploadScenario}
              onChange={(e) => setUploadScenario(e.target.value as UploadScenario)}
              className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50 text-slate-900 text-xs font-medium cursor-pointer"
            >
              <option value="PD_RD_ONLY">ПД + РД (Сверка проектной и рабочей документации — основной режим)</option>
              <option value="FULL">FULL (ПД + РД + ИД — с учетом исполнительных схем и геодезии)</option>
              <option value="PARTIALLY_LOADED">Инкрементальная проверка (поэтапная дозагрузка комплекта)</option>
            </select>
          </div>

          {/* Dialog Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
            >
              <span>Создать объект и загрузить документы</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
