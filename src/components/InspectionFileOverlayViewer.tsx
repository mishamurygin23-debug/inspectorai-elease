import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Split,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  BookOpen,
  ArrowRight,
  Printer,
  Layers,
  ChevronRight,
  ChevronLeft,
  PenTool,
  Highlighter,
  Type,
  Maximize2,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  Sparkles,
  FileText,
  Clock,
  Download,
  Building2,
  Send,
  PlusCircle,
  FileCheck,
  CheckCheck
} from 'lucide-react';
import {
  CheckFinding,
  ConstructionObject,
  FindingStatus,
  RejectionReasonCode,
  Suspicion,
  UserRole
} from '../types';
import { PredpisanieModal } from './PredpisanieModal';

interface InspectionFileOverlayViewerProps {
  findings: CheckFinding[];
  selectedFindingId: string;
  onSelectFinding: (id: string) => void;
  currentObject: ConstructionObject;
  currentRole: UserRole;
  isFinalized: boolean;
  onUpdateFindingStatus: (
    findingId: string,
    status: FindingStatus,
    options?: {
      rejectionReason?: RejectionReasonCode;
      comment?: string;
      clarificationDetails?: string;
    }
  ) => void;
  onSplitFinding: (findingId: string) => void;
  onOpenRejectModal: () => void;
  onOpenClarifyModal: () => void;
  onFinalizeProtocol?: () => void;
  onOpenExport?: () => void;
  suspicions?: Suspicion[];
  onPromoteToCandidate?: (suspicionId: number) => void;
  onAddNewHypothesis?: (hypothesis: Omit<Suspicion, 'suspicion_id'>) => void;
}

// Exact PDF sheet excerpt definitions for each defect
export interface AuthenticPdfDocumentExcerpt {
  pdfFileName: string;
  pdfSheetTitle: string;
  pdfPageNumber: number;
  totalPages: number;
  gostCode: string;
  revision: string;
  date: string;
  erroneousSnippet: string;
  expectedSnippet: string;
  differenceDelta: string;
  inspectorStampText: string;
  normReference: string;
  normQuote: string;
  consequence: string;
  sheetType: 'GENERAL_NOTES' | 'SPECIFICATION_TABLE' | 'FLOOR_PLAN';
}

const PDF_EXCERPTS: Record<string, AuthenticPdfDocumentExcerpt> = {
  'AR-01': {
    pdfFileName: 'РД-2025-04-266-АР1.pdf',
    pdfSheetTitle: 'Лист 1. Общие данные (Обоснование, нормативы, ведомость чертежей, примечания)',
    pdfPageNumber: 3,
    totalPages: 15,
    gostCode: 'РД-2025-04.266-АР2',
    revision: 'Изм. 1',
    date: '16.04.2025',
    erroneousSnippet: '2. За отм. 0.000 принята отм. чистого пола 1 этажа здания, что соответствует абсолютной отм. 164,18.',
    expectedSnippet: 'За отм. 0.000 принята абсолютная отметка 165.00 м (ПД: лист 3, положительное заключение Мосгосэкспертизы)',
    differenceDelta: '-820 мм (грубое вертикальное занижение посадки здания)',
    inspectorStampText: 'НАРУШЕНИЕ ВЕРТИКАЛЬНОЙ ПЛАНИРОВКИ: Самовольное занижение отметки 0.000 на 820 мм относительно ГПЗУ и утвержденного ПД.',
    normReference: 'СП 118.13330.2022 п. 4.3; ГрК РФ ст. 52, 54',
    normQuote: '«Проектные решения по высотной посадке здания и отметке чистого пола 0.000 должны строго соответствовать утвержденному проекту и градостроительному плану земельного участка.»',
    consequence: 'Подтопление цокольного этажа талыми и дождевыми водами, нарушение стыка с высотными отметками Алтуфьевского шоссе.',
    sheetType: 'GENERAL_NOTES'
  },
  'AR-12': {
    pdfFileName: 'РД-2025-04-266-АР1.pdf',
    pdfSheetTitle: 'Лист 9. Схема расположения стеновых сэндвич-панелей и алюкобонда. Спецификация материалов',
    pdfPageNumber: 9,
    totalPages: 15,
    gostCode: 'РД-2025-04.266-АР2',
    revision: 'Изм. 2',
    date: '22.05.2025',
    erroneousSnippet: 'СП-01: Стеновые сэндвич-панели поэтажной разрезки «Венталл-С3» толщиной 150 мм (плотность 115 кг/м³)',
    expectedSnippet: 'Панели Rukki Rus толщиной 120 мм, плотность 105 кг/м³ (ПД: лист 8, раздел АР)',
    differenceDelta: '+30 мм толщины (+25% к постоянной нагрузке на несущий металлокаркас)',
    inspectorStampText: 'НАРУШЕНИЕ СТАТИЧЕСКОГО РАСЧЕТА МЕТАЛЛОКАРКАСА: Замена панелей 120 мм на 150 мм увеличила постоянную нагрузку без перерасчета балок.',
    normReference: 'СП 20.13330.2016 табл. 8.1; ГОСТ 32603-2021; ГрК РФ ст. 54',
    normQuote: '«Увеличение массы ограждающих конструкций более чем на 5% требует выполнения повторных прочностных расчетов несущих конструкций.»',
    consequence: 'Перегрузка стальных балок и прогиб фасадных ригелей выше допустимого предела.',
    sheetType: 'SPECIFICATION_TABLE'
  },
  'AR-41': {
    pdfFileName: 'РД-2025-04-266-АР1.pdf',
    pdfSheetTitle: 'Лист 12. Спецификация элементов заполнения проемов (двери, ворота, витражи)',
    pdfPageNumber: 12,
    totalPages: 15,
    gostCode: 'РД-2025-04.266-АР2',
    revision: 'Изм. 2',
    date: '28.05.2025',
    erroneousSnippet: 'Блок Д-12: Дверной блок металлический противопожарный ДПМ EI 60, размер 800 × 2100 мм (в свету 790 мм)',
    expectedSnippet: 'Блок Д-12: 1000 × 2100 мм (ширина эвакуационного выхода в свету не менее 900 мм)',
    differenceDelta: '-200 мм (заужение эвакуационного выхода на 21% ниже минимальной нормы)',
    inspectorStampText: 'КРИТИЧЕСКОЕ НАРУШЕНИЕ ПОЖАРНОЙ БЕЗОПАСНОСТИ: Заужение эвакуационного выхода из торгового зала с массовым пребыванием людей.',
    normReference: 'Федеральный закон № 123-ФЗ ст. 89; СП 1.13130.2020 п. 4.2.19',
    normQuote: '«Ширина эвакуационных выходов из помещений и коридоров должна быть не менее 1.0 м при числе эвакуирующихся более 50 человек.»',
    consequence: 'Угроза давки и затора при экстренной эвакуации людей при пожаре. Запрет Мосгосстройнадзора на ввод здания.',
    sheetType: 'SPECIFICATION_TABLE'
  },
  'AR-18': {
    pdfFileName: 'РД-2025-04.266-АР1_Планы_Узлы_Спецификации_Разрезы.pdf',
    pdfSheetTitle: 'Лист 18. Спецификация ворот погрузки сервисной зоны Вр-1..Вр-4',
    pdfPageNumber: 18,
    totalPages: 22,
    gostCode: 'РД-2025-04.266-АР1',
    revision: 'Изм. 4',
    date: '10.11.2025',
    erroneousSnippet: 'Ворота секционные подъемные Вр-1..Вр-4: габарит проема 3300 × 3600(h) мм',
    expectedSnippet: 'Ворота секционные Вр-1..Вр-4: проем 3000 × 3000(h) мм (ПД: лист 14)',
    differenceDelta: '+300 мм в ширину, +600 мм в высоту (смещение фахверковых стоек)',
    inspectorStampText: 'СМЕЩЕНИЕ НЕСУЩИХ СТОЕК КАРКАСА: Изменение габаритов проемов ворот без расчета на ветровые пульсации.',
    normReference: 'СП 16.13330.2017 п. 15.2; ГрК РФ ст. 52 ч. 7',
    normQuote: '«Изменение шага и расположения элементов несущего фахверка требует статического и динамического перерасчета конструкций.»',
    consequence: 'Ослабление фахверкового каркаса в зоне ветрового напора с риском деформации ограждений.',
    sheetType: 'SPECIFICATION_TABLE'
  },
  'OV-08': {
    pdfFileName: 'РД-2025-04.266-ОВ_Отопление_и_вентиляция_Схемы.pdf',
    pdfSheetTitle: 'Лист 7. Схема системы отопления серверной пом. 104',
    pdfPageNumber: 7,
    totalPages: 16,
    gostCode: 'РД-2025-04.266-ОВ',
    revision: 'Изм. 2',
    date: '28.11.2025',
    erroneousSnippet: 'Серверная пом. 104: отопление электроконвектором NOBO 2.0 кВт (водяное отопление исключено)',
    expectedSnippet: 'Отопление помещений серверной — водяное от ИТП, радиаторы Purmo (ПД: лист 6)',
    differenceDelta: 'Замена теплоносителя с воды на электричество без согласования ТУ Мосэнергосбыта',
    inspectorStampText: 'НЕСОГЛАСОВАННОЕ ИЗМЕНЕНИЕ ИНЖЕНЕРНЫХ СИСТЕМ: Исключение водяного отопления без ТУ на дополнительную электромощность.',
    normReference: 'СП 60.13330.2020 п. 6.4; ПУЭ п. 7.1.18',
    normQuote: '«Применение электронагревательных приборов в качестве постоянного отопления требует утвержденного лимита единовременной мощности.»',
    consequence: 'Превышение лимита электрической мощности здания, риск отключения автоматики защиты.',
    sheetType: 'GENERAL_NOTES'
  },
  'KJ-02': {
    pdfFileName: 'П-2025-04-266-КЖ01_Свайное_поле_364_сваи_Ростверки.pdf',
    pdfSheetTitle: 'Лист 4. Схема свайного поля (364 сваи). Отметки срубки оголовков свай',
    pdfPageNumber: 4,
    totalPages: 24,
    gostCode: 'П-2025-04-266-КЖ01',
    revision: 'Изм. 1',
    date: '14.10.2025',
    erroneousSnippet: 'Отметка верха оголовков забивных свай С90.40-8 после срубки: -1.830 м',
    expectedSnippet: 'Проектная отметка срубки голов забивных свай: -1.500 м (ПД: лист 5 ПЗУ)',
    differenceDelta: '-330 мм занижения голов свай (смещение монолитных ростверков)',
    inspectorStampText: 'НАРУШЕНИЕ НЕСУЩЕЙ СПОСОБНОСТИ СВАЙНОГО ОСНОВАНИЯ: Занижение голов свай на 330 мм без расчета узла на продавливание.',
    normReference: 'СП 24.13330.2021 п. 8.1; ГрК РФ ст. 52',
    normQuote: '«Глубина заделки арматурных выпусков свай в монолитный ростверк должна строго соответствовать расчету на продавливание.»',
    consequence: 'Нарушение анкеровки арматуры в ростверке, риск неравномерной осадки каркаса здания.',
    sheetType: 'FLOOR_PLAN'
  },
  'NVF-03': {
    pdfFileName: 'ИД_№1-НВФ7.7.2-Кр_Исполнительная_геодезическая_схема.pdf',
    pdfSheetTitle: 'Лист 1. Исполнительная геодезическая схема кронштейнов навесного вентилируемого фасада',
    pdfPageNumber: 1,
    totalPages: 8,
    gostCode: 'ИД-НВФ-01',
    revision: 'Заверена',
    date: '18.05.2026',
    erroneousSnippet: 'Кронштейн Кр-14 (ось 3, отм. +20.750): фактическое отклонение по вертикали +18 мм',
    expectedSnippet: 'Предельное отклонение кронштейнов НВФ от проектной плоскости: не более ±10 мм',
    differenceDelta: '+8 мм сверх предельно допустимой нормы по СП 70.13330',
    inspectorStampText: 'НАРУШЕНИЕ ГЕОДЕЗИЧЕСКИХ ДОПУСКОВ: Превышение отклонения плоскости направляющих фасадной системы.',
    normReference: 'СП 70.13330.2012 табл. 9.1; ГОСТ Р 58883-2020',
    normQuote: '«Отклонение плоскости направляющих кронштейнов НВФ от вертикали не должно превышать 10 мм на высоту этажа.»',
    consequence: 'Перекос облицовочных композитных панелей алюкобонда, угроза отрыва облицовки ветром.',
    sheetType: 'SPECIFICATION_TABLE'
  }
};

export const InspectionFileOverlayViewer: React.FC<InspectionFileOverlayViewerProps> = ({
  findings,
  selectedFindingId,
  onSelectFinding,
  currentObject,
  currentRole,
  isFinalized,
  onUpdateFindingStatus,
  onSplitFinding,
  onOpenRejectModal,
  onOpenClarifyModal,
  onFinalizeProtocol,
  onOpenExport,
  suspicions = [],
  onPromoteToCandidate,
  onAddNewHypothesis,
}) => {
  const [viewMode, setViewMode] = useState<'PDF_DOCUMENT_VIEW' | 'CAD_BLUEPRINT_VIEW' | 'SIDE_BY_SIDE_DIFF'>('PDF_DOCUMENT_VIEW');
  const [cadTheme, setCadTheme] = useState<'WHITE_PAPER' | 'CAD_DARK'>('WHITE_PAPER');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'CONFIRMED' | 'REJECTED' } | null>(null);
  const [isPredpisanieModalOpen, setIsPredpisanieModalOpen] = useState<boolean>(false);
  const [freeSearchQuery, setFreeSearchQuery] = useState<string>('');
  const [isSearchingHypotheses, setIsSearchingHypotheses] = useState<boolean>(false);
  const [searchedResults, setSearchedResults] = useState<Suspicion[]>([]);

  // Active finding
  const activeFinding = findings.find((f) => f.id === selectedFindingId) || findings[0];

  // Dynamic excerpt fallback for any code or hypothesis
  const getExcerpt = (finding?: CheckFinding): AuthenticPdfDocumentExcerpt => {
    if (!finding) return PDF_EXCERPTS['AR-01'];
    if (PDF_EXCERPTS[finding.param_code]) return PDF_EXCERPTS[finding.param_code];
    return {
      pdfFileName: finding.evidence_fragments?.[0]?.file_name || 'РД-2025-04.266-АР1.pdf',
      pdfSheetTitle: `${finding.evidence_fragments?.[0]?.sheet_page || 'Лист 4'}. ${finding.param_name}`,
      pdfPageNumber: 4,
      totalPages: 15,
      gostCode: finding.param_code,
      revision: 'Изм. 1',
      date: '2025-06-12',
      erroneousSnippet: `Фактическое решение (РД): ${finding.actual_value}`,
      expectedSnippet: `Проектное решение (ПД): ${finding.expected_value}`,
      differenceDelta: finding.delta || 'Выявлено расхождение между утвержденной ПД и комплектом РД',
      inspectorStampText: `КОЛЛИЗИЯ В ДОКУМЕНТАЦИИ: ${finding.justification || finding.param_name}`,
      normReference: finding.normative_reference || 'СП 118.13330.2022; ГрК РФ ст. 52, 54',
      normQuote: '«Проектные и рабочие решения должны строго соответствовать утвержденной проектной документации и нормам безопасности.»',
      consequence: 'Риск вынесения предписания Мосгосстройнадзора и задержки ввода объекта в эксплуатацию.',
      sheetType: 'SPECIFICATION_TABLE',
    };
  };

  const activeExcerpt = getExcerpt(activeFinding);
  const currentIndex = findings.findIndex((f) => f.id === activeFinding?.id);

  // Stats
  const confirmedCount = findings.filter((f) => f.finding_status === 'CONFIRMED_VIOLATION').length;
  const candidateCount = findings.filter((f) => f.finding_status === 'CANDIDATE').length;
  const rejectedCount = findings.filter((f) => f.finding_status === 'NEGATIVE_VERIFIED').length;
  const allReviewed = candidateCount === 0;

  // Clear notice after 3s
  useEffect(() => {
    if (actionNotice) {
      const t = setTimeout(() => setActionNotice(null), 3200);
      return () => clearTimeout(t);
    }
  }, [actionNotice]);

  // Navigate to previous finding
  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectFinding(findings[currentIndex - 1].id);
    } else {
      onSelectFinding(findings[findings.length - 1].id);
    }
  };

  // Navigate to next finding
  const handleNext = () => {
    if (currentIndex < findings.length - 1) {
      onSelectFinding(findings[currentIndex + 1].id);
    } else {
      onSelectFinding(findings[0].id);
    }
  };

  // 1-CLICK APPROVE AND AUTOMATICALLY ADVANCE TO NEXT
  const handleApproveAndAdvance = () => {
    if (!activeFinding || isFinalized) return;

    onUpdateFindingStatus(activeFinding.id, 'CONFIRMED_VIOLATION', {
      comment: 'Нарушение проверено инспектором по чертежам и спецификациям. Подтверждено.',
    });

    setActionNotice({
      text: `Замечание ${activeFinding.param_code} утверждено! Переход к следующему...`,
      type: 'CONFIRMED'
    });

    // Advance to next finding
    if (currentIndex < findings.length - 1) {
      onSelectFinding(findings[currentIndex + 1].id);
    } else {
      const nextCandidate = findings.find((f) => f.id !== activeFinding.id && f.finding_status === 'CANDIDATE');
      if (nextCandidate) {
        onSelectFinding(nextCandidate.id);
      }
    }
  };

  // BATCH APPROVE ALL CANDIDATES
  const handleApproveAll = () => {
    findings.forEach((f) => {
      if (f.finding_status === 'CANDIDATE') {
        onUpdateFindingStatus(f.id, 'CONFIRMED_VIOLATION', {
          comment: 'Пакетно утверждено инспектором по результатам сверки нормативной базы.',
        });
      }
    });

    setActionNotice({
      text: `Все замечания (${candidateCount}) успешно утверждены!`,
      type: 'CONFIRMED'
    });
  };

  // 1-CLICK REJECT AND AUTOMATICALLY ADVANCE TO NEXT
  const handleRejectAndAdvance = () => {
    if (!activeFinding || isFinalized) return;

    onUpdateFindingStatus(activeFinding.id, 'NEGATIVE_VERIFIED', {
      comment: 'Отклонено инспектором: параметры соответствуют действующим нормативам.',
    });

    setActionNotice({
      text: `Замечание ${activeFinding.param_code} отклонено (норма). Переход к следующему...`,
      type: 'REJECTED'
    });

    if (currentIndex < findings.length - 1) {
      onSelectFinding(findings[currentIndex + 1].id);
    }
  };

  // Handle Free Hypothesis search
  const handleSearchHypotheses = (queryText: string) => {
    if (!queryText.trim()) {
      setSearchedResults([]);
      return;
    }
    setIsSearchingHypotheses(true);
    setTimeout(() => {
      const q = queryText.toLowerCase();
      const matches = suspicions.filter(
        (s) =>
          s.description.toLowerCase().includes(q) ||
          s.pd_reference.toLowerCase().includes(q) ||
          s.rd_reference.toLowerCase().includes(q) ||
          s.normative_base.toLowerCase().includes(q)
      );
      setSearchedResults(matches.length > 0 ? matches : suspicions.slice(0, 3));
      setIsSearchingHypotheses(false);
    }, 400);
  };

  const handlePromoteHypothesis = (susp: Suspicion) => {
    if (onPromoteToCandidate) {
      onPromoteToCandidate(susp.suspicion_id);
      setActionNotice({
        text: `Гипотеза «${susp.description.substring(0, 30)}...» добавлена в протокол!`,
        type: 'CONFIRMED',
      });
    }
  };

  const filteredFindings = findings.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.param_code.toLowerCase().includes(q) ||
      f.param_name.toLowerCase().includes(q) ||
      f.actual_value.toLowerCase().includes(q) ||
      f.expected_value.toLowerCase().includes(q)
    );
  });

  return (
    <div id="protocol-verification-screen" className="space-y-4">
      {/* ACTION NOTICE TOAST */}
      {actionNotice && (
        <div className="fixed top-20 right-8 z-50 animate-bounce">
          <div className={`px-4 py-2.5 rounded-2xl shadow-2xl border-2 flex items-center space-x-2 text-xs font-black ${
            actionNotice.type === 'CONFIRMED'
              ? 'bg-rose-600 border-white text-white'
              : 'bg-emerald-600 border-white text-white'
          }`}>
            <Check className="w-4 h-4" />
            <span>{actionNotice.text}</span>
          </div>
        </div>
      )}

      {/* OFFICIAL PRED PISANIE MODAL */}
      <PredpisanieModal
        isOpen={isPredpisanieModalOpen}
        onClose={() => setIsPredpisanieModalOpen(false)}
        currentObject={currentObject}
        protocol={{
          id: 'prot-2026-07-altufievo',
          object_id: currentObject.id,
          version: '2.1',
          matrix_version: 'matrix-132-v4.2',
          dataset_version: 'gold-altufievo-79b-2026.07',
          model_version: 'inspector-layoutlmv3-altufievo-v2.4.2',
          input_manifest_hash: '8f3b2190c2a718d7b324021efbc3d67189a01f92e47854d19aa91f1c2491a92e',
          status: isFinalized ? 'FINALIZED' : 'VERIFYING',
          created_at: '2026-07-08T10:37:45Z',
          iais_sync_status: 'SYNCED',
          findings,
          suspicions,
        }}
        findings={findings}
      />

      {/* 1. TOP HEADER & DIRECT WORKFLOW BAR: "Верификация протокола" */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-xs font-black uppercase tracking-wider border border-rose-200">
                Верификация протокола
              </span>
              <span className="text-xs font-bold text-slate-500">
                Объект: {currentObject.name}
              </span>
              {isFinalized ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
                  ✓ ФИНАЛИЗИРОВАН
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-700" /> В ПРОЦЕССЕ СВЕРКИ
                </span>
              )}
            </div>
            <div className="text-sm font-black text-slate-900 mt-1 flex items-center space-x-2">
              <span>Замечание {currentIndex + 1} из {findings.length}:</span>
              <span className="text-rose-700 font-mono bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {activeFinding.param_code} — {activeFinding.param_name}
              </span>
            </div>
          </div>

          {/* Core Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {candidateCount > 0 && !isFinalized && (
              <button
                onClick={handleApproveAll}
                className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                title="Утвердить все оставшиеся замечания разом"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Утвердить все ({candidateCount})</span>
              </button>
            )}

            <button
              id="btn-approve-and-advance"
              onClick={handleApproveAndAdvance}
              disabled={isFinalized}
              className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer ${
                isFinalized
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
              title="Утвердить данное нарушение и сразу перейти к следующему замечанию"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Утвердить замечание и далее →</span>
            </button>

            <button
              onClick={handleRejectAndAdvance}
              disabled={isFinalized}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Отклонить замечание (соответствует нормам)"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
              <span>Отклонить (Норма) →</span>
            </button>

            {/* Stepper buttons (Back / Next) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={handlePrev}
                className="p-1.5 hover:bg-white rounded-lg text-slate-700 cursor-pointer"
                title="Предыдущее замечание"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono font-bold text-slate-700">
                {currentIndex + 1} / {findings.length}
              </span>
              <button
                onClick={handleNext}
                className="p-1.5 hover:bg-white rounded-lg text-slate-700 cursor-pointer"
                title="Следующее замечание"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress summary bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
              <span>Утверждено нарушений: <strong className="text-rose-700 font-mono">{confirmedCount}</strong></span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Осталось проверить: <strong className="text-amber-700 font-mono">{candidateCount}</strong></span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Отклонено: <strong className="text-emerald-700 font-mono">{rejectedCount}</strong></span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-500">Режим отображения:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
              <button
                onClick={() => setViewMode('PDF_DOCUMENT_VIEW')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'PDF_DOCUMENT_VIEW' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                📄 Лист PDF (как в Acrobat)
              </button>
              <button
                onClick={() => setViewMode('CAD_BLUEPRINT_VIEW')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'CAD_BLUEPRINT_VIEW' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                📐 Чертеж плана (САПР)
              </button>
              <button
                onClick={() => setViewMode('SIDE_BY_SIDE_DIFF')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'SIDE_BY_SIDE_DIFF' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                ⚖️ Сравнение ПД vs РД
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* POST-VERIFICATION ACTIONS: "ЧТО ДЕЛАТЬ ПОСЛЕ ТОГО КАК УТВЕРДИЛИ ВСЕ ЗАМЕЧАНИЯ" */}
      {(allReviewed || isFinalized) && (
        <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white rounded-2xl p-5 shadow-xl border-2 border-purple-500/40 space-y-3 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-purple-800/60 pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>Все {findings.length} замечаний успешно проверены!</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-500/50">
                    Утверждено: {confirmedCount} • Отклонено: {rejectedCount}
                  </span>
                </h3>
                <p className="text-xs text-purple-200">
                  Что делать дальше: выберите официальное действие для фиксации результатов надзора
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* Action 1: Form Official Predpisanie */}
            <button
              onClick={() => setIsPredpisanieModalOpen(true)}
              className="p-3.5 rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-left transition-all shadow-md hover:scale-[1.02] cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/20">
                    Шаг 1 • Документ
                  </span>
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div className="font-bold text-xs">Сформировать Предписание</div>
                <div className="text-[11px] text-rose-100 mt-1">
                  Генерация бланка по ст. 52, 54 ГрК РФ со сроком устранения 30 дней
                </div>
              </div>
              <div className="mt-3 text-[11px] font-black flex items-center gap-1 text-white underline">
                Открыть предписание →
              </div>
            </button>

            {/* Action 2: Sign UKEP & Finalize */}
            <button
              onClick={onFinalizeProtocol}
              disabled={isFinalized}
              className={`p-3.5 rounded-xl text-left transition-all shadow-md flex flex-col justify-between ${
                isFinalized
                  ? 'bg-purple-900/60 border border-purple-500/40 text-purple-300 cursor-default'
                  : 'bg-gradient-to-br from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white cursor-pointer hover:scale-[1.02]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/20">
                    Шаг 2 • Подпись
                  </span>
                  <ShieldCheck className="w-4 h-4 text-purple-200" />
                </div>
                <div className="font-bold text-xs">
                  {isFinalized ? 'Протокол подписан УКЭП' : 'Подписать с УКЭП и финализировать'}
                </div>
                <div className="text-[11px] text-purple-200 mt-1">
                  Электронная подпись ГОСТ Р 34.10 и блокировка от изменений
                </div>
              </div>
              <div className="mt-3 text-[11px] font-black flex items-center gap-1 text-white">
                {isFinalized ? '✓ Подписано' : 'Подписать сейчас →'}
              </div>
            </button>

            {/* Action 3: Transmit to IAIS RiN */}
            <button
              onClick={() => {
                setActionNotice({
                  text: 'Данные протокола переданы в ИАИС «РиН» Правительства Москвы!',
                  type: 'CONFIRMED'
                });
              }}
              className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-700 to-blue-700 hover:from-indigo-600 hover:to-blue-600 text-white text-left transition-all shadow-md hover:scale-[1.02] cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/20">
                    Шаг 3 • Интеграция
                  </span>
                  <Send className="w-4 h-4 text-white" />
                </div>
                <div className="font-bold text-xs">Передать в ИАИС «РиН»</div>
                <div className="text-[11px] text-indigo-100 mt-1">
                  Синхронизация статуса объекта надзора в единой системе Москвы
                </div>
              </div>
              <div className="mt-3 text-[11px] font-black flex items-center gap-1 text-white underline">
                Синхронизировать →
              </div>
            </button>

            {/* Action 4: Export PDF / ZIP package */}
            <button
              onClick={onOpenExport}
              className="p-3.5 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white text-left transition-all shadow-md hover:scale-[1.02] cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/20">
                    Шаг 4 • Архив
                  </span>
                  <Download className="w-4 h-4 text-slate-300" />
                </div>
                <div className="font-bold text-xs">Скачать пакет документов</div>
                <div className="text-[11px] text-slate-300 mt-1">
                  Итоговый протокол, выкопировки с красными отметками и реестр
                </div>
              </div>
              <div className="mt-3 text-[11px] font-black flex items-center gap-1 text-white underline">
                Экспорт ZIP/PDF →
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 2. BRIGHT RED BANNER SUMMARIZING WHAT IS ERRONEOUS IN THE FILE */}
      <div className="rounded-2xl border-2 border-rose-500 bg-rose-600 text-white shadow-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur border border-white/40 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-white text-rose-900 font-mono font-black">
                {activeFinding.param_code}
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-900/60 text-white font-bold uppercase text-[10px]">
                Ошибка в загруженном файле РД
              </span>
              <span className="text-rose-100 text-xs">
                Файл: <strong>{activeExcerpt.pdfFileName}</strong> (Стр. {activeExcerpt.pdfPageNumber} из {activeExcerpt.totalPages})
              </span>
            </div>

            <div className="text-sm font-black mt-1 leading-snug">
              {activeExcerpt.erroneousSnippet}
            </div>

            <div className="mt-2 text-xs text-rose-100 bg-rose-700/70 p-2.5 rounded-xl border border-rose-400/40 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white">Как должно быть по экспертизе (ПД): </span>
                <span>{activeExcerpt.expectedSnippet}</span>
              </div>
              <div className="font-mono font-black text-amber-200 bg-rose-900/60 px-2 py-0.5 rounded">
                Дельта: {activeExcerpt.differenceDelta}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: FINDINGS LIST ON LEFT + AUTHENTIC PDF/BLUEPRINT VIEWER ON RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: LIST OF FINDINGS (4 COLS) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-3 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="text-xs font-bold text-slate-800">
              Список замечаний к чертежам ({findings.length})
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Кандидаты: <strong className="text-amber-700">{candidateCount}</strong>
            </span>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Поиск по шифру, тексту..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          {/* Scrollable list */}
          <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
            {filteredFindings.map((finding) => {
              const isSelected = finding.id === activeFinding.id;
              const isConfirmed = finding.finding_status === 'CONFIRMED_VIOLATION';
              const isRejected = finding.finding_status === 'NEGATIVE_VERIFIED';

              return (
                <button
                  key={finding.id}
                  onClick={() => onSelectFinding(finding.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-50 border-rose-500 shadow-sm ring-1 ring-rose-500'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-mono text-xs font-black px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {finding.param_code}
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isConfirmed
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : isRejected
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {isConfirmed ? '✓ Нарушение' : isRejected ? '✕ Норма' : 'Кандидат'}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900 line-clamp-2">
                    {finding.param_name}
                  </div>

                  <div className="text-[11px] text-rose-700 font-medium mt-1 line-clamp-1">
                    {finding.delta}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: AUTHENTIC PDF VIEWER OR CAD BLUEPRINT (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          {/* VIEW 1: AUTHENTIC PDF SHEET VIEWER */}
          {viewMode === 'PDF_DOCUMENT_VIEW' && (
            <div className="bg-slate-200 rounded-2xl shadow-sm border border-slate-300 overflow-hidden flex flex-col">
              {/* Acrobat-like PDF Viewer Toolbar */}
              <div className="bg-slate-800 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3">
                  <div className="font-bold flex items-center space-x-1 text-slate-200">
                    <FileText className="w-4 h-4 text-rose-400" />
                    <span>{activeExcerpt.pdfFileName}</span>
                  </div>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-300 font-mono">
                    Стр. {activeExcerpt.pdfPageNumber} / {activeExcerpt.totalPages}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setZoomLevel((prev) => Math.max(0.7, prev - 0.1))}
                    className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
                    title="Уменьшить"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-slate-300 text-[11px]">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.min(1.5, prev + 0.1))}
                    className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
                    title="Увеличить"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
                    title="Сброс масштаба"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-slate-400">|</span>
                  <button
                    onClick={() => window.print()}
                    className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
                    title="Печать листа"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* The Actual PDF Document Sheet Canvas */}
              <div className="p-6 overflow-auto max-h-[720px] flex justify-center bg-slate-300/80">
                <div
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                  className="w-[740px] bg-white text-slate-900 shadow-2xl border border-slate-400 p-8 flex flex-col justify-between font-serif text-[12px] leading-relaxed transition-transform duration-200"
                >
                  {/* Sheet Header (GOST Document Title) */}
                  <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between">
                    <div>
                      <div className="font-sans font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                        ООО «Моспроекткомплекс» • Шифр: {activeExcerpt.gostCode}
                      </div>
                      <h4 className="font-sans font-black text-sm text-slate-900 mt-0.5">
                        {activeExcerpt.pdfSheetTitle}
                      </h4>
                      <div className="font-sans text-[11px] text-slate-600">
                        Объект: {currentObject.name}
                      </div>
                    </div>
                    <div className="font-sans text-right text-[11px] text-slate-600">
                      <div>Стадия: <strong>РД</strong></div>
                      <div>Лист: <strong>{activeExcerpt.pdfPageNumber}</strong> / {activeExcerpt.totalPages}</div>
                      <div>{activeExcerpt.revision} ({activeExcerpt.date})</div>
                    </div>
                  </div>

                  {/* Sheet Body Content based on Sheet Type */}
                  <div className="space-y-4 my-2 flex-1">
                    {/* General Notes Type */}
                    {activeExcerpt.sheetType === 'GENERAL_NOTES' && (
                      <div className="space-y-2">
                        <div className="font-sans font-bold text-xs uppercase text-slate-800 border-b border-slate-300 pb-1">
                          1. Общие указания и высотная схема здания:
                        </div>
                        <ol className="list-decimal list-inside space-y-1.5 pl-2 text-justify">
                          <li>
                            Проект разработан на основании задания на проектирование, ГПЗУ и технических условий.
                          </li>
                          <li className="relative group">
                            {/* BRIGHT RED HIGHLIGHT BOX */}
                            <span className="bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded shadow-sm">
                              {activeExcerpt.erroneousSnippet}
                            </span>
                            <span className="ml-2 inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-black bg-rose-700 text-white uppercase animate-pulse">
                              ⚠️ ОШИБКА РД ({activeFinding.param_code})
                            </span>
                          </li>
                          <li>
                            Климатический район строительства — II, подрайон IIB по СП 131.13330.2020.
                          </li>
                          <li>
                            Степень огнестойкости здания — II, класс конструктивной пожарной опасности — С0.
                          </li>
                          <li>
                            Все работы вести в соответствии со СП 70.13330.2012 «Несущие и ограждающие конструкции».
                          </li>
                        </ol>
                      </div>
                    )}

                    {/* Specification Table Type */}
                    {activeExcerpt.sheetType === 'SPECIFICATION_TABLE' && (
                      <div className="space-y-2">
                        <div className="font-sans font-bold text-xs uppercase text-slate-800 border-b border-slate-300 pb-1">
                          Спецификация элементов и конструкций (ГОСТ 21.501-2018):
                        </div>
                        <table className="w-full border-collapse border border-slate-400 text-[11px] font-sans">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="border border-slate-400 p-1.5 text-left w-16">Поз.</th>
                              <th className="border border-slate-400 p-1.5 text-left">Обозначение и наименование</th>
                              <th className="border border-slate-400 p-1.5 text-center w-20">Кол-во</th>
                              <th className="border border-slate-400 p-1.5 text-left w-36">Примечание</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-slate-400 p-1.5 font-bold">1</td>
                              <td className="border border-slate-400 p-1.5">Колонны стальные двутавровые 30К1 (СТО АСЧМ 20-93)</td>
                              <td className="border border-slate-400 p-1.5 text-center font-mono">24 шт.</td>
                              <td className="border border-slate-400 p-1.5 text-slate-600">Сталь С345</td>
                            </tr>
                            <tr className="bg-rose-100/80">
                              <td className="border border-rose-500 p-1.5 font-bold text-rose-800">2</td>
                              <td className="border border-rose-500 p-1.5">
                                <span className="bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded">
                                  {activeExcerpt.erroneousSnippet}
                                </span>
                              </td>
                              <td className="border border-rose-500 p-1.5 text-center font-mono font-bold text-rose-800">1 компл.</td>
                              <td className="border border-rose-500 p-1.5 font-bold text-rose-800">
                                ⚠️ {activeFinding.param_code} (Несоответствие ПД)
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-slate-400 p-1.5 font-bold">3</td>
                              <td className="border border-slate-400 p-1.5">Ригели фахверка из швеллеров гнутых 160×80×4</td>
                              <td className="border border-slate-400 p-1.5 text-center font-mono">48 шт.</td>
                              <td className="border border-slate-400 p-1.5 text-slate-600">По узлу 4/АР</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Floor Plan Type */}
                    {activeExcerpt.sheetType === 'FLOOR_PLAN' && (
                      <div className="space-y-2">
                        <div className="font-sans font-bold text-xs uppercase text-slate-800 border-b border-slate-300 pb-1">
                          Фрагмент плана на отм. 0.000 в осях 1-6 / А-В:
                        </div>
                        <div className="border border-slate-300 p-3 bg-slate-50 rounded space-y-2 font-sans text-xs">
                          <div className="p-2 bg-rose-600 text-white font-bold rounded">
                            ⚠️ {activeExcerpt.erroneousSnippet}
                          </div>
                          <div className="text-slate-600 text-[11px]">
                            По проектной документации ПД предусмотрено: {activeExcerpt.expectedSnippet}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* RED STAMP OF MOSGOSSTROY NADZOR */}
                    <div className="mt-4 p-3 border-2 border-rose-600 bg-rose-50 rounded-xl flex items-start space-x-3 text-rose-950 font-sans">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <div className="font-bold uppercase tracking-wider text-rose-800 text-[11px]">
                          Замечание ИИ Мосгосстройнадзора ({activeFinding.param_code}):
                        </div>
                        <div className="font-medium mt-0.5">
                          {activeExcerpt.inspectorStampText}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1">
                          <strong>Норматив:</strong> {activeExcerpt.normReference}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GOST Sheet Stamp Title Block at Bottom Right */}
                  <div className="border-t-2 border-slate-900 pt-3 mt-4 flex items-end justify-between font-sans text-[10px]">
                    <div className="text-slate-500">
                      Лист сгенерирован системой автоматизированной сверки ПД/РД Мосгосстройнадзора
                    </div>
                    <div className="border border-slate-800 p-2 text-right bg-slate-50">
                      <div className="font-bold text-slate-900">МОСГОССТРОЙНАДЗОР</div>
                      <div className="text-slate-600 font-mono text-[9px]">ID: {activeFinding.id}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: CAD BLUEPRINT VIEW */}
          {viewMode === 'CAD_BLUEPRINT_VIEW' && (
            <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden flex flex-col p-4 text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="font-bold text-xs flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Векторная САПР-схема этажа (dwg/dxf)</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <button
                    onClick={() => setCadTheme(cadTheme === 'WHITE_PAPER' ? 'CAD_DARK' : 'WHITE_PAPER')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-bold cursor-pointer"
                  >
                    Тема: {cadTheme === 'WHITE_PAPER' ? 'Бумага' : 'CAD Dark'}
                  </button>
                </div>
              </div>

              <div className="py-6 flex justify-center items-center">
                <div className="relative w-[720px] h-[400px] bg-white border-2 border-slate-300 rounded-xl shadow-lg p-6">
                  <svg className="w-full h-full" viewBox="0 0 720 400">
                    {[80, 220, 360, 500, 640].map((x, i) => (
                      <g key={i}>
                        <line x1={x} y1="30" x2={x} y2="370" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" />
                        <circle cx={x} cy="20" r="10" fill="#f1f5f9" stroke="#64748b" />
                        <text x={x} y="24" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">
                          {['1', '3', '5', '7', '8'][i]}
                        </text>
                      </g>
                    ))}

                    {[60, 200, 340].map((y, i) => (
                      <g key={i}>
                        <line x1="60" y1={y} x2="660" y2={y} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" />
                        <circle cx="50" cy={y} r="10" fill="#f1f5f9" stroke="#64748b" />
                        <text x="50" y={y + 4} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">
                          {['А', 'Б', 'В'][i]}
                        </text>
                      </g>
                    ))}

                    <rect x="80" y="60" width="560" height="280" fill="none" stroke="#1e293b" strokeWidth="4" />

                    <text x="360" y="180" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#334155">
                      Торговый зал (вместимость 120 чел.)
                    </text>
                    <text x="360" y="205" textAnchor="middle" fontSize="11" fill="#64748b">
                      Отм. чистого пола: 0.000 = 164.18 м ⚠️ (по ПД должно быть 165.00 м)
                    </text>
                  </svg>

                  <div className="absolute top-1/3 left-1/4 border-2 border-dashed border-rose-600 bg-rose-500/20 rounded-xl p-3 shadow-xl backdrop-blur">
                    <div className="bg-rose-600 text-white font-mono text-xs font-black px-2 py-0.5 rounded inline-block mb-1">
                      {activeFinding.param_code}
                    </div>
                    <div className="text-xs font-bold text-rose-950">
                      {activeExcerpt.erroneousSnippet}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: SIDE-BY-SIDE DIFF */}
          {viewMode === 'SIDE_BY_SIDE_DIFF' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Split className="w-4 h-4 text-purple-700" />
                Сравнение проектных значений: ПД (Экспертиза) против РД (Рабочка)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border-2 border-rose-500 bg-rose-50 p-4 space-y-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-600 text-white">
                    1. Рабочая документация РД (Ошибка ❌)
                  </span>
                  <div className="text-xs text-rose-900 font-mono font-bold">
                    {activeExcerpt.pdfFileName}
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-rose-300 text-xs font-mono text-slate-800">
                    {activeExcerpt.erroneousSnippet}
                  </div>
                </div>

                <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4 space-y-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-600 text-white">
                    2. Проектная документация ПД (Эталон ✅)
                  </span>
                  <div className="text-xs text-emerald-900 font-mono font-bold">
                    ЖС-РЛ-270121-АР_ПД_Архитектурные_решения.pdf
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-300 text-xs font-mono text-slate-800">
                    {activeExcerpt.expectedSnippet}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. INTEGRATED FREE HYPOTHESIS SEARCH */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Свободный поиск гипотез и скрытых коллизий ИИ
                  </h3>
                  <p className="text-xs text-slate-500">
                    Произвольный анализ загруженных чертежей: задайте любой вопрос или выберите готовую инженерную гипотезу
                  </p>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Задайте любой вопрос или гипотезу к чертежам (например: «Проверь предел огнестойкости сэндвич-панелей»)..."
                  value={freeSearchQuery}
                  onChange={(e) => setFreeSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchHypotheses(freeSearchQuery);
                  }}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <button
                onClick={() => handleSearchHypotheses(freeSearchQuery)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Искать коллизии</span>
              </button>
            </div>

            {/* 4 One-click Quick Hypothesis Prompts */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-600">Готовые инженерные гипотезы ИИ для этого объекта:</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '🔥 Огнестойкость сэндвич-панелей (EI 150 vs EI 90)', q: 'огнестойкость' },
                  { label: '🏢 Назначение пом. 104 (ИТП vs Серверная)', q: 'серверная' },
                  { label: '🏗️ Расход арматуры ростверков (+28%)', q: 'арматура' },
                  { label: '📐 Отклонение кронштейнов НВФ (+18 мм)', q: 'кронштейн' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setFreeSearchQuery(chip.label);
                      handleSearchHypotheses(chip.q);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Results List */}
            {searchedResults.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-slate-800">
                  Найдено гипотез ИИ: {searchedResults.length}
                </div>
                <div className="space-y-2.5">
                  {searchedResults.map((susp) => (
                    <div
                      key={susp.suspicion_id}
                      className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded font-black text-[10px] bg-indigo-600 text-white">
                          ИИ уверенность: {Math.round(susp.confidence * 100)}%
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          Норматив: {susp.normative_base}
                        </span>
                      </div>

                      <div className="font-bold text-slate-900 text-xs">
                        {susp.description}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded-lg border border-slate-200">
                        <div>
                          <strong className="text-slate-600">ПД:</strong> {susp.pd_reference}
                        </div>
                        <div>
                          <strong className="text-rose-700">РД:</strong> {susp.rd_reference}
                        </div>
                      </div>

                      <div className="flex items-center justify-end pt-1">
                        <button
                          onClick={() => handlePromoteHypothesis(susp)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>+ Добавить в протокол как замечание</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
