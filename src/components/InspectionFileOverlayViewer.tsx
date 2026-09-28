import React, { useState, useEffect, useMemo } from 'react';
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
  Minimize2,
  LayoutTemplate,
  MoveHorizontal,
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
  CheckCheck,
  Crosshair,
  Scan,
  Sliders
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
import { ActualPdfViewer, UploadedPdfMetadata } from './ActualPdfViewer';
import { downloadFullDocumentReport } from '../utils/reportGenerator';

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
  onOpenVisualizer?: (suspicion: Suspicion) => void;
  uploadedPdfBlobUrl?: string;
  uploadedPdfFileName?: string;
  uploadedPdfSizeMb?: number;
  uploadedFilesList?: UploadedPdfMetadata[];
  onSelectUploadedPdf?: (fileId: string) => void;
  onUploadNewPdfFile?: (file: File) => void;
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
    pdfFileName: 'РД-2025-04.266-АР1_Планы_Узлы_Спецификации_Разрезы.pdf',
    pdfSheetTitle: 'Лист 1. Общие данные (Обоснование, нормативы, ведомость чертежей, примечания)',
    pdfPageNumber: 2,
    totalPages: 5,
    gostCode: 'РД-2025-04.266-АР1',
    revision: 'Изм. 4',
    date: '10.11.2025',
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
    pdfFileName: 'РД-2025-04.266-АР2_Фасады_Раскладка_панелей_Витражи.pdf',
    pdfSheetTitle: 'Лист 9. Схема расположения стеновых сэндвич-панелей и алюкобонда. Спецификация материалов',
    pdfPageNumber: 3,
    totalPages: 4,
    gostCode: 'РД-2025-04.266-АР2',
    revision: 'Изм. 3',
    date: '04.12.2025',
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
    pdfFileName: 'РД-2025-04.266-АР1_Планы_Узлы_Спецификации_Разрезы.pdf',
    pdfSheetTitle: 'Лист 16. Спецификация элементов заполнения проемов (двери, ворота, витражи)',
    pdfPageNumber: 5,
    totalPages: 5,
    gostCode: 'РД-2025-04.266-АР1',
    revision: 'Изм. 4',
    date: '10.11.2025',
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
    pdfSheetTitle: 'Лист 15. Спецификация ворот погрузки сервисной зоны Вр-1..Вр-4',
    pdfPageNumber: 4,
    totalPages: 5,
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
    pdfSheetTitle: 'Лист 1. Общие указания и схема системы отопления серверной пом. 104',
    pdfPageNumber: 2,
    totalPages: 3,
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
    pdfPageNumber: 2,
    totalPages: 3,
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
    pdfPageNumber: 2,
    totalPages: 2,
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
  onOpenVisualizer,
  uploadedPdfBlobUrl,
  uploadedPdfFileName,
  uploadedPdfSizeMb,
  uploadedFilesList,
  onSelectUploadedPdf,
  onUploadNewPdfFile,
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

  // Document scope & landscape full-width expansion
  const [findingScope, setFindingScope] = useState<'CURRENT_DOCUMENT' | 'ALL_PROJECT'>('CURRENT_DOCUMENT');
  const [isExpandedLandscape, setIsExpandedLandscape] = useState<boolean>(false);

  // Helper: check whether a finding belongs to the loaded document
  const doesFindingBelong = (finding: CheckFinding, fileName?: string): boolean => {
    if (!fileName) return true;
    const fLower = fileName.toLowerCase().trim();

    // 0. Stage PD (эталон) has NO violations by definition - it is the approved standard
    const isPd =
      fLower.startsWith('пд') ||
      fLower.includes('_пд') ||
      fLower.includes('-пд') ||
      fLower.includes('стадия п') ||
      fLower.includes('эталон');
    if (isPd) {
      return false;
    }

    // 1. Evidence fragments direct match by filename or document code
    if (finding.evidence_fragments && finding.evidence_fragments.length > 0) {
      const hasDirectMatch = finding.evidence_fragments.some((frag) => {
        if (!frag.file_name) return false;
        const fragLower = frag.file_name.toLowerCase().trim();
        const baseDoc = fLower.replace(/\.pdf$/i, '');
        const baseFrag = fragLower.replace(/\.pdf$/i, '');
        if (baseDoc.includes(baseFrag) || baseFrag.includes(baseDoc)) return true;
        if (frag.document_code && fLower.includes(frag.document_code.toLowerCase().trim())) return true;
        return false;
      });
      if (hasDirectMatch) return true;
    }

    // Do not fabricate defects for clean files! Return false if not explicitly matched.
    return false;
  };

  // Findings that belong to the loaded PDF
  const documentFindings = useMemo(() => {
    return findings.filter((f) => doesFindingBelong(f, uploadedPdfFileName));
  }, [findings, uploadedPdfFileName]);

  // Active pool of findings depending on user selected scope
  const activeScopeFindings = findingScope === 'CURRENT_DOCUMENT' ? documentFindings : findings;

  // Active finding strictly from active scope (null if loaded document has 0 defects!)
  const activeFinding = useMemo(() => {
    if (activeScopeFindings.length === 0) return null;
    const match = activeScopeFindings.find((f) => f.id === selectedFindingId);
    return match || activeScopeFindings[0];
  }, [activeScopeFindings, selectedFindingId]);

  // Dynamic excerpt fallback for any code or hypothesis
  const getExcerpt = (finding?: CheckFinding | null): AuthenticPdfDocumentExcerpt => {
    if (!finding) {
      return {
        pdfFileName: uploadedPdfFileName || 'Рабочий_чертеж.pdf',
        pdfSheetTitle: 'Лист рабочей документации',
        pdfPageNumber: 1,
        totalPages: 1,
        gostCode: 'ГОСТ Р 21.101-2020',
        revision: 'Изм. 0',
        date: '2026-07-10',
        erroneousSnippet: 'В данном документе замечаний не выявлено',
        expectedSnippet: 'Все проектные решения соответствуют требованиям СП и нормам безопасности РФ',
        differenceDelta: '0 мм (норма)',
        inspectorStampText: 'НАРУШЕНИЙ НЕ ОБНАРУЖЕНО (СООТВЕТСТВУЕТ НОРМАМ)',
        normReference: 'СПДС, СП 60.13330.2020, СП 118.13330.2022',
        normQuote: '«Проектные и рабочие решения строго соответствуют утвержденной проектной документации и нормам безопасности РФ.»',
        consequence: 'Отсутствуют риски предписаний надзорных органов.',
        sheetType: 'SPECIFICATION_TABLE',
      };
    }
    if (PDF_EXCERPTS[finding.param_code]) return PDF_EXCERPTS[finding.param_code];
    return {
      pdfFileName: finding.evidence_fragments?.[0]?.file_name || uploadedPdfFileName || 'РД-2025-04.266-АР1.pdf',
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
  const currentIndex = activeFinding ? activeScopeFindings.findIndex((f) => f.id === activeFinding.id) : -1;

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
    if (activeScopeFindings.length === 0) return;
    if (currentIndex > 0) {
      onSelectFinding(activeScopeFindings[currentIndex - 1].id);
    } else {
      onSelectFinding(activeScopeFindings[activeScopeFindings.length - 1].id);
    }
  };

  // Navigate to next finding
  const handleNext = () => {
    if (activeScopeFindings.length === 0) return;
    if (currentIndex < activeScopeFindings.length - 1) {
      onSelectFinding(activeScopeFindings[currentIndex + 1].id);
    } else {
      onSelectFinding(activeScopeFindings[0].id);
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

    // Advance to next finding in active scope
    if (currentIndex < activeScopeFindings.length - 1) {
      onSelectFinding(activeScopeFindings[currentIndex + 1].id);
    } else {
      const nextCandidate = activeScopeFindings.find((f) => f.id !== activeFinding.id && f.finding_status === 'CANDIDATE');
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

    if (currentIndex < activeScopeFindings.length - 1) {
      onSelectFinding(activeScopeFindings[currentIndex + 1].id);
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

  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('ALL');

  // Auto-detect discipline filter and relevant finding based on uploaded file name
  useEffect(() => {
    if (!uploadedPdfFileName) return;
    const fLower = uploadedPdfFileName.toLowerCase();
    if (fLower.includes('ов') || fLower.includes('отоплен') || fLower.includes('вентил') || fLower.includes('hvac')) {
      setSelectedSectionFilter('ИОС4');
      const ovFinding = findings.find((f) => f.section === 'ИОС4' || f.param_code.startsWith('OV'));
      if (ovFinding && activeFinding && activeFinding.section !== 'ИОС4') {
        onSelectFinding(ovFinding.id);
      }
    } else if (fLower.includes('кж') || fLower.includes('сваи') || fLower.includes('фундамент')) {
      setSelectedSectionFilter('КР');
    }
  }, [uploadedPdfFileName]);

  const filteredFindings = activeScopeFindings.filter((f) => {
    if (selectedSectionFilter !== 'ALL' && f.section !== selectedSectionFilter) {
      return false;
    }
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

            {activeFinding ? (
              <div className="text-sm font-black text-slate-900 mt-1 flex items-center space-x-2">
                <span>Замечание {currentIndex + 1} из {activeScopeFindings.length}:</span>
                <span className="text-rose-700 font-mono bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {activeFinding.param_code} — {activeFinding.param_name}
                </span>
              </div>
            ) : (
              <div className="text-sm font-black text-emerald-800 mt-1 flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  В загруженном файле замечаний не выявлено (0 нарушений)
                </span>
                <span className="text-xs text-slate-500 truncate max-w-xs">
                  {uploadedPdfFileName || 'Текущий чертеж'}
                </span>
              </div>
            )}
          </div>

          {/* Core Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {activeFinding ? (
              <>
                {/* CV Graphic Inspector Button for Active Finding */}
                {onOpenVisualizer && (
                  <button
                    onClick={() => {
                      const matchedSusp = suspicions.find(
                        (s) =>
                          s.description.toLowerCase().includes(activeFinding.param_name.toLowerCase()) ||
                          s.discipline === activeFinding.section ||
                          s.normative_base === activeFinding.normative_reference
                      ) || suspicions[0] || {
                        suspicion_id: 9999,
                        object_id: currentObject.id,
                        discipline: activeFinding.section,
                        discovery_method: 'CV_BBOX_DELTA',
                        description: `[BBox-коллизия] ${activeFinding.param_name}: ${activeFinding.delta}`,
                        confidence: 0.94,
                        pd_reference: activeFinding.normative_reference || 'ПД: Раздел АР, лист 12',
                        rd_reference: `${activeExcerpt.pdfFileName}, лист ${activeExcerpt.pdfPageNumber}`,
                        normative_base: activeFinding.normative_reference || 'СП 118.13330.2022',
                        bbox: { x: 340, y: 280, width: 220, height: 160, sheet_number: `Лист ${activeExcerpt.pdfPageNumber}` },
                      };
                      onOpenVisualizer(matchedSusp);
                    }}
                    className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                    title="Открыть визуализатор Computer Vision (BBox, Сплит-скрин, Наложение кальки)"
                  >
                    <Scan className="w-4 h-4 text-indigo-600 animate-pulse" />
                    <span>CV-Визуализатор BBox</span>
                  </button>
                )}

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
                    {currentIndex + 1} / {activeScopeFindings.length}
                  </span>
                  <button
                    onClick={handleNext}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-700 cursor-pointer"
                    title="Следующее замечание"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Лист проверен • Все решения соответствуют СП
                </span>
                {findings.length > 0 && findingScope === 'CURRENT_DOCUMENT' && (
                  <button
                    onClick={() => setFindingScope('ALL_PROJECT')}
                    className="px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    Показать замечания по объекту ({findings.length}) →
                  </button>
                )}
              </div>
            )}
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
              <button
                onClick={() => {
                  downloadFullDocumentReport({
                    object: currentObject,
                    protocol: {
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
                    },
                    suspicions,
                  });
                  setActionNotice({
                    text: 'Полный отчет по документу с выделением текста успешно скачан на ваш ПК (.html)!',
                    type: 'CONFIRMED',
                  });
                }}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Скачать на компьютер полный отчет по документу с цветным выделением текста и разбором ошибок"
              >
                <Download className="w-3.5 h-3.5" />
                <span>📥 Скачать отчет на ПК</span>
              </button>

              {/* Landscape 100% Screen Width Toggle */}
              <button
                onClick={() => setIsExpandedLandscape((prev) => !prev)}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer ${
                  isExpandedLandscape
                    ? 'bg-purple-700 text-white shadow-xs ring-2 ring-purple-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                }`}
                title={
                  isExpandedLandscape
                    ? 'Вернуть список замечаний слева'
                    : 'Развернуть PDF-чертеж на 100% ширины экрана (скрыть панель замечаний для удобного просмотра альбома)'
                }
              >
                {isExpandedLandscape ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-purple-600" />}
                <span>{isExpandedLandscape ? '⤡ Показать замечания' : '📐 Альбомный режим (100% ширины)'}</span>
              </button>

              <span className="text-[11px] text-slate-500 hidden sm:inline">Режим:</span>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                <button
                  onClick={() => setViewMode('PDF_DOCUMENT_VIEW')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    viewMode === 'PDF_DOCUMENT_VIEW' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  📄 Лист PDF
                </button>
                <button
                  onClick={() => setViewMode('CAD_BLUEPRINT_VIEW')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    viewMode === 'CAD_BLUEPRINT_VIEW' ? 'bg-purple-700 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  📐 Чертеж
                </button>
                <button
                  onClick={() => setViewMode('SIDE_BY_SIDE_DIFF')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    viewMode === 'SIDE_BY_SIDE_DIFF' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  ⚖️ ПД vs РД
                </button>
              </div>
            </div>
        </div>
      </div>

      {/* 2. BANNER: SHOW DEFECT IF ACTIVE FINDING EXISTS FOR THIS FILE, OR COMPLIANCE IF NONE */}
      {activeFinding ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50/90 text-rose-950 p-4 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-rose-200/80 text-rose-900 font-mono font-bold">
                  {activeFinding.param_code}
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold uppercase text-[10px]">
                  Несоответствие РД проекту
                </span>
                <span className="text-slate-600 text-xs">
                  Чертеж: <strong>{activeExcerpt.pdfFileName}</strong> (Стр. {activeExcerpt.pdfPageNumber} из {activeExcerpt.totalPages})
                </span>
              </div>

              <div className="text-sm font-bold text-rose-950 mt-1.5 leading-snug">
                {activeExcerpt.erroneousSnippet}
              </div>

              <div className="mt-2 text-xs bg-white p-2.5 rounded-lg border border-rose-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-700">Эталон по экспертизе (ПД): </span>
                  <span className="text-slate-900">{activeExcerpt.expectedSnippet}</span>
                </div>
                <div className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Дельта: {activeExcerpt.differenceDelta}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 text-emerald-950 p-4 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900 font-bold uppercase text-[10px]">
                  ✓ Соответствует нормам
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium text-[10px]">
                  {uploadedPdfFileName?.includes('ОВ') ? 'Раздел ИОС4' : 'Рабочая документация'}
                </span>
                <span className="text-slate-600 text-xs">
                  Файл: <strong>{uploadedPdfFileName || 'Текущий документ'}</strong>
                </span>
              </div>

              <div className="text-sm font-bold text-emerald-950 mt-1.5 leading-snug">
                В загруженном документе замечаний не выявлено
              </div>

              <div className="mt-2 text-xs bg-white p-2.5 rounded-lg border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-700">Статус сверки: </span>
                  <span className="text-slate-900">Все решения, размеры и спецификации соответствуют требованиям СП и нормам РФ.</span>
                </div>
                {findings.length > 0 && findingScope === 'CURRENT_DOCUMENT' && (
                  <button
                    onClick={() => setFindingScope('ALL_PROJECT')}
                    className="text-[11px] font-bold bg-purple-700 text-white hover:bg-purple-800 px-2.5 py-1 rounded-lg cursor-pointer transition-all shadow-xs"
                  >
                    Показать замечания по другим разделам ({findings.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN WORKSPACE: FINDINGS LIST ON LEFT + AUTHENTIC PDF/BLUEPRINT VIEWER ON RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: LIST OF FINDINGS (4 COLS, collapsed when isExpandedLandscape is true or when 0 findings) */}
        {!isExpandedLandscape && activeScopeFindings.length > 0 && (
          <div className="lg:col-span-4 bg-white rounded-2xl p-3 shadow-sm border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="text-xs font-bold text-slate-800">
                Список замечаний ({activeScopeFindings.length})
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Кандидаты: <strong className="text-amber-700">{candidateCount}</strong>
              </span>
            </div>

            {/* Document Scope Toggle (Current Document vs All Project) */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-[11px] font-bold">
              <button
                onClick={() => setFindingScope('CURRENT_DOCUMENT')}
                className={`py-1 px-1.5 rounded-lg text-center transition-all cursor-pointer truncate ${
                  findingScope === 'CURRENT_DOCUMENT'
                    ? 'bg-white text-purple-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Показывать только замечания к загруженному файлу"
              >
                📌 В файле ({documentFindings.length})
              </button>
              <button
                onClick={() => setFindingScope('ALL_PROJECT')}
                className={`py-1 px-1.5 rounded-lg text-center transition-all cursor-pointer truncate ${
                  findingScope === 'ALL_PROJECT'
                    ? 'bg-white text-purple-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Показывать замечания по всем разделам проекта"
              >
                🏢 Весь объект ({findings.length})
              </button>
            </div>

          {/* Discipline tabs */}
          <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-2">
            {[
              { id: 'ALL', label: `Все (${findings.length})` },
              { id: 'АР', label: `АР (${findings.filter((f) => f.section === 'АР').length})` },
              { id: 'ИОС4', label: `ОВ / Отопление (${findings.filter((f) => f.section === 'ИОС4' || f.param_code.startsWith('OV')).length})` },
              { id: 'КР', label: `КР (${findings.filter((f) => f.section === 'КР').length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedSectionFilter(tab.id)}
                className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                  selectedSectionFilter === tab.id
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
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
            {filteredFindings.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-800">Замечаний не обнаружено</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  В текущей выборке ({findingScope === 'CURRENT_DOCUMENT' ? 'для этого файла' : 'по фильтру'}) замечания отсутствуют.
                </div>
                {findingScope === 'CURRENT_DOCUMENT' && findings.length > 0 && (
                  <button
                    onClick={() => setFindingScope('ALL_PROJECT')}
                    className="mt-3 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    Показать все замечания проекта ({findings.length})
                  </button>
                )}
              </div>
            ) : (
              filteredFindings.map((finding) => {
                const isSelected = activeFinding ? finding.id === activeFinding.id : false;
                const isConfirmed = finding.finding_status === 'CONFIRMED_VIOLATION';
                const isRejected = finding.finding_status === 'NEGATIVE_VERIFIED';

                // Extract sheet info
                const frag = finding.evidence_fragments?.find((f) => f.role === 'ACTUAL') || finding.evidence_fragments?.[0];
                const sheetName = frag?.sheet_page || (finding.param_code === 'AR-01' ? 'Лист 1 (Общие данные)' : 'Лист чертежа');

                return (
                  <div
                    key={finding.id}
                    onClick={() => onSelectFinding(finding.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50/80 border-rose-500 shadow-sm ring-1 ring-rose-500'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`font-mono text-xs font-black px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {finding.param_code}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isConfirmed
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : isRejected
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {isConfirmed ? '✓ Нарушение' : isRejected ? '✕ Норма' : 'Кандидат'}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-900 line-clamp-2">
                      {finding.param_name}
                    </div>

                    <div className="text-[11px] text-rose-700 font-medium mt-1 line-clamp-1">
                      {finding.delta}
                    </div>

                      {/* Sheet metadata and quick Jump to Drawing button */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-500 font-mono truncate max-w-[110px]" title={sheetName}>
                          📍 {sheetName}
                        </span>

                        <div className="flex items-center gap-1">
                          {onOpenVisualizer && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectFinding(finding.id);
                                const matchedSusp = suspicions.find(
                                  (s) =>
                                    s.description.toLowerCase().includes(finding.param_name.toLowerCase()) ||
                                    s.discipline === finding.section ||
                                    s.normative_base === finding.normative_reference
                                ) || suspicions[0] || {
                                  suspicion_id: 8888,
                                  object_id: currentObject.id,
                                  discipline: finding.section,
                                  discovery_method: 'CV_BBOX_DELTA',
                                  description: `[BBox-коллизия] ${finding.param_name}: ${finding.delta}`,
                                  confidence: 0.94,
                                  pd_reference: finding.normative_reference || 'ПД: Раздел АР, лист 12',
                                  rd_reference: `${frag?.file_name || 'РД-чертеж.pdf'}, лист ${frag?.bbox?.page || 1}`,
                                  normative_base: finding.normative_reference || 'СП 118.13330.2022',
                                  bbox: { x: 340, y: 280, width: 220, height: 160, sheet_number: sheetName },
                                };
                                onOpenVisualizer(matchedSusp);
                              }}
                              className="px-1.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1 border border-indigo-200 shadow-xs"
                              title="Открыть BBox-визуализатор для этого дефекта"
                            >
                              <Scan className="w-3 h-3 text-indigo-600" />
                              <span>BBox</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectFinding(finding.id);

                              // Locate target drawing file in uploaded list
                              if (uploadedFilesList?.length && onSelectUploadedPdf) {
                                const targetFileName = (frag?.file_name || '').toLowerCase().trim();
                                const match =
                                  uploadedFilesList.find((f) => {
                                    const fName = f.name.toLowerCase().trim();
                                    return (
                                      fName === targetFileName ||
                                      fName.includes(targetFileName) ||
                                      (targetFileName && targetFileName.includes(fName))
                                    );
                                  }) ||
                                  (finding.param_code?.startsWith('AR') || finding.section === 'АР'
                                    ? uploadedFilesList.find(
                                        (f) => f.name.toLowerCase().includes('ар1') || f.name.toLowerCase().includes('ар')
                                      )
                                    : finding.param_code?.startsWith('OV')
                                    ? uploadedFilesList.find((f) => f.name.toLowerCase().includes('ов'))
                                    : finding.param_code?.startsWith('KJ')
                                    ? uploadedFilesList.find((f) => f.name.toLowerCase().includes('кж'))
                                    : null);

                                if (match) {
                                  onSelectUploadedPdf(match.id);
                                }
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1 shadow-xs hover:scale-105 active:scale-95"
                            title="Открыть чертеж и перейти к месту замечания"
                          >
                            <Crosshair className="w-3 h-3 text-amber-300" />
                            <span>На чертеж</span>
                          </button>
                        </div>
                      </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

        {/* RIGHT COLUMN: AUTHENTIC PDF VIEWER OR CAD BLUEPRINT (expands to full width when landscape is toggled or when 0 findings) */}
        <div className={`${(isExpandedLandscape || activeScopeFindings.length === 0) ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-4`}>
          {/* VIEW 1: AUTHENTIC PDF SHEET VIEWER (THE REAL UPLOADED PDF FILE) */}
          {viewMode === 'PDF_DOCUMENT_VIEW' && (
            <ActualPdfViewer
              pdfBlobUrl={uploadedPdfBlobUrl || ''}
              fileName={uploadedPdfFileName || activeExcerpt.pdfFileName}
              fileSizeMb={uploadedPdfSizeMb || 18.4}
              initialPage={activeExcerpt.pdfPageNumber || 1}
              activeFinding={activeFinding}
              uploadedFiles={uploadedFilesList}
              onSelectFile={onSelectUploadedPdf}
              onUploadNewPdf={onUploadNewPdfFile}
              onDismissMismatchedFinding={(findingId) => {
                onUpdateFindingStatus(findingId, 'NEGATIVE_VERIFIED', {
                  rejectionReason: 'PARAMETER_NOT_APPLICABLE',
                  comment: 'Отклонено экспертом: замечание AR-01 относится к разделу АР, а на данном листе ОВ решения по запорной и балансировочной арматуре соответствуют СП 60.13330.2020.',
                });
                setActionNotice({
                  text: 'Замечание AR-01 отклонено: не применимо к разделу ОВ (Норма)',
                  type: 'REJECTED',
                });
              }}
              onSwitchToDiscipline={(disc) => {
                setSelectedSectionFilter(disc);
                const target = findings.find((f) => f.section === disc || f.param_code.startsWith('OV'));
                if (target) onSelectFinding(target.id);
              }}
              onRecordNormativeVerification={(title, normRef, comment) => {
                setActionNotice({
                  text: `Решение «${title}» зафиксировано в протоколе как норма (${normRef})!`,
                  type: 'CONFIRMED',
                });
              }}
            />
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

                  {activeFinding && (
                    <div className="absolute top-1/3 left-1/4 border-2 border-dashed border-rose-600 bg-rose-500/20 rounded-xl p-3 shadow-xl backdrop-blur">
                      <div className="bg-rose-600 text-white font-mono text-xs font-black px-2 py-0.5 rounded inline-block mb-1">
                        {activeFinding.param_code}
                      </div>
                      <div className="text-xs font-bold text-rose-950">
                        {activeExcerpt.erroneousSnippet}
                      </div>
                    </div>
                  )}
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

            {/* 4 One-click Quick Hypothesis Presets */}
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

                      <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                        {onOpenVisualizer && (
                          <button
                            onClick={() => onOpenVisualizer(susp)}
                            className="px-3 py-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 font-bold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer border border-indigo-300 shadow-xs"
                          >
                            <Scan className="w-3.5 h-3.5 text-indigo-600" />
                            <span>📐 Визуализатор BBox / Калька</span>
                          </button>
                        )}
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
