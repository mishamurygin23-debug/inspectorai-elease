import React, { useState, useMemo } from 'react';
import {
  ScanLine,
  FileText,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Search,
  Code2,
  Sparkles,
  Download,
  Copy,
  Check,
  Eye,
  Crosshair,
  Filter,
  Play,
  RotateCcw,
  Sliders,
  HelpCircle,
  Tag,
  Hash,
  Compass,
  FileCheck
} from 'lucide-react';
import { UploadedPdfMetadata } from './ActualPdfViewer';
import { CheckFinding } from '../types';

export interface ParsedDrawingEntity {
  id: string;
  category: 'METADATA_STAMP' | 'ELEVATION_MARK' | 'DIMENSION' | 'SPECIFICATION_ROW' | 'NOTE_TEXT' | 'COLLISION_DEFECT';
  categoryLabel: string;
  rawText: string;
  normalizedValue: string;
  bbox: { x: number; y: number; width: number; height: number }; // Percentage [0; 100]
  confidence: number;
  matrixParamCode?: string;
  matrixParamName?: string;
  pdExpectedValue?: string;
  delta?: string;
  isViolation: boolean;
  explanation: string;
}

interface DrawingParserTabProps {
  uploadedFiles?: UploadedPdfMetadata[];
  findings?: CheckFinding[];
  activeFinding?: CheckFinding;
  onSelectFinding?: (id: string) => void;
  onNavigateToVerification?: () => void;
}

export const DrawingParserTab: React.FC<DrawingParserTabProps> = ({
  uploadedFiles = [],
  findings = [],
  activeFinding,
  onSelectFinding,
  onNavigateToVerification,
}) => {
  // 1. Selected document and sheet
  const defaultFileId = uploadedFiles[0]?.id || 'file-rd-01';
  const [selectedFileId, setSelectedFileId] = useState<string>(defaultFileId);
  const [selectedSheetPage, setSelectedSheetPage] = useState<number>(2);

  // 2. Visual layer visibility filters
  const [showStamps, setShowStamps] = useState<boolean>(true);
  const [showElevations, setShowElevations] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showSpecs, setShowSpecs] = useState<boolean>(true);
  const [showCollisions, setShowCollisions] = useState<boolean>(true);

  // 3. Parser Pipeline execution state
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseProgress, setParseProgress] = useState<number>(100);
  const [pipelinePhase, setPipelinePhase] = useState<string>('Парсинг завершен (100%)');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>('ent-stamp-01');
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // 4. Interactive Sandbox Playground state
  const [sandboxText, setSandboxText] = useState<string>(
    'РД-2025-04.266-АР2. АРХИТЕКТУРНЫЕ РЕШЕНИЯ. ФАСАД. КРОВЛЯ. Отм. 0.000 соответствует 164.180 в Балтийской системе высот.'
  );
  const [sandboxResult, setSandboxResult] = useState<any | null>(null);

  const currentFile = uploadedFiles.find((f) => f.id === selectedFileId) || uploadedFiles[0] || {
    id: 'file-rd-01',
    name: 'РД-2025-04.266-АР2_Фасады_Раскладка_панелей_Витражи.pdf',
    sizeMb: 38.7,
    blobUrl: '',
    uploadedAt: '2026-07-08T10:27:12Z',
    pageCount: 15,
  };

  // Mock parsed entities for the current sheet
  const currentSheetEntities: ParsedDrawingEntity[] = useMemo(() => {
    if (selectedSheetPage === 2) {
      // Title Sheet / Sheet 1 (Общие данные)
      return [
        {
          id: 'ent-stamp-01',
          category: 'METADATA_STAMP',
          categoryLabel: 'Штамп / Шифр документа (ГОСТ Р 21.101)',
          rawText: 'РД-2025-04.266-АР2',
          normalizedValue: 'РД-2025-04.266-АР2',
          bbox: { x: 70, y: 39, width: 18, height: 4 },
          confidence: 0.998,
          isViolation: false,
          explanation:
            'Классифицировано как служебный шифр комплекта рабочей документации (ГОСТ Р 21.101-2020). Исключено из анализа дефектов: это метаданные чертежа, а не ошибка.',
        },
        {
          id: 'ent-stamp-02',
          category: 'METADATA_STAMP',
          categoryLabel: 'Штамп / Организация и Заказчик',
          rawText: 'Заказчик: ООО Фирма РУСЬ ТРЕЙ',
          normalizedValue: 'ООО Фирма РУСЬ ТРЕЙ',
          bbox: { x: 64, y: 13, width: 25, height: 3 },
          confidence: 0.994,
          isViolation: false,
          explanation: 'Реквизиты заказчика строительства. Статус: Метаданные титула.',
        },
        {
          id: 'ent-stamp-03',
          category: 'METADATA_STAMP',
          categoryLabel: 'Наименование объекта',
          rawText: 'Торговое здание по адресу: г. Москва, Алтуфьевское шоссе д. 79Б, стр. 1',
          normalizedValue: 'Алтуфьевское шоссе д. 79Б',
          bbox: { x: 62, y: 19, width: 30, height: 4 },
          confidence: 0.997,
          isViolation: false,
          explanation: 'Адресная привязка объекта экспертизы.',
        },
        {
          id: 'ent-stamp-04',
          category: 'METADATA_STAMP',
          categoryLabel: 'Вид документации и Раздел',
          rawText: 'РАБОЧАЯ ДОКУМЕНТАЦИЯ. АР2. АРХИТЕКТУРНЫЕ РЕШЕНИЯ',
          normalizedValue: 'Раздел АР2',
          bbox: { x: 61, y: 28, width: 32, height: 7 },
          confidence: 0.999,
          isViolation: false,
          explanation: 'Марка комплекта чертежей по ГОСТ 21.501-2018.',
        },
        {
          id: 'ent-elev-01',
          category: 'COLLISION_DEFECT',
          categoryLabel: 'Высотная отметка (Критическая коллизия!)',
          rawText: '2. За отм. 0.000 принята абсолютная отметка 164.180 в Балтийской системе высот',
          normalizedValue: '164.180 м (БСВ)',
          bbox: { x: 12, y: 52, width: 38, height: 6 },
          confidence: 0.991,
          matrixParamCode: 'AR-01',
          matrixParamName: 'Высотная отметка чистого пола первого этажа 0.000',
          pdExpectedValue: 'Абс. отм. 165.00 м (ПД: лист 3)',
          delta: '-820 мм (занижение посадки здания)',
          isViolation: true,
          explanation:
            'КОЛЛИЗИЯ С ПД! В утвержденной проектной документации отметка 0.000 составляет 165.000 м. В РД указано 164.180 м. Занижение на 820 мм без согласования с Москомархитектурой.',
        },
        {
          id: 'ent-dim-01',
          category: 'DIMENSION',
          categoryLabel: 'Линейный размер / Габарит здания',
          rawText: 'Габаритные размеры здания в осях 1-12/А-Ж: 72.00 × 36.00 м',
          normalizedValue: '72.00 × 36.00 м',
          bbox: { x: 12, y: 62, width: 32, height: 4 },
          confidence: 0.985,
          isViolation: false,
          explanation: 'Габариты здания соответствуют ГПЗУ и разделу СПЗУ. Расхождений нет.',
        },
        {
          id: 'ent-note-01',
          category: 'NOTE_TEXT',
          categoryLabel: 'Общие указания / Нормативная ссылка',
          rawText: 'Проект разработан в соответствии с СП 118.13330.2022, СП 20.13330.2016',
          normalizedValue: 'СП 118.13330.2022',
          bbox: { x: 12, y: 70, width: 34, height: 4 },
          confidence: 0.978,
          isViolation: false,
          explanation: 'Нормативная база указана корректно.',
        },
      ];
    } else {
      // General sheets (e.g. Plan / Spec)
      return [
        {
          id: 'ent-spec-01',
          category: 'COLLISION_DEFECT',
          categoryLabel: 'Спецификация проемов (Нарушение)',
          rawText: 'Блок Д-12: Дверной блок металлический ДПМ EI 60, проем 800 × 2100 мм',
          normalizedValue: '800 × 2100 мм (в свету 790 мм)',
          bbox: { x: 18, y: 35, width: 35, height: 6 },
          confidence: 0.988,
          matrixParamCode: 'AR-41',
          matrixParamName: 'Ширина эвакуационной двери Д-12',
          pdExpectedValue: '1000 × 2100 мм (в свету ≥900 мм)',
          delta: '-200 мм (заужение эвакуационного выхода на 21%)',
          isViolation: true,
          explanation: 'Нарушение СП 1.13130.2020 п. 4.2.19 и 123-ФЗ ст. 89: ширина выхода заужена.',
        },
        {
          id: 'ent-spec-02',
          category: 'COLLISION_DEFECT',
          categoryLabel: 'Спецификация панелей фасада (Нарушение)',
          rawText: 'Панели трехслойные сэндвич Венталл-С3, толщина 150 мм',
          normalizedValue: '150 мм',
          bbox: { x: 18, y: 48, width: 30, height: 5 },
          confidence: 0.992,
          matrixParamCode: 'AR-12',
          matrixParamName: 'Толщина наружных сэндвич-панелей фасада',
          pdExpectedValue: '120 мм (ПД: лист 8)',
          delta: '+30 мм толщины (+25% постоянной нагрузки)',
          isViolation: true,
          explanation: 'Увеличение веса ограждающих конструкций без поверочного расчета стального каркаса.',
        },
        {
          id: 'ent-dim-02',
          category: 'DIMENSION',
          categoryLabel: 'Шаг колонн фахверка',
          rawText: 'Шаг колонн в осях: 6000 мм',
          normalizedValue: '6000 мм',
          bbox: { x: 55, y: 40, width: 22, height: 4 },
          confidence: 0.994,
          isViolation: false,
          explanation: 'Шаг колонн соответствует проектной документации раздела КР.',
        },
        {
          id: 'ent-stamp-05',
          category: 'METADATA_STAMP',
          categoryLabel: 'Штамп основной надписи листа',
          rawText: 'РД-2025-04.266-АР2. Лист 9. Спецификация элементов заполнения проемов',
          normalizedValue: 'Лист 9',
          bbox: { x: 65, y: 88, width: 28, height: 8 },
          confidence: 0.999,
          isViolation: false,
          explanation: 'ГОСТ Р 21.101-2020 Форма 3. Служебный штамп чертежа.',
        },
      ];
    }
  }, [selectedSheetPage]);

  // Filtered entities according to active toggle checkboxes
  const visibleEntities = useMemo(() => {
    return currentSheetEntities.filter((ent) => {
      if (ent.category === 'METADATA_STAMP' && !showStamps) return false;
      if (ent.category === 'ELEVATION_MARK' && !showElevations) return false;
      if (ent.category === 'DIMENSION' && !showDimensions) return false;
      if (ent.category === 'SPECIFICATION_ROW' && !showSpecs) return false;
      if (ent.category === 'COLLISION_DEFECT' && !showCollisions) return false;
      return true;
    });
  }, [currentSheetEntities, showStamps, showElevations, showDimensions, showSpecs, showCollisions]);

  const selectedEntity = useMemo(() => {
    return currentSheetEntities.find((e) => e.id === selectedEntityId) || currentSheetEntities[0];
  }, [currentSheetEntities, selectedEntityId]);

  // Handle re-running the full parsing pipeline
  const handleRunParser = () => {
    setIsParsing(true);
    setParseProgress(10);
    setPipelinePhase('1. Растеризация PDF и извлечение сырого текстового слоя (PDF.js)...');

    setTimeout(() => {
      setParseProgress(35);
      setPipelinePhase('2. Сегментация структуры чертежа: штамп ГОСТ Р 21.101 vs поле чертежа...');
    }, 450);

    setTimeout(() => {
      setParseProgress(65);
      setPipelinePhase('3. Распознавание инженерных сущностей (NER): отметки, размеры, марки...');
    }, 900);

    setTimeout(() => {
      setParseProgress(88);
      setPipelinePhase('4. Сопоставление с матрицей 132 параметров и проектной документацией (ПД)...');
    }, 1300);

    setTimeout(() => {
      setParseProgress(100);
      setIsParsing(false);
      setPipelinePhase('Парсинг листа завершен успешно! Найдено сущностей: ' + currentSheetEntities.length);
    }, 1700);
  };

  // Test custom text parser in the sandbox
  const handleRunSandboxParser = () => {
    const text = sandboxText.trim();
    if (!text) return;

    // Simulate real AI entity extraction on the entered text
    const lower = text.toLowerCase();
    const entitiesFound: any[] = [];

    // Check for document codes / stamps
    if (/рд[\s\-_]*\d+|жс[\s\-_]*\d+|пд[\s\-_]*\d+/i.test(text)) {
      const match = text.match(/(?:РД|ПД|ЖС)[\s\-_0-9A-Za-zА-Яа-я.]+/i);
      entitiesFound.push({
        type: 'METADATA_DOCUMENT_CODE',
        typeLabel: 'Шифр / Метаданные чертежа',
        token: match ? match[0] : 'Шифр',
        status: 'IGNORED_NOT_DEFECT',
        isViolation: false,
        confidence: 0.998,
        description: 'Определен шифр документации. Парсер отфильтровывает его из замечаний.',
      });
    }

    // Check for elevations (AR-01)
    if (/164[.,]18|165[.,]00|отм[\s.]*0[.,]000/i.test(text)) {
      entitiesFound.push({
        type: 'ENGINEERING_ELEVATION',
        typeLabel: 'Высотная отметка чистого пола (AR-01)',
        token: '164.180 м (отм. 0.000)',
        status: 'COLLISION_DETECTED',
        isViolation: true,
        confidence: 0.992,
        matrixParamCode: 'AR-01',
        expectedPd: '165.000 м',
        delta: '-820 мм',
        description: 'Расхождение с ПД: занижение высотной посадки здания на 820 мм (СП 118.13330.2022).',
      });
    }

    // Check for doors (AR-41)
    if (/д-12|дпм|800\s*[×x*]\s*2100|790/i.test(text)) {
      entitiesFound.push({
        type: 'DIMENSION_DOOR',
        typeLabel: 'Габарит эвакуационной двери (AR-41)',
        token: 'Д-12: 800 × 2100 мм',
        status: 'COLLISION_DETECTED',
        isViolation: true,
        confidence: 0.987,
        matrixParamCode: 'AR-41',
        expectedPd: '1000 × 2100 мм',
        delta: '-200 мм в свету',
        description: 'Заужение выхода из торгового зала с массовым пребыванием людей (СП 1.13130.2020).',
      });
    }

    // Check for sandwich panels (AR-12)
    if (/150\s*мм|120\s*мм|венталл|сэндвич/i.test(text)) {
      entitiesFound.push({
        type: 'SPEC_PANEL_THICKNESS',
        typeLabel: 'Толщина сэндвич-панелей фасада (AR-12)',
        token: 'Венталл-С3 150 мм',
        status: 'COLLISION_DETECTED',
        isViolation: true,
        confidence: 0.991,
        matrixParamCode: 'AR-12',
        expectedPd: '120 мм (Rukki Rus)',
        delta: '+30 мм толщины',
        description: 'Увеличение веса на каркас на 25% без согласования с разделом КР.',
      });
    }

    if (entitiesFound.length === 0) {
      entitiesFound.push({
        type: 'GENERAL_TEXT',
        typeLabel: 'Нормативный текст / Описание',
        token: text.slice(0, 40) + '...',
        status: 'COMPLIANT',
        isViolation: false,
        confidence: 0.965,
        description: 'Параметрических коллизий не обнаружено. Текст соответствует ГОСТ и СПДС.',
      });
    }

    setSandboxResult({
      input: text,
      timestamp: new Date().toLocaleTimeString('ru-RU'),
      entities: entitiesFound,
    });
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(currentSheetEntities, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl border border-purple-800/40 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold mb-3 border border-purple-400/30">
              <ScanLine className="w-4 h-4 text-purple-300 animate-pulse" />
              <span>Интеллектуальный OCR & CAD-парсер чертежей v2.4</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Парсинг и извлечение данных из чертежей (ПД / РД)
            </h1>
            <p className="mt-2 text-sm text-purple-200/90 max-w-3xl leading-relaxed">
              Диагностика извлечения сущностей: разделение штампов и шифров по ГОСТ Р 21.101-2020,
              координационных отметок чистого пола, проектных размеров и автоматическое сопоставление с эталонной ПД.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleRunParser}
              disabled={isParsing}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg hover:shadow-purple-500/25 flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isParsing ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 text-amber-300 fill-amber-300" />
              )}
              <span>{isParsing ? 'Идет парсинг...' : 'Запустить парсинг листа'}</span>
            </button>

            {onNavigateToVerification && (
              <button
                onClick={onNavigateToVerification}
                className="px-4 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-purple-200 font-bold text-xs border border-purple-500/40 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-rose-400" />
                <span>Открыть вьюер с ошибками →</span>
              </button>
            )}
          </div>
        </div>

        {/* Pipeline Progress Bar */}
        {isParsing && (
          <div className="mt-6 pt-4 border-t border-purple-800/40">
            <div className="flex items-center justify-between text-xs font-mono text-purple-200 mb-1.5">
              <span>{pipelinePhase}</span>
              <span className="font-bold text-amber-300">{parseProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-amber-400 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${parseProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Document & Sheet Selector Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Файл:</span>
            <select
              value={selectedFileId}
              onChange={(e) => setSelectedFileId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:bg-white cursor-pointer"
            >
              {uploadedFiles.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name} ({file.sizeMb} МБ)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Лист / Страница:</span>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 9, 15].map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setSelectedSheetPage(pageNum)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedSheetPage === pageNum
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Лист {pageNum}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          <span>Распознано сущностей на листе: <strong className="font-mono text-slate-900">{currentSheetEntities.length}</strong></span>
        </div>
      </div>

      {/* 3. Main Grid: Left Blueprint Layer Canvas (8 cols) + Right Entity Inspector (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: BLUEPRINT CAD CANVAS & LAYER TOGGLES (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Layer Filter Toolbar */}
          <div className="bg-slate-900 text-white rounded-2xl p-3 px-4 shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-purple-300">
              <Layers className="w-4 h-4" />
              <span>Слои парсера:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg cursor-pointer border border-slate-700">
                <input
                  type="checkbox"
                  checked={showStamps}
                  onChange={(e) => setShowStamps(e.target.checked)}
                  className="rounded text-blue-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-blue-300 font-medium">Штампы & Шифры (ГОСТ)</span>
              </label>

              <label className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg cursor-pointer border border-slate-700">
                <input
                  type="checkbox"
                  checked={showCollisions}
                  onChange={(e) => setShowCollisions(e.target.checked)}
                  className="rounded text-rose-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-rose-300 font-bold">Коллизии / Дефекты</span>
              </label>

              <label className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg cursor-pointer border border-slate-700">
                <input
                  type="checkbox"
                  checked={showElevations}
                  onChange={(e) => setShowElevations(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-amber-300 font-medium">Отметки 0.000</span>
              </label>

              <label className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg cursor-pointer border border-slate-700">
                <input
                  type="checkbox"
                  checked={showDimensions}
                  onChange={(e) => setShowDimensions(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-emerald-300 font-medium">Размеры</span>
              </label>
            </div>
          </div>

          {/* Interactive Blueprint Sheet Visualizer */}
          <div className="bg-slate-950 rounded-2xl p-4 shadow-xl border border-slate-800 relative overflow-hidden min-h-[520px] flex flex-col items-center justify-center">
            {/* Sheet Canvas Mockup */}
            <div className="w-full max-w-[760px] aspect-[1/1.414] bg-white rounded-lg shadow-2xl relative border border-slate-600 overflow-hidden select-none">
              {/* Drawing Title Header Text */}
              <div className="absolute top-6 left-8 right-8 text-center text-slate-800 pointer-events-none">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Заказчик: ООО «Фирма РУСЬ ТРЕЙ»
                </div>
                <div className="text-xs font-black text-slate-800 mt-1">
                  Торговое здание по адресу: г. Москва, Алтуфьевское шоссе д. 79Б, стр. 1
                </div>
                <div className="text-sm font-black text-slate-900 mt-3 uppercase tracking-wide">
                  РАБОЧАЯ ДОКУМЕНТАЦИЯ
                </div>
                <div className="text-xs font-bold text-slate-700 mt-0.5">
                  АР2. «АРХИТЕКТУРНЫЕ РЕШЕНИЯ. ФАСАД. КРОВЛЯ. ВЕДОМОСТИ. СПЕЦИФИКАЦИИ. УЗЛЫ»
                </div>
              </div>

              {/* Title Code on Page */}
              <div className="absolute top-[39%] left-[64%] -translate-x-1/2 font-mono font-bold text-xs text-slate-800">
                РД-2025-04.266-АР2
              </div>

              {/* Notes Area */}
              <div className="absolute top-[50%] left-8 right-8 text-[10px] text-slate-700 leading-relaxed font-sans">
                <p className="font-bold mb-1">1. ОБЩИЕ УКАЗАНИЯ:</p>
                <p className="pl-2">
                  1.1. Настоящий комплект рабочих чертежей марки АР2 разработан на основании утвержденного задания на проектирование.
                </p>
                <p className="pl-2 mt-1 bg-amber-50/80 p-1 rounded border border-amber-300/50">
                  1.2. <strong>За относительную отметку 0.000 принята отметка чистого пола 1-го этажа, соответствующая абсолютной отметке 164.180</strong> в Балтийской системе высот.
                </p>
                <p className="pl-2 mt-1">
                  1.3. Габаритные размеры здания в осях 1-12/А-Ж: 72.00 × 36.00 м.
                </p>
                <p className="pl-2 mt-1">
                  1.4. Проект разработан в соответствии с СП 118.13330.2022 «Общественные здания и сооружения».
                </p>
              </div>

              {/* Bottom Stamp (ГОСТ Р 21.101) */}
              <div className="absolute bottom-4 right-4 w-[280px] h-[90px] border-2 border-slate-900 grid grid-rows-3 text-[8px] bg-slate-50 text-slate-900">
                <div className="border-b border-slate-900 px-1 py-0.5 flex justify-between font-bold">
                  <span>РД-2025-04.266-АР2</span>
                  <span>Изм. 4</span>
                </div>
                <div className="border-b border-slate-900 px-1 py-0.5 flex justify-between">
                  <span>Разраб: Ширихин З.В.</span>
                  <span>Лист 1</span>
                  <span>Листов 15</span>
                </div>
                <div className="px-1 py-0.5 font-bold truncate">
                  ООО «Моспроекткомплекс»
                </div>
              </div>

              {/* OVERLAY BOUNDING BOXES FOR VISIBLE PARSED ENTITIES */}
              {visibleEntities.map((ent) => {
                const isSelected = ent.id === selectedEntityId;
                const isViolation = ent.isViolation;
                const isStamp = ent.category === 'METADATA_STAMP';

                let borderStyle = 'border-blue-500 bg-blue-500/15 text-blue-900';
                if (isViolation) borderStyle = 'border-rose-600 bg-rose-500/25 text-rose-950 ring-2 ring-rose-500 shadow-lg';
                else if (isStamp) borderStyle = 'border-slate-500 bg-slate-500/15 text-slate-900 border-dashed';
                else if (ent.category === 'ELEVATION_MARK') borderStyle = 'border-amber-500 bg-amber-500/20 text-amber-950';
                else if (ent.category === 'DIMENSION') borderStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-950';

                return (
                  <div
                    key={ent.id}
                    onClick={() => setSelectedEntityId(ent.id)}
                    style={{
                      left: `${ent.bbox.x}%`,
                      top: `${ent.bbox.y}%`,
                      width: `${ent.bbox.width}%`,
                      height: `${ent.bbox.height}%`,
                    }}
                    className={`absolute border-2 rounded transition-all cursor-pointer hover:scale-[1.02] flex items-center justify-between p-1 text-[9px] font-bold ${borderStyle} ${
                      isSelected ? 'ring-4 ring-purple-600 shadow-2xl z-30 scale-[1.03]' : 'z-10'
                    }`}
                  >
                    <span className="truncate">{ent.rawText}</span>

                    <span
                      className={`text-[8px] font-black px-1 rounded ml-1 shrink-0 ${
                        isViolation ? 'bg-rose-600 text-white' : isStamp ? 'bg-slate-700 text-white' : 'bg-blue-600 text-white'
                      }`}
                    >
                      {isViolation ? 'ДЕФЕКТ' : isStamp ? 'ШТАМП' : 'НОРМА'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="text-slate-400 text-xs mt-3 flex items-center gap-2 font-medium">
              <Crosshair className="w-3.5 h-3.5 text-purple-400" />
              <span>Нажмите на любую распознанную плашку на чертеже для просмотра в инспекторе</span>
            </div>
          </div>
        </div>

        {/* RIGHT: ENTITY INSPECTOR & DIAGNOSTICS (4 COLS) */}
        <div className="lg:col-span-4 space-y-4">
          {selectedEntity ? (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-600" />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-700">Инспектор сущности</span>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    selectedEntity.isViolation
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {selectedEntity.isViolation ? '⚠️ КОЛЛИЗИЯ С ПД' : '✓ ВАЛИДНЫЕ МЕТАДАННЫЕ'}
                </span>
              </div>

              {/* Raw parsed token */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Извлеченный текст (Raw OCR):</label>
                <div className="mt-1 p-2.5 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs font-bold break-all border border-slate-800 shadow-inner">
                  «{selectedEntity.rawText}»
                </div>
              </div>

              {/* Classification category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-medium">Категория ГОСТ:</span>
                  <div className="font-bold text-xs text-slate-900 mt-0.5">{selectedEntity.categoryLabel}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 font-medium">Уверенность OCR:</span>
                  <div className="font-bold text-xs text-emerald-700 mt-0.5">
                    {(selectedEntity.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Matrix finding connection if violation */}
              {selectedEntity.isViolation && (
                <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-rose-900 font-mono text-xs bg-rose-200 px-2 py-0.5 rounded">
                      {selectedEntity.matrixParamCode}
                    </span>
                    <span className="text-rose-700 font-bold text-[11px]">{selectedEntity.delta}</span>
                  </div>
                  <div className="font-bold text-slate-900 text-xs">{selectedEntity.matrixParamName}</div>
                  <div className="text-[11px] text-slate-600">
                    Эталон в ПД: <strong className="text-emerald-700 font-mono">{selectedEntity.pdExpectedValue}</strong>
                  </div>
                </div>
              )}

              {/* AI Parser Explanation */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Обоснование классификатора:</label>
                <div className="mt-1 p-3 bg-purple-50/80 rounded-xl border border-purple-200/60 text-xs text-purple-950 leading-relaxed">
                  {selectedEntity.explanation}
                </div>
              </div>

              {/* Bounding Box Coordinates */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 font-mono flex items-center justify-between">
                <span>BBox [x, y, w, h]:</span>
                <span className="font-bold text-slate-800">
                  [{selectedEntity.bbox.x}%, {selectedEntity.bbox.y}%, {selectedEntity.bbox.width}%, {selectedEntity.bbox.height}%]
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 text-center text-slate-400 text-xs">
              Выберите элемент на чертеже
            </div>
          )}

          {/* Quick Info Box: Why title is not a defect */}
          <div className="bg-blue-50/90 rounded-2xl p-4 border border-blue-200 text-xs text-blue-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-950">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Почему шифр РД-2025-04.266-АР2 исключен из дефектов?</span>
            </div>
            <p className="text-[11.5px] leading-relaxed text-blue-900/90">
              Шифр комплекта рабочей документации идентифицируется парсером как <strong>метаданные основной надписи (штампа)</strong>. 
              Он служит для адресации файла, а реальные физические дефекты (например, <em>отметка 164.180 м по AR-01</em>) извлекаются 
              из текстовых указаний и графической части плана, исключая ложные срабатывания на названиях файлов.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Live Parsing Sandbox / Playground */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Песочница тестирования регулярных выражений и NER</span>
            </div>
            <h3 className="text-lg font-black text-slate-900">
              Интерактивный парсер произвольного текста из чертежа
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Вставьте любой фрагмент надписи, выноски или штампа чертежа для проверки того, как ИИ извлечет сущности.
            </p>
          </div>

          <button
            onClick={handleRunSandboxParser}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow cursor-pointer flex items-center gap-2 shrink-0 hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>Разобрать текст</span>
          </button>
        </div>

        {/* Input Textarea & Presets */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Примеры для быстрой вставки:</span>
            <button
              onClick={() =>
                setSandboxText('Отм. 0.000 соответствует абсолютной отметке 164.180 в Балтийской системе высот.')
              }
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-medium transition cursor-pointer"
            >
              Отметка 0.000 (AR-01)
            </button>
            <button
              onClick={() =>
                setSandboxText('РД-2025-04.266-АР2. АРХИТЕКТУРНЫЕ РЕШЕНИЯ. ФАСАД. КРОВЛЯ. СПЕЦИФИКАЦИИ.')
              }
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-medium transition cursor-pointer"
            >
              Шифр чертежа АР2
            </button>
            <button
              onClick={() =>
                setSandboxText('Блок Д-12: Дверной блок металлический ДПМ EI 60, размер 800 × 2100 мм.')
              }
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-medium transition cursor-pointer"
            >
              Дверь Д-12 (AR-41)
            </button>
            <button
              onClick={() =>
                setSandboxText('Стеновые сэндвич-панели Венталл-С3 толщиной 150 мм с минераловатным утеплителем.')
              }
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-medium transition cursor-pointer"
            >
              Сэндвич-панели 150 мм (AR-12)
            </button>
          </div>

          <textarea
            value={sandboxText}
            onChange={(e) => setSandboxText(e.target.value)}
            rows={3}
            className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden"
            placeholder="Введите текст с чертежа..."
          />
        </div>

        {/* Sandbox Results */}
        {sandboxResult && (
          <div className="p-5 bg-slate-900 rounded-2xl text-white space-y-4 animate-fade-in border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-bold text-xs text-purple-300">
                Результат разбора текста ({sandboxResult.entities.length} сущностей):
              </span>
              <span className="text-[11px] text-slate-400 font-mono">{sandboxResult.timestamp}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sandboxResult.entities.map((ent: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    ent.isViolation
                      ? 'bg-rose-950/80 border-rose-600/70 text-rose-100'
                      : 'bg-slate-800/80 border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black uppercase tracking-wider text-[10px]">
                      {ent.typeLabel}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ent.isViolation ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {ent.isViolation ? 'КОЛЛИЗИЯ' : 'МЕТАДАННЫЕ / НОРМА'}
                    </span>
                  </div>

                  <div className="font-mono text-sm font-bold text-white break-all">
                    {ent.token}
                  </div>

                  {ent.matrixParamCode && (
                    <div className="text-[11px] text-rose-300">
                      Параметр матрицы: <strong>{ent.matrixParamCode}</strong> • Дельта: <strong>{ent.delta}</strong>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {ent.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. JSON Raw Data Structure Preview */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-purple-600" />
            <h4 className="font-bold text-sm text-slate-900">Структурированный JSON листа (ГОСТ Р 21.101)</h4>
          </div>

          <button
            onClick={handleCopyJson}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedJson ? 'Скопировано!' : 'Копировать JSON'}</span>
          </button>
        </div>

        <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
          {JSON.stringify(currentSheetEntities, null, 2)}
        </pre>
      </div>
    </div>
  );
};
