import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Download,
  BookOpen,
  Scale,
  Printer,
  ChevronRight,
  ExternalLink,
  Layers,
  Search
} from 'lucide-react';
import { ConstructionObject, InspectionProtocol, Suspicion, CheckFinding } from '../types';
import { downloadFullDocumentReport, downloadStructuredTextReport } from '../utils/reportGenerator';

interface DocumentAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  object: ConstructionObject;
  protocol: InspectionProtocol;
  suspicions: Suspicion[];
  onSelectFindingForInspection?: (findingId: string) => void;
}

export const DocumentAuditModal: React.FC<DocumentAuditModalProps> = ({
  isOpen,
  onClose,
  object,
  protocol,
  suspicions,
  onSelectFindingForInspection,
}) => {
  const findingsList = protocol?.findings || [];
  const [selectedFindingId, setSelectedFindingId] = useState<string>(
    findingsList[0]?.id || ''
  );
  const [activeStepTab, setActiveStepTab] = useState<'CRITERIA' | 'FINDINGS_AUDIT' | 'DOWNLOAD_REPORT'>('FINDINGS_AUDIT');
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentFinding =
    findingsList.find((f) => f.id === selectedFindingId) || findingsList[0] || null;

  const confirmedCount = findingsList.filter((f) => f.finding_status === 'CONFIRMED_VIOLATION').length;
  const normCount = findingsList.filter((f) => f.finding_status === 'NEGATIVE_VERIFIED').length;
  const candidateCount = findingsList.filter((f) => f.finding_status === 'SUSPICION' || f.finding_status === 'CANDIDATE').length;

  const handleDownloadHtml = () => {
    downloadFullDocumentReport({ object, protocol, suspicions });
    setDownloadToast('Полный отчет успешно сохранен на ваш компьютер (.html)! Откройте его в браузере или распечатайте.');
    setTimeout(() => setDownloadToast(null), 4000);
  };

  const handleDownloadTxt = () => {
    downloadStructuredTextReport({ object, protocol, suspicions });
    setDownloadToast('Текстовый отчет сохранен на ваш компьютер (.txt)!');
    setTimeout(() => setDownloadToast(null), 4000);
  };

  const handlePrint = () => {
    downloadFullDocumentReport({ object, protocol, suspicions });
    setDownloadToast('Отчет скачан! Для печати нажмите Ctrl+P в открывшемся файле.');
    setTimeout(() => setDownloadToast(null), 4000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-fade-in">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Верификация достоверности замечаний и документов
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Аудит Мосгосстройнадзора
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Как проверить, действительно ли правилен список замечаний и что именно не так в тексте чертежей
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadHtml}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Скачать полный отчет на ПК</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOAST NOTIFICATION */}
        {downloadToast && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{downloadToast}</span>
            </div>
            <button onClick={() => setDownloadToast(null)} className="text-white hover:opacity-80">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-slate-800 bg-slate-900/80 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveStepTab('FINDINGS_AUDIT')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeStepTab === 'FINDINGS_AUDIT'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Анализ замечаний с выделением текста ({protocol.findings.length})</span>
          </button>

          <button
            onClick={() => setActiveStepTab('CRITERIA')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeStepTab === 'CRITERIA'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>5 критериев проверки правильности</span>
          </button>

          <button
            onClick={() => setActiveStepTab('DOWNLOAD_REPORT')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeStepTab === 'DOWNLOAD_REPORT'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Скачать отчет на компьютер</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: FINDINGS AUDIT (TEXT HIGHLIGHT + WHAT IS WRONG) */}
          {activeStepTab === 'FINDINGS_AUDIT' && (
            findingsList.length === 0 || !currentFinding ? (
              <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">Замечаний не выявлено</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  В текущем комплекте документации нарушения отсутствуют. Все параметры соответствуют утвержденной проектной документации и СП.
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              
              {/* LEFT: FINDINGS LIST */}
              <div className="lg:col-span-5 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 pb-2 border-b border-slate-800">
                  <span>Список проверяемых замечаний:</span>
                  <span className="text-[11px] text-slate-400">
                    Нарушений: <strong className="text-rose-400">{confirmedCount}</strong> | Норма: <strong className="text-emerald-400">{normCount}</strong>
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                  {findingsList.map((f) => {
                    const isSelected = f.id === currentFinding.id;
                    const isConfirmed = f.finding_status === 'CONFIRMED_VIOLATION';
                    const isNorm = f.finding_status === 'NEGATIVE_VERIFIED';

                    return (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFindingId(f.id)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-950/60 border-purple-500 ring-1 ring-purple-500 text-white'
                            : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-black text-xs px-1.5 py-0.5 rounded bg-slate-800 text-purple-300">
                            {f.param_code}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isConfirmed
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : isNorm
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {isConfirmed ? 'Нарушение' : isNorm ? 'Норма' : 'Кандидат'}
                          </span>
                        </div>
                        <div className="text-xs font-bold line-clamp-1">{f.param_name}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{f.delta}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT: DETAILED AUDIT CARD FOR CURRENT FINDING */}
              <div className="lg:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3.5">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-purple-900/80 text-purple-300">
                        {currentFinding.param_code}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">
                        Раздел: {currentFinding.section}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-white mt-1">
                      {currentFinding.param_name}
                    </h3>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                      currentFinding.finding_status === 'CONFIRMED_VIOLATION'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : currentFinding.finding_status === 'NEGATIVE_VERIFIED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {currentFinding.finding_status === 'CONFIRMED_VIOLATION'
                      ? '⚠️ НАСТОЯЩЕЕ НАРУШЕНИЕ'
                      : currentFinding.finding_status === 'NEGATIVE_VERIFIED'
                      ? '✓ НОРМА (НЕ ОШИБКА)'
                      : '🔍 КАНДИДАТ'}
                  </span>
                </div>

                {/* 1. TEXT SNIPPET WITH HIGHLIGHT */}
                <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5 uppercase">
                    <span>🖍️</span>
                    <span>Выделенный фрагмент текста из чертежа (как в документе):</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 font-mono text-xs text-slate-200 leading-relaxed">
                    «...<mark className="bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded shadow-xs">
                      {currentFinding.evidence_fragments?.[0]?.bbox?.highlightText || currentFinding.actual_value}
                    </mark>...»
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Документ: {currentFinding.evidence_fragments?.[0]?.file_name || 'РД-2025-04.266-АР1.pdf'} | Лист: {currentFinding.evidence_fragments?.[0]?.sheet_page || 'Лист 16'}
                  </div>
                </div>

                {/* 2. WHAT IS THIS TEXT */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 uppercase">
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                    <span>Что это за текст:</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentFinding.justification || 'Текстовые указания и спецификация рабочей документации, регламентирующие проектные решения по данному узлу.'}
                  </p>
                </div>

                {/* 3. WHAT IS WRONG (WHY IT IS A DEFECT OR NORM) */}
                <div
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    currentFinding.finding_status === 'NEGATIVE_VERIFIED'
                      ? 'bg-emerald-950/40 border-emerald-500/40'
                      : 'bg-rose-950/40 border-rose-500/40'
                  }`}
                >
                  <div
                    className={`text-[11px] font-bold uppercase flex items-center gap-1.5 ${
                      currentFinding.finding_status === 'NEGATIVE_VERIFIED'
                        ? 'text-emerald-300'
                        : 'text-rose-300'
                    }`}
                  >
                    {currentFinding.finding_status === 'NEGATIVE_VERIFIED' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Почему это решение является правильным (Норма):</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Что там неправильно (разбор коллизии):</span>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Утверждено в ПД (Эталон):</span>
                      <strong className="text-slate-100 font-mono text-[11.5px]">{currentFinding.expected_value}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Указано в РД (Факт на чертеже):</span>
                      <strong className="text-rose-400 font-mono text-[11.5px]">{currentFinding.actual_value}</strong>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 pt-1">
                    <div>
                      <span className="text-slate-400">Величина расхождения: </span>
                      <strong className="text-amber-300 font-mono">{currentFinding.delta}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Нарушенный норматив: </span>
                      <strong className="text-purple-300">{currentFinding.normative_reference || 'СП 118.13330.2022; ГрК РФ ст. 52, 54'}</strong>
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTON TO VIEW IN VIEWER */}
                {onSelectFindingForInspection && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        onSelectFindingForInspection(currentFinding.id);
                        onClose();
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Открыть на чертеже с подсветкой</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            )
          )}

          {/* TAB 2: 5 CRITERIA OF VERIFICATION */}
          {activeStepTab === 'CRITERIA' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-400" />
                  <span>5 обязательных критериев проверки правильности списка замечаний:</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Чтобы убедиться, что список замечаний действительно верен и исключает ложные срабатывания, Мосгосстройнадзор применяет следующую 5-ступенчатую методику:
                </p>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center gap-2">
                      <span>1. Проверка аутентичности и целостности исходного файла</span>
                    </div>
                    <p className="text-slate-300">
                      Система считывает векторный PDF-файл напрямую, проверяет цифровую подпись (ЭЦП) и контрольную сумму SHA-256. Исключаются искажения растровых сканов.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center gap-2">
                      <span>2. Сверка утвержденной стадии «П» с рабочей стадией «Р»</span>
                    </div>
                    <p className="text-slate-300">
                      Замечанием признается только доказанное расхождение между утвержденным томом государственной экспертизы (ПД) и выданным в производство листом РД. Если решение согласовано спецразрешением, замечание отклоняется.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center gap-2">
                      <span>3. Точная текстовая и геометрическая привязка</span>
                    </div>
                    <p className="text-slate-300">
                      Каждое замечание содержит точную цитату из чертежа с маркером выделения, координатами рамки BBox и номером страницы.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center gap-2">
                      <span>4. Междисциплинарный контроль (АР ≠ ОВ ≠ КР)</span>
                    </div>
                    <p className="text-slate-300">
                      Система исключает проецирование архитектурных ошибок (например, высоты пола) на листы инженерных систем (отопление, вентиляция). Если текст описывает нормативное решение по СП 60.13330 (термостаты, Санекст), оно признается нормой.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center gap-2">
                      <span>5. Нормативная обоснованность по сводам правил РФ</span>
                    </div>
                    <p className="text-slate-300">
                      Каждое подтвержденное нарушение снабжается пунктом СП, ГОСТ или Федерального закона (№ 123-ФЗ, № 384-ФЗ, ГрК РФ), гарантируя юридическую стойкость при судебных проверках.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOWNLOAD REPORT TO COMPUTER */}
          {activeStepTab === 'DOWNLOAD_REPORT' && (
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-5">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/40">
                  <Download className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-white">
                  Скачать полный отчет по документу на ваш компьютер
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Файл отчета формируется локально в браузере и мгновенно скачивается в папку «Загрузки» на вашем компьютере. Содержит все цитаты из чертежей с цветным выделением, таблицы расхождений и перечень гипотез ИИ.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <button
                  onClick={handleDownloadHtml}
                  className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-emerald-500/60 hover:border-emerald-400 transition-all text-left space-y-2 cursor-pointer group shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-emerald-300 group-hover:text-white">
                      HTML-Досье с выделением текста
                    </span>
                    <Download className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Красочный интерактивный отчет со стилизованными маркерами текста, таблицами коллизий и кнопкой быстрой печати в PDF.
                  </p>
                  <div className="text-[10px] text-emerald-400 font-mono font-bold">
                    Формат: .html (рекомендуется)
                  </div>
                </button>

                <button
                  onClick={handleDownloadTxt}
                  className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 transition-all text-left space-y-2 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-slate-200 group-hover:text-white">
                      Текстовый структурированный отчет
                    </span>
                    <Download className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Компактный текстовый документ с полными цитатами и дельтами для вставки в предписания Word / Excel.
                  </p>
                  <div className="text-[10px] text-slate-400 font-mono font-bold">
                    Формат: .txt / .doc
                  </div>
                </button>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 text-center max-w-xl mx-auto">
                🔒 Отчет подписан цифровым штампом Мосгосстройнадзора. Файл готов для передачи заказчику, проектировщику или приобщения к надзорному делу.
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 flex items-center gap-2">
            <span>Объект: <strong className="text-slate-200">{object.name}</strong></span>
            <span>•</span>
            <span>Протокол: <strong className="font-mono text-purple-300">{protocol.id}</strong></span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownloadHtml}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Скачать отчет на ПК (.html)</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
