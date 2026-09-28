import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  FileCheck2,
  CheckCircle2,
  Copy,
  Check,
  Send,
  Sliders,
  HelpCircle,
  FolderTree,
  AlertTriangle
} from 'lucide-react';
import { Suspicion, DiscoveryMethod, ReviewPriority } from '../types';
import { TZ_HYPOTHESIS_FORMULATION_GUIDE } from '../data/comprehensiveHypothesesData';

interface HypothesisTZBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddHypothesis: (hypo: Omit<Suspicion, 'suspicion_id'>) => void;
  objectId: string;
  objectName: string;
}

export const HypothesisTZBuilderModal: React.FC<HypothesisTZBuilderModalProps> = ({
  isOpen,
  onClose,
  onAddHypothesis,
  objectId,
  objectName,
}) => {
  const [activeTab, setActiveTab] = useState<'BUILDER' | 'TZ_GUIDE' | 'TEMPLATES'>('BUILDER');
  const [copiedTemplateIdx, setCopiedTemplateIdx] = useState<number | null>(null);

  // Form states for builder
  const [discipline, setDiscipline] = useState<string>('АР');
  const [tzCode, setTzCode] = useState<string>('ТЗ-9.5.1');
  const [discoveryMethod, setDiscoveryMethod] = useState<DiscoveryMethod>('LOGICAL_ANALYSIS');
  const [priority, setPriority] = useState<ReviewPriority>('HIGH');
  const [confidence, setConfidence] = useState<number>(0.92);

  // Structural fields according to TZ formula:
  // [Элемент] + [Требование ПД/СП] + [Факт РД] + [Риск/Последствие]
  const [targetElement, setTargetElement] = useState<string>('');
  const [pdStatement, setPdStatement] = useState<string>('');
  const [rdStatement, setRdStatement] = useState<string>('');
  const [normativeRef, setNormativeRef] = useState<string>('');
  const [pdSheet, setPdSheet] = useState<string>('');
  const [rdSheet, setRdSheet] = useState<string>('');
  const [consequenceRisk, setConsequenceRisk] = useState<string>('');

  // Quick preset loader
  const handleApplyPreset = (preset: {
    discipline: string;
    tzCode: string;
    element: string;
    pdStatement: string;
    rdStatement: string;
    norm: string;
    risk: string;
    pdSheet: string;
    rdSheet: string;
    method: DiscoveryMethod;
    priority: ReviewPriority;
  }) => {
    setDiscipline(preset.discipline);
    setTzCode(preset.tzCode);
    setTargetElement(preset.element);
    setPdStatement(preset.pdStatement);
    setRdStatement(preset.rdStatement);
    setNormativeRef(preset.norm);
    setConsequenceRisk(preset.risk);
    setPdSheet(preset.pdSheet);
    setRdSheet(preset.rdSheet);
    setDiscoveryMethod(preset.method);
    setPriority(preset.priority);
    setActiveTab('BUILDER');
  };

  // Generate full synthesized description
  const computedDescription = targetElement && pdStatement && rdStatement
    ? `${targetElement}: в ПД заложено «${pdStatement}», а в РД принято «${rdStatement}». ${consequenceRisk ? `Риск/коллизия: ${consequenceRisk}` : ''}`.trim()
    : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetElement && !pdStatement) return;

    const finalDescription = computedDescription || `${targetElement || 'Инженерный элемент'}: расхождение между ПД и РД`;

    onAddHypothesis({
      object_id: objectId,
      discovery_method: discoveryMethod,
      confidence: confidence,
      description: finalDescription,
      pd_reference: `${pdSheet || 'ПД'} (${pdStatement || 'проектное требование'})`,
      rd_reference: `${rdSheet || 'РД'} (${rdStatement || 'фактическое исполнение'})`,
      review_priority: priority,
      normative_base: normativeRef || 'Градостроительный кодекс РФ, ч. 6 ст. 52',
      finding_status: 'SUSPICION',
      inspector_status: 'PENDING',
      discipline: discipline,
      tz_requirement_code: tzCode,
      is_custom_user_hypothesis: true,
    });

    // Reset & close
    setTargetElement('');
    setPdStatement('');
    setRdStatement('');
    setConsequenceRisk('');
    setNormativeRef('');
    setPdSheet('');
    setRdSheet('');
    onClose();
  };

  const copyTextToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplateIdx(idx);
    setTimeout(() => setCopiedTemplateIdx(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Модуль ТЗ • Раздел 9.5
                </span>
                <span className="text-xs text-slate-400 font-medium truncate max-w-xs">
                  {objectName}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                Конструктор инженерных гипотез ИИ по требованиям ТЗ
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 shrink-0">
          <button
            onClick={() => setActiveTab('BUILDER')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'BUILDER'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Конструктор гипотезы (Формула ТЗ)</span>
          </button>

          <button
            onClick={() => setActiveTab('TEMPLATES')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'TEMPLATES'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Шаблоны по разделам (АР, КР, ОВ, ВК, ЭОМ)</span>
          </button>

          <button
            onClick={() => setActiveTab('TZ_GUIDE')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'TZ_GUIDE'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Как писать гипотезы в ТЗ (Методичка)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: BUILDER */}
          {activeTab === 'BUILDER' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100 flex items-start space-x-2.5">
                <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-900 leading-relaxed">
                  <strong>Формула ТЗ:</strong> [Элемент/Узел] + [Требование ПД] + [Факт в РД] + [Нормативный пункт СП] + [Оценка риска]. ИИ автоматически сформирует структурированную запись для протокола.
                </div>
              </div>

              {/* Classification Row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Раздел документации:
                  </label>
                  <select
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="АР">АР — Архитектурные решения</option>
                    <option value="КР">КР/КЖ — Конструктивные решения</option>
                    <option value="КМ">КМ — Металлоконструкции</option>
                    <option value="ОВ">ОВ — Отопление и вентиляция</option>
                    <option value="ВК">ВК — Водопровод и канализация</option>
                    <option value="ЭОМ">ЭОМ — Электроснабжение</option>
                    <option value="СПЗ">СПЗ — Пожаротушение / Сигнализация</option>
                    <option value="ПЗУ">ПЗУ — Схема планировки (Генплан)</option>
                    <option value="ТХ">ТХ — Технологические решения</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Шифр пункта ТЗ:
                  </label>
                  <input
                    type="text"
                    value={tzCode}
                    onChange={(e) => setTzCode(e.target.value)}
                    placeholder="Например: ТЗ-9.5.4"
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Метод выявления ИИ:
                  </label>
                  <select
                    value={discoveryMethod}
                    onChange={(e) => setDiscoveryMethod(e.target.value as DiscoveryMethod)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="LOGICAL_ANALYSIS">Логический анализ</option>
                    <option value="NORMATIVE_ANALYSIS">Нормативный анализ</option>
                    <option value="SEMANTIC_DISSONANCE">Семантический диссонанс</option>
                    <option value="ML_PATTERN_ANALYSIS">ML-паттерн анализ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Приоритет надзора:
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ReviewPriority)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="HIGH">HIGH (Критический контроль)</option>
                    <option value="MEDIUM">MEDIUM (Эксплуатационный дефект)</option>
                    <option value="LOW">LOW (Оформительское замечание)</option>
                  </select>
                </div>
              </div>

              {/* Target Element */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  1. Контролируемый элемент / Инженерный узел (Что проверяем?):
                </label>
                <input
                  type="text"
                  value={targetElement}
                  onChange={(e) => setTargetElement(e.target.value)}
                  placeholder="Например: Предел огнестойкости противопожарных штор / Толщина защитного слоя бетона ростверков"
                  required
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* PD vs RD Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                {/* PD column */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span>2. Требование Проектной Документации (ПД / Экспертиза):</span>
                  </div>
                  <textarea
                    value={pdStatement}
                    onChange={(e) => setPdStatement(e.target.value)}
                    placeholder="Что заложено по утвержденному проекту (например: предел огнестойкости EI 150 с заполнением базальтовой ватой)..."
                    rows={2}
                    required
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={pdSheet}
                    onChange={(e) => setPdSheet(e.target.value)}
                    placeholder="Том и лист ПД (напр: Том 9 ППМ, лист 14)"
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                {/* RD column */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>3. Фактическое решение Рабочей Документации (РД):</span>
                  </div>
                  <textarea
                    value={rdStatement}
                    onChange={(e) => setRdStatement(e.target.value)}
                    placeholder="Что фактически заложено в рабочей спецификации/чертеже (например: сертификат на панели заявляет предел EI 90)..."
                    rows={2}
                    required
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={rdSheet}
                    onChange={(e) => setRdSheet(e.target.value)}
                    placeholder="Шифр комплекта и лист РД (напр: РД-2025-04.266-АР2, лист 8)"
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Normative Ref and Risk */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    4. Нормативная база (Статьи ФЗ, пункты СП / ГОСТ):
                  </label>
                  <input
                    type="text"
                    value={normativeRef}
                    onChange={(e) => setNormativeRef(e.target.value)}
                    placeholder="Например: ФЗ № 123-ФЗ ст. 87; СП 2.13130.2020 табл. 21"
                    required
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    5. Физический риск / Юридическое последствие расхождения:
                  </label>
                  <input
                    type="text"
                    value={consequenceRisk}
                    onChange={(e) => setConsequenceRisk(e.target.value)}
                    placeholder="Например: Риск распространения пламени между пожарными отсеками"
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              {computedDescription && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Синтезированная формулировка для Предписания и Протокола:</span>
                  </div>
                  <div className="text-xs text-slate-800 font-medium italic">
                    "{computedDescription}"
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500">Уверенность детекции:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="0.99"
                    step="0.01"
                    value={confidence}
                    onChange={(e) => setConfidence(parseFloat(e.target.value))}
                    className="w-24 accent-indigo-600 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-indigo-700 font-mono">
                    {Math.round(confidence * 100)}%
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Добавить гипотезу в надзорный массив</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: TEMPLATES BY DISCIPLINE */}
          {activeTab === 'TEMPLATES' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Выберите типовой шаблон гипотезы под нужный раздел проекта. Нажмите <strong>«Применить в конструктор»</strong>, чтобы сразу отредактировать параметры для текущего объекта.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    discipline: 'АР',
                    tzCode: 'ТЗ-АР-9.5.1',
                    title: 'Огнестойкость наружных ограждающих стен',
                    element: 'Предел огнестойкости сэндвич-панелей наружных стен',
                    pdStatement: 'В томе 9 ППМ предел огнестойкости принят EI 150 с негорючим базальтовым сердечником',
                    rdStatement: 'В паспорте на панели Венталл-С3 указан предел огнестойкости EI 90',
                    norm: 'ФЗ № 123-ФЗ ст. 87; СП 2.13130.2020 табл. 21',
                    risk: 'Риск прогара фасадной преграды и распространения огня на кровлю',
                    pdSheet: 'ЖС-РЛ-270121-АР, л.11',
                    rdSheet: 'РД-2025-04.266-АР2, л.15',
                    method: 'LOGICAL_ANALYSIS' as DiscoveryMethod,
                    priority: 'HIGH' as ReviewPriority,
                  },
                  {
                    discipline: 'ОВ',
                    tzCode: 'ТЗ-ОВ-9.5.5',
                    title: 'Огнезащита транзитных воздуховодов дымоудаления',
                    element: 'Предел огнестойкости воздуховодов вытяжной противодымной вентиляции ВД',
                    pdStatement: 'Толщина огнезащитного состава обеспечивает предел не менее EI 120 в шахтах',
                    rdStatement: 'В ведомости объемов работ РД заложена огнезащита с пределом только EI 30',
                    norm: 'СП 7.13130.2013 п. 6.18, табл. 2; ФЗ № 123-ФЗ ст. 138',
                    risk: 'Деформация и разгерметизация дымового тракта при эвакуации людей',
                    pdSheet: 'ЖС-РЛ-270121-ОВ, л.8',
                    rdSheet: 'РД-2025-04.266-ОВ, л.22',
                    method: 'NORMATIVE_ANALYSIS' as DiscoveryMethod,
                    priority: 'HIGH' as ReviewPriority,
                  },
                  {
                    discipline: 'КР',
                    tzCode: 'ТЗ-КР-9.5.9',
                    title: 'Гидрошпонка холодного шва бетонирования',
                    element: 'Холодный шов примыкания фундаментной плиты и стен подвала',
                    pdStatement: 'Обязательное применение бентонитового шнура или саморасширяющейся шпонки Пенебар',
                    rdStatement: 'В узле 14 РД шпонка исключена, предусмотрен лишь обычный цементный шов',
                    norm: 'СП 250.1325800.2016 п. 5.4; СП 70.13330.2012 п. 5.3.1',
                    risk: 'Протечки грунтовых вод в подвал и коррозия рабочей арматуры фундамента',
                    pdSheet: 'ЖС-РЛ-270121-КР, л.9',
                    rdSheet: 'П-2025-04-266-КЖ01, л.14',
                    method: 'NORMATIVE_ANALYSIS' as DiscoveryMethod,
                    priority: 'HIGH' as ReviewPriority,
                  },
                  {
                    discipline: 'ВК',
                    tzCode: 'ТЗ-ВК-9.5.6',
                    title: 'Обратный клапан водомерного узла ввода',
                    element: 'Узел учета воды хозяйственно-питьевого ввода В1',
                    pdStatement: 'Установка обратного поворотного клапана Ду 100 после водосчетчика',
                    rdStatement: 'На аксонометрической схеме обратный клапан отсутствует',
                    norm: 'СП 30.13330.2020 п. 7.1.11, п. 11.4',
                    risk: 'Опорожнение внутренней сети и обратный гидроудар при отключении городского давления',
                    pdSheet: 'ЖС-РЛ-270121-ВК, л.3',
                    rdSheet: 'РД-2025-04.266-ВК1, л.5',
                    method: 'LOGICAL_ANALYSIS' as DiscoveryMethod,
                    priority: 'HIGH' as ReviewPriority,
                  },
                  {
                    discipline: 'ЭОМ',
                    tzCode: 'ТЗ-ЭОМ-9.5.8',
                    title: 'Марка кабеля линий противопожарной защиты (СПЗ)',
                    element: 'Кабельные линии электропитания насосов пожаротушения и вентиляторов ДУ',
                    pdStatement: 'Прокладка огнестойким кабелем ВВГнг(А)-FRLS с пределом не менее 90 мин',
                    rdStatement: 'В спецификации применен обычный негорючий кабель ВВГнг(А)-LS',
                    norm: 'СП 6.13130.2021 п. 6.3; ГОСТ 31565-2012',
                    risk: 'Отказ насосов и систем эвакуации в первые 10 минут возгорания',
                    pdSheet: 'ЖС-РЛ-270121-ЭОМ, л.12',
                    rdSheet: 'РД-2025-04.266-ЭОМ, л.19',
                    method: 'LOGICAL_ANALYSIS' as DiscoveryMethod,
                    priority: 'HIGH' as ReviewPriority,
                  },
                  {
                    discipline: 'АР',
                    tzCode: 'ТЗ-ОДИ-9.5.7',
                    title: 'Уклон наружного входного пандуса для МГН',
                    element: 'Входная группа здания: пандус для маломобильных групп',
                    pdStatement: 'Уклон пандуса принят 1:20 (5.0%), длина марша 12.0 м',
                    rdStatement: 'На разбивочном плане РД уклон пандуса составляет 1:8 (12.5%)',
                    norm: 'СП 59.13330.2020 п. 5.1.14; СП 118.13330.2022 п. 4.14',
                    risk: 'Травмоопасность и невозможность самостоятельного подъема на кресле-коляске',
                    pdSheet: 'ЖС-РЛ-270121-АР, л.5',
                    rdSheet: 'РД-2025-04.266-АР1, л.8',
                    method: 'NORMATIVE_ANALYSIS' as DiscoveryMethod,
                    priority: 'HIGH' as ReviewPriority,
                  },
                ].map((tpl, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-300 transition-all space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          {tpl.discipline}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-600">
                          {tpl.tzCode}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                        {tpl.priority}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-900">{tpl.title}</div>

                    <div className="text-[11px] text-slate-600 space-y-1 bg-white p-2 rounded-lg border border-slate-100">
                      <div>
                        <strong>ПД:</strong> {tpl.pdStatement}
                      </div>
                      <div>
                        <strong>РД:</strong> {tpl.rdStatement}
                      </div>
                      <div className="text-slate-500 font-mono text-[10px]">
                        {tpl.norm}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <button
                        onClick={() => copyTextToClipboard(`${tpl.element}: в ПД ${tpl.pdStatement}, в РД ${tpl.rdStatement}. Норма: ${tpl.norm}`, idx)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedTemplateIdx === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Скопировано</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Копировать</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleApplyPreset(tpl)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Применить в конструктор →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TZ GUIDE & FORMULATION MANUAL */}
          {activeTab === 'TZ_GUIDE' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {TZ_HYPOTHESIS_FORMULATION_GUIDE.title}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {TZ_HYPOTHESIS_FORMULATION_GUIDE.subtitle}
                </p>
              </div>

              {/* 5 Rules */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Пятишаговый стандарт описания расхождений:
                </div>

                {TZ_HYPOTHESIS_FORMULATION_GUIDE.structure_rules.map((rule) => (
                  <div
                    key={rule.step}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                        {rule.step}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{rule.title}</span>
                    </div>
                    <div className="text-xs text-slate-700 leading-relaxed pl-7">
                      {rule.rule}
                    </div>
                    <div className="text-[11px] text-indigo-900 bg-indigo-50/70 p-2 rounded-lg border border-indigo-100/60 font-medium pl-3 ml-7">
                      <strong>Пример в ТЗ:</strong> {rule.example}
                    </div>
                  </div>
                ))}
              </div>

              {/* Standard Clauses */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Типовые формулировки пунктов ТЗ для включения в договорную документацию:
                </div>

                {TZ_HYPOTHESIS_FORMULATION_GUIDE.standard_tz_clauses.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {item.clause} • {item.title}
                      </span>
                      <button
                        onClick={() => copyTextToClipboard(`${item.clause}. ${item.title}: ${item.text}`, 100 + idx)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedTemplateIdx === 100 + idx ? (
                          <span className="text-emerald-600 font-bold">Скопировано!</span>
                        ) : (
                          <span>Копировать в буфер</span>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Инженерные гипотезы синхронизируются с протоколом проверки и ИАИС «РиН»</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
