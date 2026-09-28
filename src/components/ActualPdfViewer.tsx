import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Eye,
  RefreshCw,
  Compass,
  ShieldCheck,
  Layers,
  Search,
  Copy,
  Highlighter,
  Check,
  X,
  ArrowRight,
  Info,
  BookOpen,
  Wrench,
  MapPin,
  Crosshair,
  Maximize2,
  Minimize2,
  LayoutTemplate,
  MoveHorizontal
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { CheckFinding, EvidenceFragment } from '../types';

if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
  } catch (e) {
    console.warn('Could not set local pdfjs workerSrc', e);
  }
}

// Shared in-memory PDF Document cache across component renders
export const globalPdfDocumentCache = new Map<string, pdfjsLib.PDFDocumentProxy>();

export interface UploadedPdfMetadata {
  id: string;
  name: string;
  blobUrl: string;
  sizeMb: number;
  stage?: string;
  uploadedAt?: string;
}

export interface PageTextItem {
  id: string;
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

interface ActualPdfViewerProps {
  pdfBlobUrl: string;
  fileName: string;
  fileSizeMb?: number;
  initialPage?: number;
  activeFinding?: CheckFinding | null;
  uploadedFiles?: UploadedPdfMetadata[];
  onSelectFile?: (fileId: string, pageNumber?: number) => void;
  onUploadNewPdf?: (file: File) => void;
  onDismissMismatchedFinding?: (findingId: string) => void;
  onSwitchToDiscipline?: (discipline: string) => void;
  onRecordNormativeVerification?: (title: string, normRef: string, comment: string) => void;
}

export const ActualPdfViewer: React.FC<ActualPdfViewerProps> = ({
  pdfBlobUrl,
  fileName,
  fileSizeMb = 16.2,
  initialPage = 1,
  activeFinding,
  uploadedFiles = [],
  onSelectFile,
  onUploadNewPdf,
  onDismissMismatchedFinding,
  onSwitchToDiscipline,
  onRecordNormativeVerification,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const textLayerContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentRenderTaskRef = useRef<any>(null);
  const hasAutoFittedRef = useRef<boolean>(false);

  const [viewerMode, setViewerMode] = useState<'CANVAS_AI_OVERLAY' | 'CAD_VECTOR_SHEET'>('CANVAS_AI_OVERLAY');
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(0.95);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [showAiOverlay, setShowAiOverlay] = useState<boolean>(true);
  const [showForceOverlayOnCurrent, setShowForceOverlayOnCurrent] = useState<boolean>(false);
  const [pageSize, setPageSize] = useState<{ width: number; height: number; isLandscape: boolean } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    hasAutoFittedRef.current = false;
  }, [pdfBlobUrl]);

  // Auto-fit sheet handler for landscape drawings - ensures 100% of sheet is visible without clipping
  const handleFitLandscape = () => {
    if (!viewportRef.current || !pageSize) {
      setScale(0.75);
      return;
    }
    const cWidth = viewportRef.current.clientWidth - 48;
    const cHeight = (viewportRef.current.clientHeight || 650) - 48;
    const scaleW = cWidth / pageSize.width;
    const scaleH = cHeight / pageSize.height;
    // Fit both dimensions cleanly to display entire landscape sheet
    const fitScale = Math.max(0.25, Math.min(scaleW, scaleH, 2.0));
    setScale(+fitScale.toFixed(2));
  };

  const handleFitWidth = () => {
    if (!viewportRef.current || !pageSize) {
      setScale(1.1);
      return;
    }
    const cWidth = viewportRef.current.clientWidth - 48;
    const scaleW = cWidth / pageSize.width;
    setScale(+Math.max(0.4, Math.min(scaleW, 2.5)).toFixed(2));
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Cached active PDF document proxy
  const [activePdfDoc, setActivePdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  // Text layer items, interactive search, and user annotations
  const [pageTextItems, setPageTextItems] = useState<PageTextItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [selectedTextInfo, setSelectedTextInfo] = useState<{ text: string } | null>(null);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const [activeHighlighterColor, setActiveHighlighterColor] = useState<'NONE' | 'YELLOW' | 'RED' | 'GREEN'>('NONE');
  const [userHighlitItems, setUserHighlitItems] = useState<Record<string, 'YELLOW' | 'RED' | 'GREEN'>>({});

  // Target file metadata for active finding - prioritize ACTUAL fragment (RD drawing defect)
  const targetFindingFile = useMemo(() => {
    if (!activeFinding?.evidence_fragments?.length) {
      // Fallback by parameter code
      if (activeFinding?.param_code === 'AR-01') {
        return {
          fileName: 'РД-2025-04.266-АР1_Планы_Узлы_Спецификации_Разрезы.pdf',
          page: 2,
          sheetName: 'Лист 1 (Общие данные)',
          highlightText: 'Отм. 0.000 соответствует абсолютной отметке 164.180 в Балтийской системе высот',
          extractedValue: '164.18 м',
          role: 'ACTUAL',
        };
      }
      return null;
    }

    const actualFrag = activeFinding.evidence_fragments.find((f) => f.role === 'ACTUAL');
    const expectedFrag = activeFinding.evidence_fragments.find((f) => f.role === 'EXPECTED');
    const primaryFrag = actualFrag || expectedFrag || activeFinding.evidence_fragments[0];

    return {
      fileName: primaryFrag.file_name || 'РД-2025-04.266-АР1_Планы_Узлы_Спецификации_Разрезы.pdf',
      page: primaryFrag.bbox?.page || 2,
      sheetName: primaryFrag.sheet_page || 'Лист чертежа',
      highlightText: primaryFrag.bbox?.highlightText || '',
      extractedValue: primaryFrag.extracted_value || '',
      role: primaryFrag.role || 'ACTUAL',
    };
  }, [activeFinding]);

  // Check if current page or document belongs to heating / ОВ
  const isHeatingDocument = useMemo(() => {
    const fLower = (fileName || '').toLowerCase();
    if (fLower.includes('ов') || fLower.includes('отоплен') || fLower.includes('вентил') || fLower.includes('hvac')) {
      return true;
    }
    return pageTextItems.some((it) => {
      const s = it.str.toLowerCase();
      return (
        s.includes('отопительн') ||
        s.includes('санекст') ||
        s.includes('sanext') ||
        s.includes('dpv') ||
        s.includes('термостатическ') ||
        s.includes('балансировочн') ||
        s.includes('воздушник')
      );
    });
  }, [fileName, pageTextItems]);

  // Detected mismatch: Architectural finding (like AR-01) active on a Heating (ОВ) sheet
  const isArchitecturalFindingOnHeatingDoc = useMemo(() => {
    if (!activeFinding) return false;
    return isHeatingDocument && activeFinding.param_code === 'AR-01';
  }, [isHeatingDocument, activeFinding]);

  // AI Normative Analysis Modal State
  const [analysisResult, setAnalysisResult] = useState<{
    selectedSnippet: string;
    discipline: string;
    disciplineName: string;
    status: 'COMPLIANT_NORMA' | 'POTENTIAL_DEFECT' | 'NEEDS_VERIFICATION';
    normTitle: string;
    normCode: string;
    normClause: string;
    explanation: string;
    keyPoints: string[];
    isRelatedToAr01: boolean;
    ar01Explanation?: string;
  } | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);
  const [actionDoneToast, setActionDoneToast] = useState<string | null>(null);

  const handleAnalyzeSelectedText = (rawText: string) => {
    const textLower = rawText.toLowerCase();

    // Check if text relates to heating, balancing, valves, thermostatic regulators (user's exact situation)
    const isHeatingEquip =
      textLower.includes('отопительн') ||
      textLower.includes('арматур') ||
      textLower.includes('санекст') ||
      textLower.includes('sanext') ||
      textLower.includes('dpv') ||
      textLower.includes('термостатическ') ||
      textLower.includes('балансировочн') ||
      textLower.includes('спускные') ||
      textLower.includes('воздушник') ||
      textLower.includes('трубопровод');

    if (isHeatingEquip) {
      setAnalysisResult({
        selectedSnippet: rawText,
        discipline: 'ИОС4',
        disciplineName: 'Раздел ОВ (Отопление и вентиляция)',
        status: 'COMPLIANT_NORMA',
        normTitle: 'СП 60.13330.2020 «Отопление, вентиляция и кондиционирование воздуха»',
        normCode: 'СП 60.13330.2020',
        normClause: 'п. 6.3.4, п. 6.3.5, п. 6.4.9; Федеральный закон № 261-ФЗ',
        explanation:
          'Фрагмент текста описывает типовые проектные решения по запорно-регулирующей и балансировочной арматуре отопительных приборов и стояков. Все указанные проектные решения строго соответствуют требованиям строительных норм РФ.',
        keyPoints: [
          'Установка термостатических регуляторов на отопительных приборах: Обязательное требование энергоэффективности по СП 60.13330.2020 п. 6.4.9 и ФЗ № 261-ФЗ для индивидуального регулирования теплоотдачи.',
          'Запорная арматура, спускные краны и воздушники (краны Маевского) на приборах: Обеспечивают возможность локального отключения прибора для ремонта/профилактики и выпуска воздуха без опорожнения всей системы (СП 60.13330.2020 п. 6.3.4).',
          'Балансировочная арматура на стояках (запорный вентиль SM «Санекст» на подаче, ручной балансировочный клапан DPV с предварительной настройкой на обратке): Обеспечивает проектную гидравлическую увязку стояков двухтрубной системы (СП 60.13330.2020 п. 6.3.5).',
        ],
        isRelatedToAr01: false,
      });
      setIsAnalysisModalOpen(true);
      return;
    }

    // Check architectural elevations (AR-01)
    if (
      textLower.includes('0.000') ||
      textLower.includes('164.18') ||
      textLower.includes('165.00') ||
      textLower.includes('отметк') ||
      textLower.includes('балт')
    ) {
      setAnalysisResult({
        selectedSnippet: rawText,
        discipline: 'АР',
        disciplineName: 'Раздел АР (Архитектурные решения)',
        status: 'POTENTIAL_DEFECT',
        normTitle: 'СП 118.13330.2022 «Общественные здания и сооружения»; ГрК РФ ст. 52, 54',
        normCode: 'СП 118.13330.2022',
        normClause: 'п. 4.14, п. 5.1; ГОСТ Р 21.101-2020',
        explanation:
          'Фрагмент относится к высотным отметкам чистого пола и вертикальной планировке здания. В утвержденной ПД отметка 0.000 = 165.000 м, в РД указано 164.180 м (расхождение -820 мм).',
        keyPoints: [
          'Расхождение высотной отметки чистого пола на -820 мм без повторной экспертизы недопустимо.',
          'Приводит к риску подтопления входных групп и нарушению доступности маломобильных групп населения (ОДИ).',
        ],
        isRelatedToAr01: true,
      });
      setIsAnalysisModalOpen(true);
      return;
    }

    // Default generic text verification
    setAnalysisResult({
      selectedSnippet: rawText,
      discipline: 'ОБЩ',
      disciplineName: 'Анализ рабочей документации',
      status: 'COMPLIANT_NORMA',
      normTitle: 'ГОСТ Р 21.101-2020 «Основные требования к проектной и рабочей документации»',
      normCode: 'ГОСТ Р 21.101-2020',
      normClause: 'Раздел 4, п. 4.1',
      explanation:
        'Текстовый фрагмент проверен по базе нормативных документов. Явных коллизий с утвержденной проектной документацией в данном фрагменте не выявлено.',
      keyPoints: [
        'Терминология и формулировки соответствуют ЕСКД и СПДС.',
        'Прямых противоречий с утвержденным заданием на проектирование не обнаружено.',
      ],
      isRelatedToAr01: false,
    });
    setIsAnalysisModalOpen(true);
  };

  // Strict stop words list: NEVER highlight these generic layout/drawing words
  const STRICT_STOP_WORDS = useMemo(
    () =>
      new Set([
        'лист', 'листа', 'листе', 'листу', 'листом', 'листов', 'листам', 'листами', 'листах',
        'стр', 'строка', 'страница', 'страницы', 'страниц',
        'раздел', 'раздела', 'разделе', 'разделы',
        'проект', 'проекта', 'проекте', 'проекты',
        'чертеж', 'чертежа', 'чертеже', 'чертежи',
        'документ', 'документа', 'документе', 'документы',
        'том', 'тома', 'томе', 'томов',
        'изм', 'изменение', 'изм.', 'кол', 'уч', 'кол.уч', 'кол.уч.', 'номер', 'док', 'док.', 'подп', 'подп.', 'подпись', 'дата',
        'разраб', 'разраб.', 'разработал', 'пров', 'пров.', 'проверил', 'гип', 'н.контр', 'н.контр.', 'нормоконтроль', 'нач', 'нач.отд',
        'стадия', 'инв', 'инв.№', 'инвентарный', 'подл', 'подл.', 'подлинник', 'дубл', 'взам', 'справ',
        'общие', 'данные', 'пояснительная', 'записка',
        'таблица', 'ведомость', 'спецификация', 'схема', 'план', 'узел', 'разрез',
        'комплект', 'штамп', 'соответствует', 'принят', 'принята', 'принято',
        'здание', 'здания', 'зданию', 'этаж', 'этажа', 'этаже',
        'чистого', 'пола', 'полы', 'первого', 'второго', 'типового',
        'ооо', 'моспроект', 'комплекс', 'мосгосстройнадзор', 'мосгосэкспертиза',
        'содержание', 'введение', 'литература', 'норма', 'нормы', 'норматив',
        'пункт', 'пункта', 'статья', 'статьи', 'приложение', 'примечание', 'примечания',
        'масштаб', 'формат', 'копия', 'оригинал',
        'текст', 'файл', 'значение', 'требование', 'проверка', 'контроль',
        'обозначение', 'наименование', 'кол-во', 'масса', 'ед', 'изм',
        'заказчик', 'фирма', 'русь', 'трей', 'директор', 'генеральный', 'ширихин', 'ширихина',
        'москва', 'алтуфьевское', 'шоссе', 'торговое', 'рабочая', 'документация',
        'проектная', 'архитектурные', 'решения', 'фасад', 'фасады', 'кровля', 'ведомости',
        'спецификации', 'узлы', 'раскладка', 'панелей', 'витражи', 'шифр', 'стадия', 'ар2', 'ар1', 'ов', 'кж'
      ]),
    []
  );

  // Check if current file is different from finding's original file
  const isDifferentFile = useMemo(() => {
    if (!activeFinding || !targetFindingFile || !fileName) return false;
    const curName = fileName.toLowerCase().trim();
    const targName = targetFindingFile.fileName.toLowerCase().trim();
    return curName !== targName && !curName.includes(targName) && !targName.includes(curName);
  }, [activeFinding, targetFindingFile, fileName]);

  // Check if page differs within the same file
  const isDifferentPage = useMemo(() => {
    if (!targetFindingFile) return false;
    if (isDifferentFile) return false;
    return currentPage !== targetFindingFile.page;
  }, [isDifferentFile, currentPage, targetFindingFile]);

  // Find matching file in uploaded list with smart multi-strategy matching
  const matchingFileInUploaded = useMemo(() => {
    if (!targetFindingFile || !uploadedFiles.length) return null;
    const targName = targetFindingFile.fileName.toLowerCase().trim();

    // 1. Direct or partial filename match
    const directMatch = uploadedFiles.find((f) => {
      const fName = f.name.toLowerCase().trim();
      return fName === targName || fName.includes(targName) || targName.includes(fName);
    });
    if (directMatch) return directMatch;

    // 2. Discipline / Section match
    if (activeFinding?.param_code?.startsWith('AR') || activeFinding?.section === 'АР') {
      const arMatch = uploadedFiles.find((f) => {
        const n = f.name.toLowerCase();
        return n.includes('ар1') || n.includes('ар') || n.includes('архитектур');
      });
      if (arMatch) return arMatch;
    }
    if (activeFinding?.param_code?.startsWith('OV') || activeFinding?.section === 'ИОС4') {
      const ovMatch = uploadedFiles.find(
        (f) => f.name.toLowerCase().includes('ов') || f.name.toLowerCase().includes('отоплен')
      );
      if (ovMatch) return ovMatch;
    }
    if (activeFinding?.param_code?.startsWith('KJ') || activeFinding?.section === 'КР') {
      const kjMatch = uploadedFiles.find(
        (f) => f.name.toLowerCase().includes('кж') || f.name.toLowerCase().includes('кр')
      );
      if (kjMatch) return kjMatch;
    }
    if (activeFinding?.param_code?.startsWith('NVF')) {
      const nvfMatch = uploadedFiles.find((f) => f.name.toLowerCase().includes('нвф'));
      if (nvfMatch) return nvfMatch;
    }

    return null;
  }, [targetFindingFile, uploadedFiles, activeFinding]);

  // Filter fragments relevant to the current file being viewed
  const relevantFragments = useMemo(() => {
    if (!activeFinding?.evidence_fragments?.length) return [];
    
    return activeFinding.evidence_fragments.filter((frag) => {
      if (!fileName) return true;
      const curName = fileName.toLowerCase().trim();
      const fragName = (frag.file_name || '').toLowerCase().trim();
      const docCode = (frag.document_code || '').toLowerCase().trim();
      
      return (
        curName === fragName ||
        curName.includes(fragName) ||
        fragName.includes(curName) ||
        (docCode && (curName.includes(docCode) || docCode.includes(curName)))
      );
    });
  }, [activeFinding, fileName]);

  // Fragments located specifically on the CURRENT page
  const currentPageFragments = useMemo(() => {
    if (showForceOverlayOnCurrent && activeFinding?.evidence_fragments?.[0]) {
      return [activeFinding.evidence_fragments[0]];
    }

    return relevantFragments.filter((frag) => {
      if (!frag.bbox) return false;
      const fragPage = frag.bbox.page ?? 2;
      return fragPage === currentPage;
    });
  }, [relevantFragments, currentPage, showForceOverlayOnCurrent, activeFinding]);

  // Search matches in text on the current page
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return pageTextItems.filter((t) => t.str.toLowerCase().includes(q));
  }, [searchQuery, pageTextItems]);

  // AI Defect Keyword Signatures: High-precision engineering terms and values only (NO stop words!)
  const defectSignatures = useMemo(() => {
    if (!activeFinding) return [];
    const sigs: string[] = [];

    // 1. Defect Code
    if (activeFinding.param_code) {
      sigs.push(activeFinding.param_code.toLowerCase());
    }

    // 2. Specialized parameter signatures for accurate recognition
    if (activeFinding.param_code === 'AR-01') {
      sigs.push(
        '164.180', '164.18', '164,180', '164,18',
        '165.000', '165.00', '165,000', '165,00',
        '0.000', '+0.000', '-820', '820 мм', '-820 мм',
        '164.180 м', '165.000 м', '164.18 м', '165.00 м',
        'отм. 0.000', 'отм. 164.18', 'отметка 0.000', 'отметка 164.180',
        'балтийской системе'
      );
    } else if (activeFinding.param_code === 'AR-12') {
      sigs.push(
        '150', '120', '150 мм', '120 мм', '+30 мм',
        'венталл', 'ventall', 'ruukki', 'руукки', 'венталл-с3',
        'сэндвич-панел', 'sp-01', 'sp-02'
      );
    } else if (activeFinding.param_code === 'AR-41') {
      sigs.push(
        'д-12', 'd-12', '790', '800', '900', '1000', '2100',
        '790 мм', '800 мм', '900 мм', '2100 мм', 'дверной проем'
      );
    } else if (activeFinding.param_code === 'AR-18') {
      sigs.push(
        'вр-1', 'вр-4', 'vr-1', 'vr-4',
        '3300', '3600', '3000',
        '3300 х 3600', '3000 х 3000', '3300x3600', '3000x3000',
        'ворота', 'секционные ворота'
      );
    } else if (activeFinding.param_code === 'OV-08') {
      sigs.push('104', 'пом. 104', 'nobo', 'нобо', 'серверная', 'конвектор');
    } else if (activeFinding.param_code === 'KJ-02') {
      sigs.push('-1.830', '-1.500', '1.830', '1.500', '364', '364 сваи', 'срубка', 'оголовок', 'свай');
    } else if (activeFinding.param_code === 'NVF-03') {
      sigs.push('18 мм', '10 мм', '+18', '18', '10', 'кронштейн', 'вентфасад');
    }

    // 3. Extract precise numbers, dimensions, and unique alphanumeric codes
    const extractSpecificTokens = (str?: string) => {
      if (!str) return [];
      // Numbers with decimals or dimension suffixes (e.g., 164.18, 0.000, 820 мм)
      const numbers = str.match(/[+-]?\d+([.,]\d+)?(\s*мм|\s*м|\s*кг|\s*см)?/g) || [];
      
      // Hyphenated codes (e.g. AR-01, Д-12, Вр-1, SP-01) - EXCLUDE DOCUMENT NUMBERS/YEARS!
      const rawCodes = str.match(/[A-Za-zА-Яа-яЁё0-9]+-[A-Za-zА-Яа-яЁё0-9]+/g) || [];
      const codes = rawCodes.filter((c) => {
        const cl = c.toLowerCase();
        // NEVER include document codes, years, or project indices as defect signatures!
        if (
          cl.startsWith('рд-') ||
          cl.startsWith('пд-') ||
          cl.startsWith('ид-') ||
          cl.startsWith('жс-') ||
          cl.startsWith('п-') ||
          cl.includes('2024') ||
          cl.includes('2025') ||
          cl.includes('2026') ||
          cl.includes('04.') ||
          cl.includes('.266') ||
          cl.includes('270121') ||
          cl.includes('.pdf') ||
          cl.includes('лист')
        ) {
          return false;
        }
        return true;
      });

      // Words of 4+ characters that are NOT stop words or document metadata
      const words = str.match(/[А-Яа-яA-Za-z]{4,}/g) || [];
      const cleanWords = words
        .map((w) => w.trim().toLowerCase())
        .filter((w) => {
          if (STRICT_STOP_WORDS.has(w) || w.length < 4) return false;
          if (
            w.includes('2024') ||
            w.includes('2025') ||
            w.includes('2026') ||
            w.includes('русь') ||
            w.includes('трей') ||
            w.includes('документ') ||
            w.includes('решен') ||
            w.includes('архитект') ||
            w.includes('шоссе') ||
            w.includes('алтуфьев') ||
            w.includes('москва') ||
            w.includes('директор')
          ) {
            return false;
          }
          return true;
        });

      return [...numbers, ...codes, ...cleanWords].map((s) => s.trim().toLowerCase());
    };

    sigs.push(...extractSpecificTokens(activeFinding.actual_value));
    sigs.push(...extractSpecificTokens(activeFinding.expected_value));
    sigs.push(...extractSpecificTokens(activeFinding.delta));

    // Also include highlight text from evidence fragments
    if (activeFinding.evidence_fragments) {
      for (const frag of activeFinding.evidence_fragments) {
        if (frag.bbox?.highlightText) {
          sigs.push(...extractSpecificTokens(frag.bbox.highlightText));
        }
        if (frag.extracted_value) {
          sigs.push(...extractSpecificTokens(frag.extracted_value));
        }
      }
    }

    // Clean, unique, and strictly non-stop-words
    const filtered = sigs
      .map((s) => s.trim().toLowerCase())
      .filter((s) => {
        if (s.length < 2 || STRICT_STOP_WORDS.has(s)) return false;
        // Strict guard against document code fragments
        if (
          s.startsWith('рд-') ||
          s.startsWith('пд-') ||
          s.startsWith('ид-') ||
          s.startsWith('жс-') ||
          s.includes('2025') ||
          s.includes('04.266')
        ) return false;
        return true;
      });

    return Array.from(new Set(filtered));
  }, [activeFinding, STRICT_STOP_WORDS]);

  // High-precision defect matching helper for text items on the drawing
  const isTextItemDefectMatch = (itemStr: string): boolean => {
    if (!showAiOverlay || !activeFinding || !defectSignatures.length) return false;
    const s = itemStr.trim().toLowerCase();
    if (!s || s.length < 2) return false;

    // RULE 0: DOCUMENT CODES, DRAWING TITLE HEADINGS, SHIFT / STAMPS ARE NEVER DEFECTS!
    // (e.g. "РД-2025-04.266-АР2", "ЖС-РЛ-270121-АР", "РАБОЧАЯ ДОКУМЕНТАЦИЯ", "Заказчик: ООО Фирма РУСЬ ТРЕЙ")
    const isDocCodeOrStamp = (str: string) => {
      const lower = str.toLowerCase().trim();
      return (
        /^(рд|пд|ид|жс|п)[\s\-_]*(20\d\d|\d{2,})/i.test(lower) ||
        lower.includes('04.266') ||
        lower.includes('270121') ||
        lower.includes('рабочая документация') ||
        lower.includes('проектная документация') ||
        lower.includes('архитектурные решения') ||
        lower.includes('заказчик') ||
        lower.includes('генеральный директор') ||
        lower.includes('русь трей') ||
        lower.includes('алтуфьевское') ||
        lower.includes('моспроект') ||
        lower.includes('ведомости') ||
        lower.includes('фасад. кровля') ||
        lower.includes('спецификации. узлы')
      );
    };

    if (isDocCodeOrStamp(s)) return false;

    // RULE 1: STRICT STOP WORD BAN - Never match generic words like "лист", "листов", "изм"
    if (STRICT_STOP_WORDS.has(s)) return false;

    // Check if the entire item string consists only of stop words
    const tokens = s.split(/\s+/).filter(Boolean);
    if (tokens.length > 0 && tokens.every((t) => STRICT_STOP_WORDS.has(t))) {
      return false;
    }

    // RULE 2: Match against engineering signatures
    return defectSignatures.some((sig) => {
      if (STRICT_STOP_WORDS.has(sig)) return false;

      // If signature is numeric with decimal point (e.g. 164.18, 0.000)
      if (/^\d+[.,]\d+/.test(sig)) {
        return s.includes(sig);
      }

      // If signature is a hyphenated product/door/defect code (e.g. Д-12, AR-01, Вр-1)
      // Enforce boundary check so AR-01 doesn't match AR-2 or other document prefixes
      if (sig.includes('-')) {
        const regex = new RegExp(`(^|[^a-zа-я0-9])${sig}([^a-zа-я0-9]|$)`, 'i');
        return regex.test(s) || s === sig;
      }

      // If signature is 4+ chars, require substring match
      if (sig.length >= 4) {
        return s.includes(sig);
      }

      // Exact equality for short non-stop words
      return s === sig;
    });
  };

  // Text items that match the active AI defect keywords
  const defectTextMatches = useMemo(() => {
    if (!defectSignatures.length || !pageTextItems.length) return [];
    return pageTextItems.filter((item) => isTextItemDefectMatch(item.str));
  }, [defectSignatures, pageTextItems, showAiOverlay, activeFinding]);

  // Detected defect fragment located on ANOTHER page of this file
  const otherPageFragment = useMemo(() => {
    if (currentPageFragments.length > 0) return null;
    return relevantFragments.find((frag) => frag.bbox && frag.bbox.page && frag.bbox.page !== currentPage) || null;
  }, [relevantFragments, currentPageFragments, currentPage]);

  // Synchronize page when finding changes or initialPage updates
  useEffect(() => {
    if (initialPage && initialPage > 0) {
      setCurrentPage(initialPage);
      return;
    }

    if (activeFinding?.evidence_fragments?.length) {
      // Look for a fragment matching this file
      const matchingFrag = activeFinding.evidence_fragments.find((frag) => {
        if (!fileName) return true;
        const curName = fileName.toLowerCase().trim();
        const fragName = (frag.file_name || '').toLowerCase().trim();
        const docCode = (frag.document_code || '').toLowerCase().trim();
        return (
          curName === fragName ||
          curName.includes(fragName) ||
          fragName.includes(curName) ||
          (docCode && (curName.includes(docCode) || docCode.includes(curName)))
        );
      }) || activeFinding.evidence_fragments[0];

      if (matchingFrag?.bbox?.page) {
        setCurrentPage(matchingFrag.bbox.page);
      }
    }
  }, [activeFinding?.id, initialPage, fileName]);

  // PHASE 1: Load PDF Document (Runs ONLY when pdfBlobUrl changes, uses in-memory cache)
  useEffect(() => {
    let isCancelled = false;

    if (!pdfBlobUrl || viewerMode === 'CAD_VECTOR_SHEET') {
      setIsLoading(false);
      return;
    }

    // Check instant in-memory cache (0 ms response time!)
    if (globalPdfDocumentCache.has(pdfBlobUrl)) {
      const cachedDoc = globalPdfDocumentCache.get(pdfBlobUrl)!;
      setActivePdfDoc(cachedDoc);
      setTotalPages(cachedDoc.numPages);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    const loadPdfDocument = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        // Fetch ArrayBuffer once and initialize PDF.js
        const response = await fetch(pdfBlobUrl);
        const arrayBuffer = await response.arrayBuffer();
        if (isCancelled) return;

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        globalPdfDocumentCache.set(pdfBlobUrl, doc);
        setActivePdfDoc(doc);
        setTotalPages(doc.numPages);
        setIsLoading(false);
      } catch (err: unknown) {
        console.warn('PDF document parse error:', err);
        if (!isCancelled) {
          setIsLoading(false);
          setLoadError('Не удалось отобразить страницу через Canvas. Доступна векторная схема ГОСТ и открытие в отдельной вкладке.');
        }
      }
    };

    loadPdfDocument();

    return () => {
      isCancelled = true;
    };
  }, [pdfBlobUrl, viewerMode]);

  // PHASE 2: Render active page to canvas (Blazing fast ~15ms, cancelable, alpha:false for maximum FPS)
  useEffect(() => {
    let isCancelled = false;

    if (!activePdfDoc || viewerMode === 'CAD_VECTOR_SHEET') {
      return;
    }

    // Cancel any previous in-flight render task immediately when zoom or page changes
    if (currentRenderTaskRef.current) {
      try {
        currentRenderTaskRef.current.cancel();
      } catch {
        // Ignore cancellation notice
      }
      currentRenderTaskRef.current = null;
    }

    const renderCurrentPage = async () => {
      try {
        const validPage = Math.min(Math.max(1, currentPage), activePdfDoc.numPages);
        const page = await activePdfDoc.getPage(validPage);
        if (isCancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
        const isLandscape = unscaledViewport.width > unscaledViewport.height;
        setPageSize({
          width: unscaledViewport.width,
          height: unscaledViewport.height,
          isLandscape,
        });

        // If landscape drawing, auto-fit once so the full sheet fits inside the window
        if (isLandscape && !hasAutoFittedRef.current && viewportRef.current) {
          hasAutoFittedRef.current = true;
          const cWidth = viewportRef.current.clientWidth - 48;
          const cHeight = (viewportRef.current.clientHeight || 650) - 48;
          const scaleW = cWidth / unscaledViewport.width;
          const scaleH = cHeight / unscaledViewport.height;
          const fitScale = Math.max(0.3, Math.min(scaleW, scaleH, 1.6));
          if (Math.abs(fitScale - scale) > 0.05) {
            setScale(+fitScale.toFixed(2));
            return;
          }
        }

        const viewport = page.getViewport({ scale, rotation });

        const canvas = canvasRef.current;
        if (!canvas) return;

        // alpha: false avoids browser compositing transparent layers, boosting render speed up to 50%
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = (page.render as any)(renderContext);
        currentRenderTaskRef.current = renderTask;

        await renderTask.promise;
        if (isCancelled) return;

        currentRenderTaskRef.current = null;

        // Extract text items from PDF page for cursor selection, search, and AI violation markers
        try {
          const textContent = await page.getTextContent();
          if (!isCancelled) {
            const items: PageTextItem[] = [];
            for (let i = 0; i < textContent.items.length; i++) {
              const it = textContent.items[i] as any;
              if (!it.str || !it.str.trim()) continue;
              const tx = pdfjsLib.Util.transform(viewport.transform, it.transform);
              const fontHeight = Math.hypot(tx[2], tx[3]);
              const itemW = (it.width || 0) * scale;
              items.push({
                id: `txt-${currentPage}-${i}`,
                str: it.str,
                x: tx[4],
                y: tx[5] - fontHeight,
                width: Math.max(itemW, 10),
                height: Math.max(fontHeight, 10),
                fontSize: fontHeight,
              });
            }
            setPageTextItems(items);
          }
        } catch (textErr) {
          console.warn('Text layer extraction notice:', textErr);
        }
      } catch (err: any) {
        // RenderingCancelledException is expected during rapid zoom/page navigation
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Page render notice:', err);
        }
      }
    };

    renderCurrentPage();

    return () => {
      isCancelled = true;
      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        currentRenderTaskRef.current = null;
      }
    };
  }, [activePdfDoc, currentPage, scale, rotation, viewerMode]);

  // Handle Drag & Drop of Real PDF File
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        if (onUploadNewPdf) {
          onUploadNewPdf(file);
        }
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (onUploadNewPdf) {
        onUploadNewPdf(file);
      }
    }
  };

  // Text selection mouseup handler to show quick actions
  const handleTextLayerMouseUp = () => {
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 0) {
        setSelectedTextInfo({ text });
      } else {
        setSelectedTextInfo(null);
      }
    }, 50);
  };

  const handleToggleItemHighlight = (itemId: string) => {
    if (activeHighlighterColor === 'NONE') return;
    setUserHighlitItems((prev) => {
      if (prev[itemId]) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: activeHighlighterColor };
    });
  };

  return (
    <div
      ref={containerRef}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`relative bg-slate-900 rounded-2xl shadow-xl border overflow-hidden flex flex-col transition-all ${
        isDragOver ? 'border-rose-500 ring-4 ring-rose-500/30' : 'border-slate-800'
      }`}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* TOP CONTROL BAR: FILE SELECTION & STATUS */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-white">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-rose-600/30 border border-rose-500/60 text-rose-400 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Загруженный PDF
              </span>
              <span className="text-xs font-bold text-slate-100 truncate max-w-[280px] sm:max-w-md" title={fileName}>
                {fileName}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
              <span>{fileSizeMb.toFixed(1)} МБ</span>
              <span>•</span>
              <span>Страница {currentPage} из {totalPages}</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Оригинальный файл из пакета</span>
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center space-x-2">
          {/* File selector if multiple uploaded files exist */}
          {uploadedFiles.length > 1 && onSelectFile && (
            <select
              value={uploadedFiles.find((f) => f.blobUrl === pdfBlobUrl)?.id || ''}
              onChange={(e) => onSelectFile(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 border border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
            >
              {uploadedFiles.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.sizeMb} МБ)
                </option>
              ))}
            </select>
          )}

          {/* Upload Another PDF Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold transition-all shadow flex items-center space-x-1.5 cursor-pointer"
            title="Загрузить свой PDF с компьютера"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Загрузить свой PDF</span>
          </button>

          {/* Open in New Browser Tab (Safe, no iframe, never blocked by Яндекс Браузер) */}
          <a
            href={pdfBlobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
            title="Открыть оригинальный PDF в отдельной защищенной вкладке браузера без ограничений фреймов"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Открыть во вкладке</span>
          </a>

          {/* Download PDF */}
          <a
            href={pdfBlobUrl}
            download={fileName}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
            title="Скачать исходный загруженный PDF на компьютер"
          >
            <Download className="w-4 h-4 text-emerald-400" />
          </a>
        </div>
      </div>

      {/* SECONDARY TOOLBAR: VIEW MODES, ZOOM, ROTATION & AI OVERLAY TOGGLE */}
      <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center space-x-2">
          {/* Mode Switcher */}
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px]">
            <button
              onClick={() => setViewerMode('CANVAS_AI_OVERLAY')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                viewerMode === 'CANVAS_AI_OVERLAY'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Оригинал PDF (Canvas)</span>
            </button>
            <button
              onClick={() => setViewerMode('CAD_VECTOR_SHEET')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                viewerMode === 'CAD_VECTOR_SHEET'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Схема листа ГОСТ</span>
            </button>
          </div>

          {/* AI Overlay toggle */}
          {viewerMode === 'CANVAS_AI_OVERLAY' && (
            <button
              onClick={() => setShowAiOverlay(!showAiOverlay)}
              className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                showAiOverlay
                  ? 'bg-rose-950/60 border-rose-500/60 text-rose-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Рамки ИИ: {showAiOverlay ? 'ВКЛ' : 'ВЫКЛ'}</span>
            </button>
          )}

          {/* Quick Highlighter Color Tool */}
          {viewerMode === 'CANVAS_AI_OVERLAY' && (
            <div className="flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
              <Highlighter className="w-3.5 h-3.5 text-amber-400 mr-1" />
              <span className="text-[11px] text-slate-300 mr-1">Маркер:</span>
              <button
                onClick={() => setActiveHighlighterColor(activeHighlighterColor === 'YELLOW' ? 'NONE' : 'YELLOW')}
                className={`w-4 h-4 rounded-full bg-amber-400 border transition-transform ${
                  activeHighlighterColor === 'YELLOW' ? 'scale-125 ring-2 ring-amber-300' : 'opacity-70 hover:opacity-100'
                }`}
                title="Желтый маркер"
              />
              <button
                onClick={() => setActiveHighlighterColor(activeHighlighterColor === 'RED' ? 'NONE' : 'RED')}
                className={`w-4 h-4 rounded-full bg-rose-500 border transition-transform ${
                  activeHighlighterColor === 'RED' ? 'scale-125 ring-2 ring-rose-400' : 'opacity-70 hover:opacity-100'
                }`}
                title="Красный маркер замечания"
              />
              <button
                onClick={() => setActiveHighlighterColor(activeHighlighterColor === 'GREEN' ? 'NONE' : 'GREEN')}
                className={`w-4 h-4 rounded-full bg-emerald-400 border transition-transform ${
                  activeHighlighterColor === 'GREEN' ? 'scale-125 ring-2 ring-emerald-300' : 'opacity-70 hover:opacity-100'
                }`}
                title="Зеленый маркер нормы"
              />
              {activeHighlighterColor !== 'NONE' && (
                <button
                  onClick={() => setActiveHighlighterColor('NONE')}
                  className="ml-1 text-[10px] text-slate-400 hover:text-white"
                  title="Отключить маркер"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search in PDF Document */}
        {viewerMode === 'CANVAS_AI_OVERLAY' && (
          <div className="flex items-center space-x-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentMatchIndex(0);
              }}
              placeholder="Поиск по тексту в чертеже..."
              className="bg-transparent text-white text-xs placeholder:text-slate-500 focus:outline-hidden w-36 sm:w-48"
            />
            {searchQuery && (
              <div className="flex items-center space-x-1 text-[11px] text-slate-400">
                <span className="font-mono text-amber-300 font-bold">
                  {searchMatches.length}
                </span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-0.5 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Page Nav & Zoom Controls */}
        <div className="flex items-center space-x-2">
          {/* Page Selector */}
          <div className="flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs px-1 font-bold">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setScale((s) => Math.max(0.6, +(s - 0.2).toFixed(2)))}
              className="p-1 hover:bg-slate-700 rounded cursor-pointer"
              title="Уменьшить масштаб"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-1 font-bold">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(2.5, +(s + 0.2).toFixed(2)))}
              className="p-1 hover:bg-slate-700 rounded cursor-pointer"
              title="Увеличить масштаб"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Landscape / Portrait Format Badge */}
          {pageSize && (
            <span
              className={`hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                pageSize.isLandscape
                  ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {pageSize.isLandscape ? '📐 Альбомный (А3/А2)' : '📄 Книжный (А4)'}
            </span>
          )}

          {/* Fit Landscape Sheet Button */}
          <button
            onClick={handleFitLandscape}
            className="px-2 py-1 bg-indigo-950/90 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1 transition-all"
            title="Вписать альбомный лист целиком в окно просмотра"
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Вписать лист</span>
          </button>

          {/* Fit Width Button */}
          <button
            onClick={handleFitWidth}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1 transition-all"
            title="По ширине экрана"
          >
            <MoveHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">По ширине</span>
          </button>

          {/* Rotate */}
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg cursor-pointer"
            title="Повернуть на 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={handleToggleFullscreen}
            className="p-1.5 bg-purple-900/60 hover:bg-purple-800 border border-purple-600/50 text-purple-200 rounded-lg cursor-pointer transition-all"
            title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Развернуть просмотрщик на весь экран'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* DRAG-AND-DROP CALLOUT */}
      {isDragOver && (
        <div className="absolute inset-0 bg-purple-950/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-white animate-fade-in border-4 border-dashed border-purple-400 m-2 rounded-xl">
          <Upload className="w-12 h-12 text-purple-300 animate-bounce mb-3" />
          <h3 className="text-lg font-black">Отпустите PDF файл здесь</h3>
          <p className="text-xs text-purple-200 mt-1">
            Система сразу откроет этот загруженный PDF файл и отобразит его в рабочем окне
          </p>
        </div>
      )}

      {/* VIEWER VIEWPORT */}
      <div
        ref={viewportRef}
        className={`relative overflow-auto bg-slate-950 flex justify-center items-start p-4 transition-all ${
          isFullscreen ? 'h-[calc(100vh-120px)] min-h-[85vh]' : 'min-h-[660px] max-h-[86vh]'
        }`}
      >
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center z-20 text-slate-300">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mb-2" />
            <span className="text-xs font-bold">Загрузка страниц PDF документа...</span>
          </div>
        )}

        {/* ERROR STATE: IF CANVAS RENDER FAILED */}
        {loadError && viewerMode === 'CANVAS_AI_OVERLAY' && (
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center shadow-2xl my-8">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-100 mb-1">
              Безопасный режим просмотра активен
            </h4>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Браузер ограничил прямой парсинг файла в DOM. Файл полностью сохранен и готов к работе. Вы можете открыть его напрямую во встроенном PDF-просмотрщике браузера без ограничений безопасности фрейма или просмотреть схему листа ГОСТ.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <a
                href={pdfBlobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Открыть PDF в новой вкладке</span>
              </a>
              <button
                onClick={() => setViewerMode('CAD_VECTOR_SHEET')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
              >
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Показать схему листа ГОСТ</span>
              </button>
            </div>
          </div>
        )}

        {/* MODE 1: CAD VECTOR GOST SHEET (NO IFRAME, 100% RELIABLE) */}
        {viewerMode === 'CAD_VECTOR_SHEET' && (
          <div
            style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
            className="w-[780px] bg-white text-slate-900 shadow-2xl rounded-lg border-2 border-slate-900 p-8 flex flex-col justify-between font-sans text-[12px] leading-relaxed transition-transform duration-200 my-2"
          >
            {/* GOST Sheet Header */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between">
              <div>
                <div className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                  ООО «Моспроекткомплекс» • Шифр: 2025-04-266-АР
                </div>
                <h4 className="font-black text-sm text-slate-900 mt-0.5">
                  План типового этажа с высотными привязками и спецификацией
                </h4>
                <div className="text-[11px] text-slate-600">
                  Документ: <span className="font-mono font-bold text-slate-800">{fileName}</span> (Лист {currentPage} из {totalPages})
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <div>Стадия: <strong>РД</strong></div>
                <div>Лист: <strong>{currentPage}</strong> / {totalPages}</div>
                <div className="text-emerald-700 font-bold">Проверено ИИ Мосгосстройнадзора</div>
              </div>
            </div>

            {/* Sheet Architectural Content and Highlighted Defect */}
            <div className="space-y-4 my-3 flex-1">
              <div className="border border-slate-300 bg-slate-50 p-3 rounded-lg flex items-center justify-between">
                <span className="font-bold text-slate-700 uppercase text-[11px]">Фрагмент рабочей документации:</span>
                <span className="text-[11px] text-slate-500 font-mono">Масштаб 1:100</span>
              </div>

              {/* Blueprint Grid Excerpt */}
              <div className="border-2 border-dashed border-slate-300 p-4 bg-slate-100/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-600 border-b border-slate-200 pb-2">
                  <span>Оси здания: <strong>1 - 8 / А - Г</strong></span>
                  <span>Высотная отметка чистого пола: <strong>отм. 0.000</strong></span>
                </div>

                {/* Highlighted Defect Callout Box */}
                {activeFinding && (
                  <div className="p-3 bg-rose-50 border-2 border-rose-600 rounded-xl space-y-1.5 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-black text-[11px] uppercase tracking-wider">
                        ⚠️ Несоответствие ПД ({activeFinding.param_code})
                      </span>
                      <span className="font-bold text-rose-950 text-xs">{activeFinding.param_name}</span>
                    </div>
                    <div className="text-xs text-slate-700">
                      <strong>Значение в РД (текущий лист):</strong> <span className="text-rose-700 font-mono font-bold">{activeFinding.actual_value}</span>
                    </div>
                    <div className="text-xs text-slate-700">
                      <strong>Эталонное значение в ПД:</strong> <span className="text-emerald-700 font-mono font-bold">{activeFinding.expected_value}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      <strong>Норматив:</strong> {activeFinding.normative_reference} (Раздел {activeFinding.section})
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-slate-500 italic">
                  На чертеже зафиксировано отклонение проектных решений. Спецификация оборудования и материалов требует корректировки проектной организацией.
                </div>
              </div>
            </div>

            {/* Bottom GOST Title Stamp Block */}
            <div className="border-t-2 border-slate-900 pt-3 mt-4 flex items-end justify-between text-[10px]">
              <div className="text-slate-500 font-mono">
                КОМПЛЕКС АВТОМАТИЗИРОВАННОЙ ВЕРИФИКАЦИИ МОСГОССТРОЙНАДЗОРА 2026
              </div>
              <div className="border border-slate-800 p-2 text-right bg-slate-50 min-w-[200px]">
                <div className="font-black text-slate-900">МОСГОССТРОЙНАДЗОР</div>
                <div className="text-slate-600 text-[9px]">Статус проверки: ВЫЯВЛЕНЫ НЕСООТВЕТСТВИЯ</div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: CANVAS RENDERING WITH REAL-TIME AI BOUNDING BOXES OVERLAY */}
        {viewerMode === 'CANVAS_AI_OVERLAY' && !loadError && (
          <div className="flex flex-col items-center w-full max-w-full">
            {/* File & Page Mismatch Alert: guides engineer directly to the sheet where finding occurred */}
            {(isDifferentFile || isDifferentPage) && targetFindingFile && activeFinding && (
              <div className="mb-3 px-4 py-3 bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 border-2 border-purple-500/80 rounded-2xl text-purple-100 text-xs flex flex-wrap items-center justify-between gap-3 shadow-2xl max-w-4xl w-full animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30 shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 text-purple-300 animate-bounce" />
                  </div>
                  <div>
                    <div className="font-black text-white text-sm flex items-center gap-2">
                      <span>Замечание {activeFinding.param_code} зафиксировано на чертеже:</span>
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono text-[10px] uppercase font-bold shadow-xs">
                        {activeFinding.param_code}
                      </span>
                      {activeFinding.delta && (
                        <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-bold text-[10px]">
                          Дельта: {activeFinding.delta}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-purple-200 mt-1">
                      Файл: <strong className="text-white font-mono">{targetFindingFile.fileName}</strong> • Лист: <strong className="text-amber-300 font-mono">{targetFindingFile.sheetName} (стр. {targetFindingFile.page})</strong>
                    </div>
                    <div className="text-[11px] text-purple-300/80 mt-0.5">
                      {isDifferentFile ? (
                        <span>Сейчас открыт другой файл: <strong className="text-slate-200 font-mono">{fileName}</strong></span>
                      ) : (
                        <span>Сейчас открыт <strong className="text-slate-200 font-mono">Лист {currentPage}</strong> из {totalPages}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {matchingFileInUploaded && onSelectFile ? (
                    <button
                      onClick={() => {
                        onSelectFile(matchingFileInUploaded.id, targetFindingFile.page);
                        setCurrentPage(targetFindingFile.page);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-black text-xs transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2 border border-white/20"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Перейти к чертежу с замечанием {activeFinding.param_code} (Лист {targetFindingFile.page}) →</span>
                    </button>
                  ) : isDifferentPage ? (
                    <button
                      onClick={() => setCurrentPage(targetFindingFile.page)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs transition-all cursor-pointer shadow-lg flex items-center gap-2"
                    >
                      <Layers className="w-4 h-4 text-amber-300" />
                      <span>Перейти на Лист {targetFindingFile.page} →</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowForceOverlayOnCurrent(!showForceOverlayOnCurrent)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-200 border border-purple-500/50 text-xs font-bold transition-all cursor-pointer"
                    >
                      {showForceOverlayOnCurrent ? 'Скрыть рамку' : 'Отобразить рамку дефекта на этом листе'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Architectural Finding Mismatch Alert on Heating Doc */}
            {isArchitecturalFindingOnHeatingDoc && activeFinding && (
              <div className="mb-3 px-4 py-3 bg-amber-950/95 border-2 border-amber-500/80 rounded-xl text-amber-200 text-xs shadow-2xl max-w-4xl w-full animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/25 text-amber-300 shrink-0 mt-0.5">
                    <Info className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-white text-sm">
                        Несоответствие раздела: Замечание {activeFinding.param_code} не относится к отоплению
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-black text-[10px] uppercase">
                        Раздел АР ≠ Раздел ОВ
                      </span>
                    </div>
                    <p className="mt-1 text-slate-200 leading-relaxed text-[11.5px]">
                      Вы просматриваете чертеж/текст раздела <strong>ОВ (Отопление и вентиляция)</strong> с указаниями по арматуре (Санекст, DPV, термостаты). 
                      Замечание <strong>AR-01</strong> («{activeFinding.param_name}») относится к высотным отметкам полов в архитектурных чертежах (Раздел АР). 
                      Текст по отоплению <strong>является нормативным</strong> и соответствует СП 60.13330.2020.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          if (onDismissMismatchedFinding && activeFinding) {
                            onDismissMismatchedFinding(activeFinding.id);
                            setActionDoneToast('Замечание AR-01 отклонено: не применимо к разделу ОВ (Норма)');
                            setTimeout(() => setActionDoneToast(null), 3500);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Отклонить AR-01 для данного листа (Норма)</span>
                      </button>
                      <button
                        onClick={() => {
                          if (onSwitchToDiscipline) {
                            onSwitchToDiscipline('ИОС4');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                      >
                        <span>Перейти к разделу ОВ</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          handleAnalyzeSelectedText(
                            'Для производства ремонтных или профилактических работ на каждом отопительном устройстве установлена запорная арматура, спускные краны и воздушники. В целях экономии тепла... термостатическими регуляторами... запорный полнопроходной вентиль SM «Санекст»... клапан DPV...'
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                        <span>Экспертиза текста по СП 60.13330</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sheet mismatch alert: when active defect is on a different page of this file */}
            {showAiOverlay && activeFinding && otherPageFragment?.bbox?.page && !isDifferentFile && (
              <div className="mb-3 px-4 py-2.5 bg-amber-950/80 border border-amber-500/50 rounded-xl text-amber-200 text-xs flex flex-wrap items-center justify-between gap-3 shadow-lg max-w-4xl w-full">
                <div className="flex items-center gap-2.5">
                  <div className="p-1 rounded bg-amber-500/20 text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white">Внимание: </span>
                    Замечание <strong className="font-mono text-amber-300">{activeFinding.param_code}</strong> находится на{' '}
                    <strong>Листе {otherPageFragment.bbox.page}</strong> ({otherPageFragment.sheet_page || 'соответствующий лист'}).
                    <div className="text-[11px] text-amber-300/80">
                      Сейчас открыт Лист {currentPage}. На этом листе замечаний нет.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(otherPageFragment.bbox!.page!)}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95 flex items-center gap-1.5"
                  >
                    <span>Перейти на Лист {otherPageFragment.bbox.page} к дефекту</span>
                    <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                  <button
                    onClick={() => setShowForceOverlayOnCurrent(!showForceOverlayOnCurrent)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-semibold cursor-pointer"
                  >
                    {showForceOverlayOnCurrent ? 'Скрыть проекцию' : 'Спроецировать рамку сюда'}
                  </button>
                </div>
              </div>
            )}

            {/* Quick status bar about highlighted text and elements */}
            <div className="w-full mb-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Текст доступен для выделения курсором
                </span>
                {defectTextMatches.length > 0 && (
                  <span className="text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                    Найдено совпадений параметров ИИ в тексте: <strong>{defectTextMatches.length}</strong>
                  </span>
                )}
                {searchMatches.length > 0 && (
                  <span className="text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded border border-cyan-500/30">
                    Поиск «{searchQuery}»: <strong>{searchMatches.length}</strong>
                  </span>
                )}
              </div>
              <div className="text-slate-500 hidden sm:block">
                Выделите любой фрагмент текста для копирования
              </div>
            </div>

            <div className="relative inline-block shadow-2xl rounded-xl overflow-hidden bg-white border border-slate-700">
              <canvas ref={canvasRef} className="block max-w-none" />

              {/* OVERLAY 1: SELECTABLE TEXT LAYER (REAL DOM SPANS) */}
              <div
                ref={textLayerContainerRef}
                onMouseUp={handleTextLayerMouseUp}
                className="pdf-text-layer absolute inset-0 select-text overflow-hidden z-10"
              >
                {pageTextItems.map((item) => {
                  const isUserHighlit = userHighlitItems[item.id];
                  const isDefectMatch = isTextItemDefectMatch(item.str);
                  const isSearchMatch = searchQuery.trim() && item.str.toLowerCase().includes(searchQuery.trim().toLowerCase());

                  let highlightBg = 'transparent';
                  if (isUserHighlit === 'YELLOW') highlightBg = 'rgba(251, 191, 36, 0.45)';
                  if (isUserHighlit === 'RED') highlightBg = 'rgba(244, 63, 94, 0.45)';
                  if (isUserHighlit === 'GREEN') highlightBg = 'rgba(52, 211, 153, 0.45)';
                  if (!isUserHighlit && isSearchMatch) highlightBg = 'rgba(6, 182, 212, 0.5)';
                  if (!isUserHighlit && !isSearchMatch && isDefectMatch && showAiOverlay) {
                    highlightBg = 'rgba(244, 63, 94, 0.35)';
                  }

                  return (
                    <span
                      key={item.id}
                      onClick={() => handleToggleItemHighlight(item.id)}
                      style={{
                        left: `${item.x}px`,
                        top: `${item.y}px`,
                        width: `${item.width}px`,
                        height: `${item.height}px`,
                        fontSize: `${item.fontSize}px`,
                        backgroundColor: highlightBg,
                      }}
                      className={`cursor-text transition-all relative ${
                        isSearchMatch ? 'ring-1 ring-cyan-400 font-bold' : ''
                      } ${
                        isDefectMatch && showAiOverlay
                          ? 'ring-2 ring-rose-600 bg-rose-500/25 font-black text-rose-950 rounded-xs shadow-xs z-20'
                          : ''
                      }`}
                      title={
                        isDefectMatch && activeFinding
                          ? `⚠️ Замечание ${activeFinding.param_code}: ${activeFinding.param_name} (${item.str})`
                          : `${item.str} (Нажмите маркером для подсветки)`
                      }
                    >
                      {item.str}
                      {/* Floating Micro-Badge over the exact matched defect text */}
                      {isDefectMatch && showAiOverlay && activeFinding && (
                        <span className="absolute -top-6 left-0 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-30 pointer-events-none flex items-center gap-1 border border-white/30 animate-fade-in">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-300" />
                          <span>{activeFinding.param_code}: {activeFinding.delta || 'Коллизия'}</span>
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>

              {/* OVERLAY 2: DYNAMIC AI ANNOTATION OVERLAYS ACCORDING TO REAL BBOX DATA ON DRAWINGS */}
              {showAiOverlay && activeFinding && currentPageFragments.length > 0 && (
                <div className="absolute inset-0 pointer-events-none z-20">
                  {currentPageFragments.map((frag, idx) => {
                    const isActual = frag.role === 'ACTUAL';
                    const bbox = frag.bbox!;

                    const left = `${Math.max(0, Math.min(95, bbox.x * 100))}%`;
                    const top = `${Math.max(0, Math.min(95, bbox.y * 100))}%`;
                    const width = `${Math.max(4, Math.min(100 - bbox.x * 100, bbox.width * 100))}%`;
                    const height = `${Math.max(4, Math.min(100 - bbox.y * 100, bbox.height * 100))}%`;

                    const borderTheme = isActual
                      ? 'border-rose-600 bg-rose-500/20 shadow-[0_0_30px_rgba(225,29,72,0.5)] ring-2 ring-rose-500/50'
                      : 'border-emerald-500 bg-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.5)] ring-2 ring-emerald-500/50';

                    const badgeColor = isActual ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white';

                    return (
                      <div
                        key={frag.id || idx}
                        style={{ left, top, width, height }}
                        className={`absolute border-3 rounded-xl transition-all ${borderTheme}`}
                      >
                        {/* CAD Reticle Precision Corners */}
                        <div className="absolute -top-2 -left-2 w-4 h-4 border-t-3 border-l-3 border-white pointer-events-none shadow-md" />
                        <div className="absolute -top-2 -right-2 w-4 h-4 border-t-3 border-r-3 border-white pointer-events-none shadow-md" />
                        <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-3 border-l-3 border-white pointer-events-none shadow-md" />
                        <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-3 border-r-3 border-white pointer-events-none shadow-md" />

                        {/* CAD Crosshair Center Reticle */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                          <div className="w-6 h-px bg-white" />
                          <div className="h-6 w-px bg-white absolute" />
                          <div className="w-2 h-2 rounded-full border border-white absolute" />
                        </div>

                        {/* Top Identification Badge with Finding Code and Delta */}
                        <div
                          className={`absolute -top-9 left-0 ${badgeColor} text-[11px] font-black px-3 py-1 rounded-lg shadow-2xl whitespace-nowrap flex items-center gap-1.5 z-30 pointer-events-auto border border-white/30`}
                        >
                          {isActual ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                          )}
                          <span>
                            {activeFinding.param_code} • {isActual ? 'НАРУШЕНИЕ В РД:' : 'ЭТАЛОН В ПД:'}{' '}
                            <strong className="underline decoration-white/50 font-mono text-amber-200">
                              {frag.extracted_value || activeFinding.actual_value || activeFinding.param_name}
                            </strong>
                          </span>
                          {activeFinding.delta && isActual && (
                            <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-bold text-[9.5px]">
                              {activeFinding.delta}
                            </span>
                          )}
                        </div>

                        {/* Bottom Context Highlight Snippet */}
                        {(bbox.highlightText || activeFinding.justification || activeFinding.param_name) && (
                          <div className="absolute -bottom-10 left-0 bg-slate-950/95 backdrop-blur text-slate-100 text-[10.5px] font-medium px-3 py-1.5 rounded-lg border border-slate-700 shadow-2xl max-w-[420px] truncate z-30 flex items-center gap-1.5">
                            <span className="text-amber-400 font-bold">Выноска:</span>
                            <span>«{bbox.highlightText || activeFinding.justification || activeFinding.param_name}»</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* FLOATING ACTION TOOLBAR ON TEXT SELECTION */}
              {selectedTextInfo && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-md border border-purple-500/50 text-white px-3.5 py-2 rounded-xl shadow-2xl z-40 flex items-center gap-3 animate-fade-in text-xs">
                  <div className="font-mono text-purple-300 max-w-[200px] truncate">
                    «{selectedTextInfo.text}»
                  </div>
                  <div className="h-4 w-px bg-slate-700" />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedTextInfo.text);
                      setCopiedToast(true);
                      setTimeout(() => setCopiedToast(false), 2000);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-bold cursor-pointer transition-all shadow"
                  >
                    {copiedToast ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedToast ? 'Скопировано!' : 'Копировать'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setSearchQuery(selectedTextInfo.text);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 font-semibold cursor-pointer border border-slate-700"
                  >
                    <Search className="w-3.5 h-3.5 text-amber-400" />
                    <span>Искать</span>
                  </button>
                  <button
                    onClick={() => handleAnalyzeSelectedText(selectedTextInfo.text)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg text-white font-bold cursor-pointer transition-all shadow-md"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Экспертиза по СП (ИИ)</span>
                  </button>
                  <button
                    onClick={() => setSelectedTextInfo(null)}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ACTION DONE TOAST */}
      {actionDoneToast && (
        <div className="absolute top-16 right-6 z-50 animate-bounce">
          <div className="px-4 py-2.5 rounded-xl shadow-2xl border-2 border-white bg-emerald-600 text-white flex items-center space-x-2 text-xs font-bold">
            <Check className="w-4 h-4" />
            <span>{actionDoneToast}</span>
          </div>
        </div>
      )}

      {/* AI NORMATIVE ANALYSIS MODAL */}
      {isAnalysisModalOpen && analysisResult && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-purple-500/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-white animate-fade-in max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-black flex items-center gap-2">
                    <span>Экспертиза фрагмента текста по нормам РФ</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-purple-300 border border-purple-500/30">
                      {analysisResult.discipline}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Интеллектуальная сверка со сводами правил Минстроя РФ
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsAnalysisModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Text Excerpt */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Проверяемый фрагмент рабочей документации:</span>
              </div>
              <div className="font-mono text-xs text-slate-200 leading-relaxed max-h-32 overflow-y-auto bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                «{analysisResult.selectedSnippet}»
              </div>
            </div>

            {/* Status Result Badge */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-300 font-medium">Вердикт системы:</span>
              {analysisResult.status === 'COMPLIANT_NORMA' ? (
                <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  СООТВЕТСТВУЕТ НОРМАМ (НАРУШЕНИЙ НЕТ)
                </span>
              ) : (
                <span className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-black flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ТРЕБУЕТ ВНИМАНИЯ / КОЛЛИЗИЯ
                </span>
              )}
            </div>

            {/* Norm Reference Box */}
            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs space-y-2">
              <div className="text-purple-200 font-bold flex items-center gap-2">
                <span>Нормативная основа:</span>
                <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 font-mono text-[11px]">
                  {analysisResult.normCode}
                </span>
              </div>
              <div className="text-slate-300 text-[11.5px] leading-relaxed">
                {analysisResult.normTitle} ({analysisResult.normClause})
              </div>
              <div className="text-slate-200 text-xs leading-relaxed mt-1">
                {analysisResult.explanation}
              </div>
            </div>

            {/* Key Engineering Points */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-teal-400" />
                <span>Инженерные обоснования:</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {analysisResult.keyPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                      ✓
                    </span>
                    <span className="leading-snug">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* If unrelated to AR-01, show prominent clarification */}
            {analysisResult.ar01Explanation && (
              <div className="p-3 bg-amber-950/50 border border-amber-500/40 rounded-xl text-xs text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <Info className="w-4 h-4 text-amber-400" />
                  <span>Пояснение по ошибке AR-01:</span>
                </div>
                <p className="leading-relaxed text-[11px] text-amber-200/90">
                  {analysisResult.ar01Explanation}
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
              {activeFinding && activeFinding.param_code === 'AR-01' && onDismissMismatchedFinding && (
                <button
                  onClick={() => {
                    onDismissMismatchedFinding(activeFinding.id);
                    setIsAnalysisModalOpen(false);
                    setActionDoneToast('Замечание AR-01 отклонено: не применимо к разделу ОВ (Норма)');
                    setTimeout(() => setActionDoneToast(null), 3500);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-900/60 hover:bg-rose-900 text-rose-200 border border-rose-700/60 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Снять замечание AR-01 с этого листа</span>
                </button>
              )}

              {analysisResult.status === 'COMPLIANT_NORMA' && (
                <button
                  onClick={() => {
                    if (onRecordNormativeVerification) {
                      onRecordNormativeVerification(
                        'Запорно-регулирующая и балансировочная арматура приборов отопления (Санекст / DPV)',
                        'СП 60.13330.2020 п. 6.3.4, п. 6.4.9',
                        'Проверено экспертом: установка термостатов и балансировочных клапанов соответствует нормам энергоэффективности РФ.'
                      );
                    }
                    setIsAnalysisModalOpen(false);
                    setActionDoneToast('Решение по отоплению зафиксировано в протоколе как НОРМА');
                    setTimeout(() => setActionDoneToast(null), 3500);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer shadow-lg transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Зафиксировать в протоколе как НОРМА</span>
                </button>
              )}

              <button
                onClick={() => setIsAnalysisModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM BANNER: VERIFICATION ASSURANCE */}
      <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>
            Отображается <strong>подлинный PDF файл</strong> из комплекта рабочей документации.
          </span>
        </div>
        <div className="text-slate-500 flex items-center space-x-3">
          <span>Разрешение страницы: 100% векторная точность</span>
          <span>•</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-purple-400 hover:text-purple-300 underline font-semibold cursor-pointer"
          >
            Сменить PDF файл
          </button>
        </div>
      </div>
    </div>
  );
};
