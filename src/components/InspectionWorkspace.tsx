import React, { useState, useRef } from 'react';
import {
  FileCheck2,
  Lock,
  Clock,
  Split,
  Download,
  Unlock,
  Building,
  Calendar,
  Sparkles,
  CheckCircle,
  CheckCircle2,
  FileText,
  Search,
  PlusCircle,
  Plus,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Send,
  Printer,
  Layers,
  GitBranch,
  FileCode2,
  Brain,
  ShieldAlert,
  AlertTriangle,
  Building2,
  ExternalLink,
  BookOpen,
  Sliders,
  UploadCloud,
  X,
  Upload,
  RefreshCw,
  Scan,
  Eye,
  FolderOpen,
  HardDrive,
  Trash2,
} from 'lucide-react';
import {
  CheckFinding,
  ConstructionObject,
  FindingStatus,
  RejectionReasonCode,
  UserRole,
  InspectionProtocol,
  Suspicion,
  DiscoveryMethod
} from '../types';
import { InspectionFileOverlayViewer } from './InspectionFileOverlayViewer';
import { ROLE_PROFILES } from '../data/rolesData';
import { DocumentAuditModal } from './DocumentAuditModal';
import { downloadFullDocumentReport } from '../utils/reportGenerator';
import { HypothesisTZBuilderModal } from './HypothesisTZBuilderModal';
import { DrawingCollisionVisualizerModal } from './DrawingCollisionVisualizerModal';
import { MandatorySectionsAuditor } from './MandatorySectionsAuditor';
import { ExecutiveDocumentationRegistry } from './ExecutiveDocumentationRegistry';

interface InspectionWorkspaceProps {
  currentObject: ConstructionObject;
  protocol: InspectionProtocol;
  currentRole: UserRole;
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
  onFinalizeProtocol: () => void;
  onCancelFinalization: (reason: string) => void;
  onOpenUpload: () => void;
  onOpenExport: () => void;
  onAddFindingToProtocol?: (finding: CheckFinding) => void;
  suspicions?: Suspicion[];
  onPromoteToCandidate?: (suspicionId: number) => void;
  onAddNewHypothesis?: (hypothesis: Omit<Suspicion, 'suspicion_id'>) => void;
  onDismissSuspicion?: (suspicionId: number) => void;
  onSendReportAndComplete?: (objectId?: string) => void;
  onNavigateToDashboard?: () => void;
  uploadedPdfBlobUrl?: string;
  uploadedPdfFileName?: string;
  uploadedPdfSizeMb?: number;
  uploadedFilesList?: Array<{
    id: string;
    name: string;
    blobUrl: string;
    sizeMb: number;
    stage?: string;
  }>;
  onSelectUploadedPdf?: (fileId: string) => void;
  onDeleteUploadedPdf?: (fileId: string) => void;
  onUploadNewPdfFile?: (file: File, explicitStage?: 'PD' | 'RD' | 'ID') => void;
  onQuickCompletePackage?: () => void;
  onQuickAddStage?: (stage: 'PD' | 'RD' | 'ID') => void;
  onNavigateToTab?: (tab: string) => void;
}

export const InspectionWorkspace: React.FC<InspectionWorkspaceProps> = ({
  currentObject,
  protocol,
  currentRole,
  onUpdateFindingStatus,
  onSplitFinding,
  onFinalizeProtocol,
  onCancelFinalization,
  onOpenUpload,
  onOpenExport,
  onAddFindingToProtocol,
  suspicions = [],
  onPromoteToCandidate,
  onAddNewHypothesis,
  onDismissSuspicion,
  onSendReportAndComplete,
  onNavigateToDashboard,
  uploadedPdfBlobUrl,
  uploadedPdfFileName,
  uploadedPdfSizeMb,
  uploadedFilesList = [],
  onSelectUploadedPdf,
  onDeleteUploadedPdf,
  onUploadNewPdfFile,
  onQuickCompletePackage,
  onQuickAddStage,
  onNavigateToTab,
}) => {
  // Step-by-step workflow state: 1 to 5
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Active Suspicion selected for Computer Vision Drawing BBox / Overlay inspection
  const [selectedVisualizerSuspicion, setSelectedVisualizerSuspicion] = useState<Suspicion | null>(null);

  const [selectedFindingId, setSelectedFindingId] = useState<string>(
    protocol.findings[0]?.id || ''
  );

  const activeProfile = ROLE_PROFILES[currentRole] || ROLE_PROFILES.INSPECTOR;

  // Rejection modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<RejectionReasonCode>('WRONG_REVISION');
  const [rejectionComment, setRejectionComment] = useState<string>('');

  // Clarification modal state
  const [isClarifyModalOpen, setIsClarifyModalOpen] = useState<boolean>(false);
  const [clarifyComment, setClarifyComment] = useState<string>('');

  // Supervisor unlock state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Document validity audit & report modal state
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [reportDownloadToast, setReportDownloadToast] = useState<string | null>(null);

  // Quick versatile file upload modal & input ref
  const [isQuickUploadModalOpen, setIsQuickUploadModalOpen] = useState<boolean>(false);
  const [quickUploadStage, setQuickUploadStage] = useState<'PD' | 'RD' | 'ID' | 'AUTO'>('AUTO');
  const directFileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Hypothesis search & filter state
  const [showExecutiveDocsRegistry, setShowExecutiveDocsRegistry] = useState<boolean>(true);
  const [hypoSearchQuery, setHypoSearchQuery] = useState<string>('');
  const [hypoFilterMethod, setHypoFilterMethod] = useState<string>('ALL');
  const [hypoFilterDiscipline, setHypoFilterDiscipline] = useState<string>('ALL');
  const [isCreateHypoModalOpen, setIsCreateHypoModalOpen] = useState<boolean>(false);
  const [showAllHypotheses, setShowAllHypotheses] = useState<boolean>(false);

  // Step 3: Predpisanie state
  const [predpisanieDays, setPredpisanieDays] = useState<number>(30);
  const [predpisanieNumber, setPredpisanieNumber] = useState<string>(
    `ПРЕД-2026/${currentObject.id.replace('obj-', '').toUpperCase()}-МГСН`
  );
  const [predpisanieSavedNotice, setPredpisanieSavedNotice] = useState<string | null>(null);

  // Step 5: Submission feedback
  const [sentReportSuccess, setSentReportSuccess] = useState<boolean>(
    !!currentObject.is_verified_and_sent
  );

  const activeFinding =
    protocol.findings.find((f) => f.id === selectedFindingId) || protocol.findings[0];

  const candidateCount = protocol.findings.filter(
    (f) => f.finding_status === 'CANDIDATE'
  ).length;
  const confirmedCount = protocol.findings.filter(
    (f) => f.finding_status === 'CONFIRMED_VIOLATION'
  ).length;
  const rejectedCount = protocol.findings.filter(
    (f) => f.finding_status === 'NEGATIVE_VERIFIED'
  ).length;

  // Strict construction documentation stage completeness checking (PD, RD, ID)
  const stageStatuses = currentObject.scenarios?.stage_statuses || {
    pd: 'PD_MISSING',
    rd: 'RD_MISSING',
    id: 'ID_MISSING',
  };

  const hasPd = stageStatuses.pd === 'PD_UPLOADED' || (uploadedFilesList || []).some((f) => f.stage === 'PD');
  const hasRd = stageStatuses.rd === 'RD_UPLOADED' || (uploadedFilesList || []).some((f) => f.stage === 'RD');
  const hasId = stageStatuses.id === 'ID_UPLOADED' || (uploadedFilesList || []).some((f) => f.stage === 'ID');
  const isFullPackage = hasPd && hasRd && hasId;
  const hasAnyDocuments = hasPd || hasRd || hasId || (uploadedFilesList && uploadedFilesList.length > 0) || !!uploadedPdfBlobUrl;
  const uploadedFilesCount = (uploadedFilesList && uploadedFilesList.length > 0) ? uploadedFilesList.length : (uploadedPdfBlobUrl ? 1 : 0);

  const isCleanCompliant = isFullPackage && (protocol.findings.length === 0 || (confirmedCount === 0 && candidateCount === 0));

  const isFinalized = protocol.status === 'FINALIZED';
  // Finalization is permitted ONLY when all candidate remarks are resolved AND all required documentation stages (PD, RD, ID) are present
  const canFinalize = candidateCount === 0 && isFullPackage;

  const handleConfirmReject = () => {
    if (!activeFinding) return;
    onUpdateFindingStatus(activeFinding.id, 'NEGATIVE_VERIFIED', {
      rejectionReason,
      comment: rejectionComment || 'Отклонено инспектором с обоснованием.',
    });
    setIsRejectModalOpen(false);
  };

  const handleConfirmClarify = () => {
    if (!activeFinding) return;
    onUpdateFindingStatus(activeFinding.id, 'CLARIFICATION_REQUIRED', {
      clarificationDetails:
        clarifyComment || 'Требуется предоставление актуальной редакции чертежей.',
    });
    setIsClarifyModalOpen(false);
  };

  const handleExecuteSendReport = () => {
    if (onSendReportAndComplete) {
      onSendReportAndComplete(currentObject.id);
    }
    setSentReportSuccess(true);
  };

  const filteredSuspicions = suspicions.filter((s) => {
    if (hypoFilterMethod !== 'ALL' && s.discovery_method !== hypoFilterMethod) return false;
    if (hypoFilterDiscipline !== 'ALL' && s.discipline !== hypoFilterDiscipline) return false;
    if (hypoSearchQuery) {
      const q = hypoSearchQuery.toLowerCase();
      const inDesc = s.description.toLowerCase().includes(q);
      const inNorm = s.normative_base.toLowerCase().includes(q);
      const inTz = s.tz_requirement_code?.toLowerCase().includes(q);
      const inDisc = s.discipline?.toLowerCase().includes(q);
      const inPd = s.pd_reference?.toLowerCase().includes(q);
      const inRd = s.rd_reference?.toLowerCase().includes(q);
      if (!inDesc && !inNorm && !inTz && !inDisc && !inPd && !inRd) {
        return false;
      }
    }
    return true;
  });

  const shouldLimitHypotheses =
    !showAllHypotheses &&
    !hypoSearchQuery &&
    hypoFilterDiscipline === 'ALL' &&
    hypoFilterMethod === 'ALL';
  const visibleSuspicions = shouldLimitHypotheses
    ? filteredSuspicions.slice(0, 8)
    : filteredSuspicions;

  const methodDetails: Record<DiscoveryMethod, { label: string; icon: any; color: string; desc: string }> = {
    LOGICAL_ANALYSIS: {
      label: 'Логический анализ',
      icon: GitBranch,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      desc: 'Логические цепочки: «Если А, то требуется Б»',
    },
    SEMANTIC_DISSONANCE: {
      label: 'Семантический диссонанс',
      icon: FileCode2,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      desc: 'Смысловые и терминологические расхождения ПД и РД',
    },
    NORMATIVE_ANALYSIS: {
      label: 'Нормативный анализ',
      icon: ShieldAlert,
      color: 'bg-amber-100 text-amber-800 border-amber-200',
      desc: 'Прямая сверка с пунктами СП, ГОСТ и СанПиН',
    },
    ML_PATTERN_ANALYSIS: {
      label: 'ML-паттерн-анализ',
      icon: Brain,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      desc: 'Аномалии на основе обученной нейросетевой модели',
    },
  };

  // Steps metadata
  const steps = [
    {
      step: 1 as const,
      num: '1',
      title: 'Замечания и PDF',
      badge: !isFullPackage
        ? 'Комплект не полон'
        : protocol.findings.length > 0
        ? `${protocol.findings.length} замечаний`
        : '0 замечаний',
      sub: !isFullPackage
        ? '⚠️ Ожидаются все виды документов'
        : protocol.findings.length === 0
        ? '✓ Нарушений не выявлено'
        : candidateCount === 0
        ? '✓ Все проверены'
        : `${candidateCount} к сверке`,
      done: isFullPackage && (protocol.findings.length === 0 || candidateCount === 0),
    },
    {
      step: 2 as const,
      num: '2',
      title: 'Свободный поиск ИИ',
      badge: !hasAnyDocuments ? 'Ожидание чертежей' : `${suspicions.length > 0 ? suspicions.length : 8} коллизий`,
      sub: !hasAnyDocuments ? '⚠️ Документы не загружены' : `${suspicions.length > 0 ? suspicions.length : 8} по загруженным ПД/РД`,
      done: hasAnyDocuments && suspicions.some((s) => s.inspector_status === 'PROMOTED_TO_CANDIDATE'),
    },
    {
      step: 3 as const,
      num: '3',
      title: isCleanCompliant ? 'Акт соответствия' : 'Предписание',
      badge: !isFullPackage ? 'Ожидание ПД/РД/ИД' : isCleanCompliant ? 'Без нарушений' : 'ст. 52, 54 ГрК',
      sub: !isFullPackage ? '⚠️ Требуется полный комплект' : isCleanCompliant ? '✓ Соответствует нормам' : `Срок ${predpisanieDays} дней`,
      done: isFullPackage && (protocol.findings.length === 0 || confirmedCount > 0),
    },
    {
      step: 4 as const,
      num: '4',
      title: 'Подписание с УКЭП',
      badge: 'ГОСТ Р 34.10',
      sub: isFinalized ? '✓ Подписано' : 'Ожидает подписи',
      done: isFinalized,
    },
    {
      step: 5 as const,
      num: '5',
      title: 'Отправка отчета',
      badge: 'ИАИС «РиН»',
      sub: currentObject.is_verified_and_sent ? '✓ Передано в надзор' : 'Готово к передаче',
      done: !!currentObject.is_verified_and_sent,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Protocol Status & Navigation Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900">
                Протокол сверки № {protocol.id} (Версия {protocol.version})
              </h2>
              {isFinalized ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-purple-700" />
                  ФИНАЛИЗИРОВАН
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-700" />
                  ВЕРИФИКАЦИЯ
                </span>
              )}

              {currentObject.is_verified_and_sent && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ОТЧЕТ ОТПРАВЛЕН В ИАИС «РиН»
                </span>
              )}
            </div>
            <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
              <span>Объект: <strong className="text-slate-800">{currentObject.name}</strong></span>
              <span>•</span>
              <span>Модель: <span className="font-mono text-[11px] text-slate-600">{protocol.model_version}</span></span>
              <span>•</span>
              <span>Роль: <strong className="text-purple-700">{activeProfile.title}</strong></span>
            </div>
          </div>
        </div>

        {/* Global Toolbar: Grouped by context (Navigation, Tools, Actions) */}
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>К объектам</span>
            </button>
          )}

          <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

          <button
            onClick={() => setIsQuickUploadModalOpen(true)}
            disabled={isFinalized}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center space-x-1.5 ${
              isFinalized
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 cursor-pointer shadow-xs'
            }`}
            title="Дозагрузить файл (ПД, РД, ИД) для проверки"
          >
            <UploadCloud className="w-3.5 h-3.5 text-purple-600" />
            <span>+ Дозагрузка</span>
          </button>

          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
            title="Проверить достоверность списка замечаний к чертежам"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Достоверность</span>
          </button>

          <button
            onClick={() => {
              downloadFullDocumentReport({ object: currentObject, protocol, suspicions });
              setReportDownloadToast('Полный отчет с выделением текста скачан на ваш компьютер (.html)!');
              setTimeout(() => setReportDownloadToast(null), 4000);
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
            title="Скачать на компьютер отчет с разбором ошибок (.html)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Отчет (.html)</span>
          </button>

          <button
            onClick={onOpenExport}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
            title="Экспорт протокола в PDF, Excel или выгрузка в ИАИС «РиН»"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Экспорт</span>
          </button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

          {isFinalized ? (
            (currentRole === 'SUPERVISOR' || currentRole === 'ADMIN') && (
              <button
                onClick={() => setIsCancelModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Отменить финализацию</span>
              </button>
            )
          ) : (
            <button
              onClick={onFinalizeProtocol}
              disabled={!canFinalize}
              title={
                !isFullPackage
                  ? 'Для финализации необходимо дождаться все виды строительной документации (ПД, РД, ИД)'
                  : !canFinalize
                  ? `Осталось не сверено кандидатов: ${candidateCount}`
                  : 'Финализировать протокол'
              }
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 ${
                canFinalize
                  ? 'bg-purple-700 hover:bg-purple-800 text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>Финализировать</span>
            </button>
          )}
        </div>
      </div>

      {/* 5-STEP PROTOCOL VERIFICATION WORKFLOW PROGRESS BAR */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
            <h3 className="text-xs font-black tracking-wider uppercase text-slate-800">
              Пошаговый регламент действий в разделе «Протокол верификации»
            </h3>
          </div>
          <div className="text-xs text-purple-700 font-bold flex items-center gap-1.5">
            <span>Текущий шаг {activeWorkflowStep} из 5</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 font-medium">
              {activeWorkflowStep === 1 && 'Шаг 1: Замечания и полноэкранный просмотр PDF (включая альбомный режим)'}
              {activeWorkflowStep === 2 && 'Свободный поиск гипотез и скрытых коллизий ИИ'}
              {activeWorkflowStep === 3 && 'Формирование Предписания (ст. 52, 54 ГрК РФ)'}
              {activeWorkflowStep === 4 && 'Подписание протокола с УКЭП'}
              {activeWorkflowStep === 5 && 'Отправка отчета в ИАИС «РиН» и фиксация на Дашборде'}
            </span>
          </div>
        </div>

        {/* 5 Step Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {steps.map((s) => {
            const isActive = activeWorkflowStep === s.step;
            return (
              <button
                key={s.step}
                onClick={() => setActiveWorkflowStep(s.step)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-purple-50 border-purple-600 ring-2 ring-purple-600/20 shadow-sm'
                    : s.done
                    ? 'bg-emerald-50/60 border-emerald-300 hover:bg-emerald-100/50'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] font-black flex items-center justify-center ${
                      isActive
                        ? 'bg-purple-700 text-white'
                        : s.done
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {s.done && !isActive ? '✓' : s.num}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-purple-200/60 text-purple-900'
                        : s.done
                        ? 'bg-emerald-200/60 text-emerald-900'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {s.badge}
                  </span>
                </div>
                <div className={`text-xs font-bold ${isActive ? 'text-purple-950' : 'text-slate-800'}`}>
                  {s.title}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{s.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: REVIEW FINDINGS & RED BLUEPRINT */}
      {activeWorkflowStep === 1 && (
        <div className="space-y-4">
          {/* CONSTRUCTION DOCUMENTATION COMPATIBILITY CONTROL (PD, RD, ID) */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-purple-700" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Контроль комплектности видов строительной документации (ст. 54 ГрК РФ)
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowExecutiveDocsRegistry(!showExecutiveDocsRegistry)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border ${
                    showExecutiveDocsRegistry
                      ? 'bg-purple-700 text-white border-purple-800 shadow-sm'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                  title="Открыть Журнал исполнительной документации (структура папок: Акты, Геодезия, Сертификаты, Журналы)"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>📁 Журнал ИД (Папки надзора)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/15 font-black ml-1">
                    {(uploadedFilesList || []).filter((f) => f.stage === 'ID').length || 11}
                  </span>
                </button>

                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200" title="Доступное хранилище">
                  <HardDrive className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>
                    Осталось памяти: {Math.max(0, +(200 - (uploadedFilesList || []).reduce((acc, f) => acc + (f.sizeMb || 0), 0)).toFixed(1))} МБ / 200 МБ
                  </span>
                </div>

                <button
                  onClick={() => setIsQuickUploadModalOpen(true)}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>+ Дозагрузить любой файл...</span>
                </button>
                {onQuickCompletePackage && !isFullPackage && (
                  <button
                    onClick={onQuickCompletePackage}
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                    title="Смоделировать загрузку полного комплекта документации (ПД + РД + ИД)"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>⚡ Загрузить все виды (ПД+РД+ИД) в 1 клик</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3 Stage Cards: PD, RD, ID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Stage PD */}
              <div className={`p-3 rounded-xl border transition-all ${hasPd ? 'bg-emerald-50/70 border-emerald-300' : 'bg-amber-50/70 border-amber-300'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-800">
                    Стадия ПД (Проект)
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${hasPd ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                    {hasPd ? '✓ Загружена' : '⚠️ Ожидается'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Утвержденный проект • Эталон Мосгосэкспертизы
                </p>
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    Файлов: {(uploadedFilesList || []).filter((f) => f.stage === 'PD').length || (hasPd ? 1 : 0)}
                  </span>
                  <button
                    onClick={() => {
                      setQuickUploadStage('PD');
                      setIsQuickUploadModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
                  >
                    + {hasPd ? 'Добавить лист' : 'Загрузить ПД'}
                  </button>
                </div>
              </div>

              {/* Stage RD */}
              <div className={`p-3 rounded-xl border transition-all ${hasRd ? 'bg-emerald-50/70 border-emerald-300' : 'bg-amber-50/70 border-amber-300'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-800">
                    Стадия РД (Рабочая)
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${hasRd ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                    {hasRd ? '✓ Загружена' : '⚠️ Ожидается'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Рабочие чертежи • Штамп «В производство работ»
                </p>
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    Файлов: {(uploadedFilesList || []).filter((f) => f.stage === 'RD').length || (hasRd ? 1 : 0)}
                  </span>
                  <button
                    onClick={() => {
                      setQuickUploadStage('RD');
                      setIsQuickUploadModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
                  >
                    + {hasRd ? 'Добавить лист' : 'Загрузить РД'}
                  </button>
                </div>
              </div>

              {/* Stage ID */}
              <div className={`p-3 rounded-xl border transition-all ${hasId ? 'bg-emerald-50/70 border-emerald-300' : 'bg-amber-50/70 border-amber-300'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-800">
                    Стадия ИД (Исполнительная)
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${hasId ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                    {hasId ? '✓ Загружена' : '⚠️ Ожидается'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Акты АОСР • Паспорта бетона • Исполнительные схемы
                </p>
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowExecutiveDocsRegistry(!showExecutiveDocsRegistry)}
                    className="text-[10px] text-purple-700 hover:text-purple-900 font-bold underline flex items-center space-x-1 cursor-pointer"
                  >
                    <span>📁 Журнал папок ИД</span>
                    <span>({(uploadedFilesList || []).filter((f) => f.stage === 'ID').length || 11})</span>
                  </button>
                  <button
                    onClick={() => {
                      setQuickUploadStage('ID');
                      setIsQuickUploadModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
                  >
                    + {hasId ? 'Добавить акт' : 'Загрузить ИД'}
                  </button>
                </div>
              </div>
            </div>

            {/* Detailed sections and volumes audit (ПД: Разделы 1-5, МГЭ; РД: комплекты, ВПР; ИД: АОСР, схемы, журналы) */}
            <MandatorySectionsAuditor
              files={uploadedFilesList || []}
              onUploadForSection={(stage) => {
                setQuickUploadStage(stage);
                setIsQuickUploadModalOpen(true);
              }}
            />

            {/* Журнал исполнительной документации (ИД) - группировка по папкам надзора: Акты, Геодезия, Сертификаты, Журналы */}
            {showExecutiveDocsRegistry && (
              <div className="pt-1">
                <ExecutiveDocumentationRegistry
                  files={uploadedFilesList || []}
                  onSelectDocument={(doc) => {
                    if (onSelectUploadedPdf) {
                      const matched = (uploadedFilesList || []).find(
                        (f) => f.name === doc.name || (doc.blobUrl && f.blobUrl === doc.blobUrl)
                      );
                      if (matched) {
                        onSelectUploadedPdf(matched.id);
                      }
                    }
                  }}
                  onUploadExecutiveDoc={(categoryHint) => {
                    setQuickUploadStage('ID');
                    setIsQuickUploadModalOpen(true);
                  }}
                  onDeleteDocument={(docId, docName) => {
                    const matched = (uploadedFilesList || []).find(
                      (f) => f.id === docId || f.name === docName
                    );
                    if (matched && onDeleteUploadedPdf) {
                      onDeleteUploadedPdf(matched.id);
                    }
                  }}
                />
              </div>
            )}

            {/* Status explanation alert */}
            {!isFullPackage ? (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 flex items-start space-x-2.5 text-xs text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Внимание: комплект строительной документации этапа не полный.</span>{' '}
                  По правилам государственного строительного надзора заключение о соответствии («все хорошо») допускается выносить только после загрузки и сопоставления всех видов документации: <strong>ПД, РД и ИД</strong>.
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-950">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">
                    Все обязательные виды документации (ПД + РД + ИД) сопоставлены в системе.
                  </span>
                  {protocol.findings.length === 0 && (
                    <span className="text-emerald-700">• Нарушений не выявлено («Все хорошо»).</span>
                  )}
                </div>
                {protocol.findings.length === 0 && (
                  <button
                    onClick={() => setActiveWorkflowStep(3)}
                    className="text-xs font-bold text-emerald-900 underline hover:text-emerald-950 cursor-pointer"
                  >
                    Сформировать Акт соответствия без замечаний (Шаг 3) →
                  </button>
                )}
              </div>
            )}
          </div>

          <InspectionFileOverlayViewer
            findings={protocol.findings}
            selectedFindingId={selectedFindingId}
            onSelectFinding={setSelectedFindingId}
            currentObject={currentObject}
            currentRole={currentRole}
            isFinalized={isFinalized}
            onUpdateFindingStatus={onUpdateFindingStatus}
            onSplitFinding={onSplitFinding}
            onOpenRejectModal={() => setIsRejectModalOpen(true)}
            onOpenClarifyModal={() => setIsClarifyModalOpen(true)}
            onFinalizeProtocol={onFinalizeProtocol}
            onOpenExport={onOpenExport}
            suspicions={suspicions}
            onPromoteToCandidate={onPromoteToCandidate}
            onAddNewHypothesis={onAddNewHypothesis}
            onOpenVisualizer={(susp) => setSelectedVisualizerSuspicion(susp)}
            uploadedPdfBlobUrl={uploadedPdfBlobUrl}
            uploadedPdfFileName={uploadedPdfFileName}
            uploadedPdfSizeMb={uploadedPdfSizeMb}
            uploadedFilesList={uploadedFilesList}
            onSelectUploadedPdf={onSelectUploadedPdf}
            onUploadNewPdfFile={onUploadNewPdfFile}
          />

          {/* Stepper Navigation Footer for Step 1 */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-600 flex items-center gap-2">
              <span className="font-bold text-slate-900">Шаг 1 из 5:</span>
              <span>
                {candidateCount === 0
                  ? 'Все кандидаты проверены! Переходите к поиску скрытых коллизий ИИ или формированию предписания.'
                  : `Осталось проверить кандидатов: ${candidateCount} из ${protocol.findings.length}.`}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveWorkflowStep(2)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Перейти к Шагу 2: Поиск скрытых коллизий ИИ →</span>
              </button>
              <button
                onClick={() => setActiveWorkflowStep(3)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>К Шагу 3: Формирование Предписания →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: FREE SEARCH OF HYPOTHESES & HIDDEN COLLISIONS */}
      {activeWorkflowStep === 2 && !hasAnyDocuments && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-8 border-2 border-dashed border-slate-300 shadow-sm text-center max-w-3xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto border border-purple-200">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-bold mb-2">
                <span>Шаг 2 • Поиск скрытых коллизий ИИ по чертежам</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Чертежи и проектная документация еще не загружены
              </h2>
              <p className="text-xs text-slate-600 mt-2 max-w-xl mx-auto leading-relaxed">
                Свободный нейросетевой поиск коллизий и скрытых несоответствий (Раздел 9.5 ТЗ) выполняется исключительно 
                <strong> на основе сопоставления загруженных файлов проектной (ПД) и рабочей (РД) документации</strong>. 
                Без исходных чертежей анализ не может быть запущен, так как ИИ не производит фиктивных расчетов.
              </p>
            </div>

            {/* Stage requirements reminder */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>1. Стадия ПД (Проектная)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Утвержденный проект с положительным заключением экспертизы (эталон)
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>2. Стадия РД (Рабочая)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Рабочие чертежи подрядчика со штампом «В производство работ»
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  if (onOpenUpload) onOpenUpload();
                  else setIsQuickUploadModalOpen(true);
                }}
                className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Загрузить чертежи (PDF)</span>
              </button>

              {onQuickCompletePackage && (
                <button
                  onClick={onQuickCompletePackage}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
                  title="Быстро загрузить тестовый комплект чертежей для демонстрации"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                  <span>Загрузить демо-комплект (ПД+РД+ИД)</span>
                </button>
              )}

              <button
                onClick={() => setActiveWorkflowStep(1)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ← Вернуться к Шагу 1
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: FREE SEARCH OF HYPOTHESES & HIDDEN COLLISIONS (WHEN DOCUMENTS ARE PRESENT) */}
      {activeWorkflowStep === 2 && hasAnyDocuments && (
        <div className="space-y-3">
          {/* Compact Control Card */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3">
            {/* Top row: Title, badges and 1-click batch buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
                    Шаг 2 из 5 • Свободный поиск ИИ
                  </span>
                  <span className="text-[11px] text-slate-400">•</span>
                  <span className="text-[11px] text-slate-600 font-bold">
                    Раздел 9.5 ТЗ ({suspicions.length} коллизий)
                  </span>
                </div>
                <h2 className="text-base font-black text-slate-900 leading-tight">
                  Свободный поиск скрытых коллизий ИИ
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Нейросетевая сверка расхождений между загруженными чертежами ПД и РД ({uploadedFilesCount > 0 ? `${uploadedFilesCount} файла(ов)` : 'документы загружены'}) вне жестких рамок матрицы параметров
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsCreateHypoModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                  <span>+ Своя гипотеза</span>
                </button>

                <button
                  onClick={() => {
                    const unpromoted = filteredSuspicions.filter(
                      (s) => s.inspector_status !== 'PROMOTED_TO_CANDIDATE'
                    );
                    unpromoted.slice(0, 3).forEach((s) => {
                      if (onPromoteToCandidate) onPromoteToCandidate(s.suspicion_id);
                    });
                  }}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                  title="Быстро добавить топ-3 коллизии в официальный протокол"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>⚡ Добавить топ-3 в протокол</span>
                </button>
              </div>
            </div>

            {/* Quick Demo Chips Bar */}
            <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Быстрый выбор:</span>
              {[
                { label: '🔥 Огнестойкость (EI 150 vs EI 90)', q: 'огнестойкость' },
                { label: '🏢 Пом. 104 (ИТП vs Серверная)', q: 'серверная' },
                { label: '🏗️ Арматура (+28%)', q: 'арматура' },
                { label: '♿ Пандус МГН (1:8 vs 1:20)', q: 'пандус' },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => setHypoSearchQuery(chip.q)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    hypoSearchQuery === chip.q
                      ? 'bg-purple-100 text-purple-900 border border-purple-300'
                      : 'bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-800'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
              {hypoSearchQuery && (
                <button
                  onClick={() => setHypoSearchQuery('')}
                  className="text-[11px] text-purple-700 hover:text-purple-900 font-bold ml-1 cursor-pointer"
                >
                  Сбросить
                </button>
              )}
            </div>

            {/* Compact Search and Selectors Bar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs">
              <div className="md:col-span-5 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Поиск по ключевым словам (огнестойкость, арматура, кабель)..."
                  value={hypoSearchQuery}
                  onChange={(e) => setHypoSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={hypoFilterMethod}
                  onChange={(e) => setHypoFilterMethod(e.target.value)}
                  className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                >
                  <option value="ALL">Все методы анализа ({suspicions.length})</option>
                  <option value="LOGICAL_ANALYSIS">Логический анализ (8)</option>
                  <option value="SEMANTIC_DISSONANCE">Семантический диссонанс (4)</option>
                  <option value="NORMATIVE_SEARCH">Нормативный анализ (12)</option>
                  <option value="HISTORICAL_ML_PATTERN">ML-паттерн-анализ (4)</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <select
                  value={hypoFilterDiscipline}
                  onChange={(e) => setHypoFilterDiscipline(e.target.value)}
                  className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                >
                  <option value="ALL">Все разделы проекта ({suspicions.length})</option>
                  <option value="АР">АР — Архитектура ({suspicions.filter((s) => s.discipline === 'АР').length})</option>
                  <option value="КР">КР — Конструкции ({suspicions.filter((s) => s.discipline === 'КР' || s.discipline === 'КМ').length})</option>
                  <option value="ОВ">ОВ — Отопление и вентиляция ({suspicions.filter((s) => s.discipline === 'ОВ').length})</option>
                  <option value="ВК">ВК — Водоснабжение ({suspicions.filter((s) => s.discipline === 'ВК').length})</option>
                  <option value="ЭОМ">ЭОМ — Электроснабжение ({suspicions.filter((s) => s.discipline === 'ЭОМ').length})</option>
                  <option value="ПЗУ">ПЗУ — Генплан ({suspicions.filter((s) => s.discipline === 'ПЗУ').length})</option>
                  <option value="СПЗ">СПЗ — Пожаротушение ({suspicions.filter((s) => s.discipline === 'СПЗ').length})</option>
                  <option value="ТХ">ТХ — Технология ({suspicions.filter((s) => s.discipline === 'ТХ').length})</option>
                </select>
              </div>
            </div>
          </div>

          {/* List of Suspicions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="text-xs font-bold text-slate-800">
                Найдено коллизий: <span className="text-purple-700 font-black">{filteredSuspicions.length}</span>
                {shouldLimitHypotheses && (
                  <span className="text-slate-400 font-normal ml-1">
                    (показано первых 8)
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500">
                Нажмите «+ В предписание», чтобы привязать замечание к Шагу 3
              </span>
            </div>

            {visibleSuspicions.map((susp) => {
              const isPromoted = susp.inspector_status === 'PROMOTED_TO_CANDIDATE';
              const isDismissed = susp.inspector_status === 'DISMISSED';

              return (
                <div
                  key={susp.suspicion_id}
                  className={`bg-white rounded-xl p-3.5 border transition-all shadow-2xs space-y-2 ${
                    isPromoted
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : isDismissed
                      ? 'border-slate-200 bg-slate-50 opacity-60'
                      : 'border-slate-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {susp.discipline && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-black bg-purple-700 text-white shadow-2xs">
                          {susp.discipline}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-900 border border-purple-200">
                        ИИ: {Math.round(susp.confidence * 100)}%
                      </span>
                      <span className="text-xs text-slate-700 font-semibold truncate max-w-sm">
                        {susp.normative_base}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setSelectedVisualizerSuspicion(susp)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                        title="Открыть визуализацию чертежа с BBox и калькой наложения"
                      >
                        <Scan className="w-3.5 h-3.5 text-purple-700" />
                        <span>🔍 Чертеж (BBox)</span>
                      </button>

                      {onNavigateToTab && (
                        <button
                          onClick={() => onNavigateToTab('parsing')}
                          className="px-2 py-1 bg-slate-50 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer"
                          title="Открыть полный графический анализатор чертежей"
                        >
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                          <span className="hidden sm:inline">Парсер</span>
                        </button>
                      )}

                      {isPromoted ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>В предписании</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => onPromoteToCandidate && onPromoteToCandidate(susp.suspicion_id)}
                          className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer shadow-2xs"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>+ В предписание</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-xs font-bold text-slate-900 leading-snug">
                    {susp.description}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="font-bold text-blue-700 block text-[10px] uppercase tracking-wider">По проекту (ПД):</span>
                      <span className="text-slate-800 font-medium">{susp.pd_reference}</span>
                    </div>
                    <div>
                      <span className="font-bold text-rose-600 block text-[10px] uppercase tracking-wider">По факту (РД):</span>
                      <span className="text-slate-800 font-medium">{susp.rd_reference}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Expansion control if there are more than 8 hypotheses */}
            {filteredSuspicions.length > 8 && (
              <div className="pt-2 text-center">
                <button
                  onClick={() => setShowAllHypotheses(!showAllHypotheses)}
                  className="px-4 py-2 bg-slate-100 hover:bg-purple-50 text-purple-900 text-xs font-bold rounded-xl border border-slate-200 hover:border-purple-300 transition-all cursor-pointer"
                >
                  {showAllHypotheses
                    ? '▲ Свернуть до 8 основных коллизий'
                    : `▼ Показать все ${filteredSuspicions.length} коллизий (раскрыть еще ${filteredSuspicions.length - 8})`}
                </button>
              </div>
            )}
          </div>

          {/* Stepper Navigation Footer for Step 2 */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setActiveWorkflowStep(1)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Назад к Шагу 1: Сверка замечаний</span>
            </button>

            <button
              onClick={() => setActiveWorkflowStep(3)}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <span>Перейти к Шагу 3: Формирование Предписания →</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: OFFICIAL PREDPISANIE OR CLEAN COMPLIANCE ACT */}
      {activeWorkflowStep === 3 && (
        <div className="space-y-4">
          {/* Case 1: Incomplete package - Block with informative gate */}
          {!isFullPackage && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-bold mb-1">
                    <span>Регламент ст. 54 ГрК РФ • Ожидание полного комплекта документации</span>
                  </div>
                  <h2 className="text-lg font-black text-amber-950">
                    Не все виды строительной документации загружены для оформления заключения
                  </h2>
                  <p className="text-xs text-amber-900 mt-1 leading-relaxed max-w-3xl">
                    По регламенту государственного строительного надзора (ст. 54 ГрК РФ, РД-11-02-2006) 
                    вынесение официального заключения об отсутствии нарушений («все хорошо») допускается 
                    <strong> только после сопоставления всех видов строительной документации этапа</strong>: 
                    утвержденного проекта (ПД), рабочих чертежей со штампом заказчика (РД) и исполнительной документации (ИД с актами АОСР и геодезией).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className={`p-3 rounded-xl border ${hasPd ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950' : 'bg-white border-amber-300 text-amber-950'}`}>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>1. Стадия ПД (Проект)</span>
                    <span className={hasPd ? 'text-emerald-700' : 'text-amber-700'}>{hasPd ? '✓ Загружена' : '❌ Ожидается'}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">Шифр проекта, эталон экспертизы</p>
                </div>

                <div className={`p-3 rounded-xl border ${hasRd ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950' : 'bg-white border-amber-300 text-amber-950'}`}>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>2. Стадия РД (Рабочая)</span>
                    <span className={hasRd ? 'text-emerald-700' : 'text-amber-700'}>{hasRd ? '✓ Загружена' : '❌ Ожидается'}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">Чертежи «В производство работ»</p>
                </div>

                <div className={`p-3 rounded-xl border ${hasId ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950' : 'bg-white border-amber-300 text-amber-950'}`}>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>3. Стадия ИД (Исполнительная)</span>
                    <span className={hasId ? 'text-emerald-700' : 'text-amber-700'}>{hasId ? '✓ Загружена' : '❌ Ожидается'}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">Акты АОСР, паспорта качества</p>
                </div>
              </div>

              <div className="pt-3 border-t border-amber-200 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-amber-900 font-medium">
                  Загрузите недостающие виды документации для продолжения:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsQuickUploadModalOpen(true)}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>+ Дозагрузить любой файл...</span>
                  </button>

                  {onQuickCompletePackage && (
                    <button
                      onClick={onQuickCompletePackage}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>⚡ Загрузить все виды (ПД + РД + ИД) в 1 клик</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Case 2: Full package & Clean Compliance (0 violations) */}
          {isFullPackage && isCleanCompliant && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Шаг 3 регламента • Официальный Акт проверки соответствия (Без замечаний)</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900">
                    Акт проверки соответствия объекта капитального строительства
                  </h2>
                  <p className="text-xs text-slate-600">
                    Составлен на основании ст. 54 Градостроительного кодекса РФ. Все виды документации проверены, нарушений не выявлено.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      downloadFullDocumentReport({ object: currentObject, protocol, suspicions });
                      setPredpisanieSavedNotice('Официальный Акт соответствия без замечаний скачан на ваш компьютер (.html)!');
                      setTimeout(() => setPredpisanieSavedNotice(null), 3500);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    <span>📥 Скачать официальный Акт (.html)</span>
                  </button>
                  <button
                    onClick={() => {
                      setPredpisanieSavedNotice('Акт соответствия успешно зафиксирован в архиве проекта!');
                      setTimeout(() => setPredpisanieSavedNotice(null), 3500);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Печать / Сохранить</span>
                  </button>
                </div>
              </div>

              {predpisanieSavedNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{predpisanieSavedNotice}</span>
                </div>
              )}

              {/* Clean Act Document View Box */}
              <div className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-200 space-y-4 font-serif text-slate-800">
                <div className="text-center space-y-1">
                  <div className="font-bold text-xs tracking-widest text-slate-600 uppercase">
                    Правительство Москвы • Комитет государственного строительного надзора
                  </div>
                  <div className="font-black text-sm text-slate-900 uppercase tracking-wide">
                    АКТ ПРОВЕРКИ СООТВЕТСТВИЯ № {predpisanieNumber.replace('ПРЕД', 'АКТ')}/СООТВ-МГСН
                  </div>
                  <div className="text-xs text-slate-500 font-sans">
                    г. Москва • Дата оформления: {new Date().toLocaleDateString('ru-RU')}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans pt-2 border-t border-emerald-200">
                  <div>
                    <span className="text-slate-500 block">Наименование объекта строительства:</span>
                    <strong className="text-slate-900">{currentObject.name} ({currentObject.address})</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Разрешение на строительство (РНС):</span>
                    <strong className="text-slate-900">{currentObject.permit_number}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Заказчик (Застройщик):</span>
                    <strong className="text-slate-900">{currentObject.customer}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Лицо, осуществляющее строительство (Генподрядчик):</span>
                    <strong className="text-slate-900">{currentObject.contractor}</strong>
                  </div>
                </div>

                {/* Verified Construction Documentation Package Box */}
                <div className="bg-white p-4 rounded-xl border border-emerald-200 text-xs font-sans space-y-2">
                  <span className="font-bold text-slate-900 block">
                    1. Сведения о проверенной строительной документации этапа:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-emerald-700 font-bold block">✓ Стадия ПД (Проект)</span>
                      <span className="text-[11px] text-slate-600">Шифр проекта согласован, эталон Мосгосэкспертизы проверен</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-emerald-700 font-bold block">✓ Стадия РД (Рабочая)</span>
                      <span className="text-[11px] text-slate-600">Комплект чертежей со штампом заказчика «В производство работ»</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-emerald-700 font-bold block">✓ Стадия ИД (Исполнительная)</span>
                      <span className="text-[11px] text-slate-600">Реестры актов АОСР, исполнительные геодезические схемы</span>
                    </div>
                  </div>
                </div>

                {/* Inspector Conclusion Box */}
                <div className="bg-white p-4 rounded-xl border border-emerald-200 text-xs font-sans space-y-2">
                  <span className="font-bold text-slate-900 block">
                    2. Результаты сопоставления и инспекционной проверки:
                  </span>
                  <div className="space-y-1.5 text-slate-700">
                    <p>
                      • Проведено инспекционное сличение по <strong>Матрице 132 обязательных параметров</strong>, включая пожарную безопасность, несущие конструкции, инженерные сети и доступность МГН.
                    </p>
                    <p>
                      • Отступлений от утвержденной проектной документации и обязательных требований технических регламентов (№ 384-ФЗ), сводов правил (СП) и ГОСТ <strong>НЕ ВЫЯВЛЕНО</strong>.
                    </p>
                    <p className="font-bold text-emerald-900 pt-1">
                      ЗАКЛЮЧЕНИЕ: Объект капитального строительства на проверенном этапе возводится в строгом соответствии с проектной документацией. Оснований для выдачи предписаний не имеется.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Case 3: Full package & Confirmed Violations - Render Official Predpisanie */}
          {isFullPackage && !isCleanCompliant && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold mb-1.5">
                    <FileText className="w-3.5 h-3.5 text-rose-700" />
                    <span>Шаг 3 регламента • Официальный документ государственного строительного надзора</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900">
                    Предписание об устранении нарушений при строительстве
                  </h2>
                  <p className="text-xs text-slate-600">
                    Формируется на основании ст. 52, 54 Градостроительного кодекса РФ и Положения о Мосгосстройнадзоре
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setPredpisanieSavedNotice('Предписание успешно сохранено в архив проекта!');
                      setTimeout(() => setPredpisanieSavedNotice(null), 3500);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Печать / Сохранить</span>
                  </button>
                  <button
                    onClick={onOpenExport}
                    className="px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-600" />
                    <span>Экспорт PDF</span>
                  </button>
                </div>
              </div>

              {predpisanieSavedNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{predpisanieSavedNotice}</span>
                </div>
              )}

              {/* Document Header Box */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 font-serif text-slate-800">
                <div className="text-center space-y-1">
                  <div className="font-bold text-xs tracking-widest text-slate-600 uppercase">
                    Правительство Москвы • Мосгосстройнадзор
                  </div>
                  <div className="font-black text-sm text-slate-900 uppercase tracking-wide">
                    ПРЕДПИСАНИЕ № {predpisanieNumber}
                  </div>
                  <div className="text-xs text-slate-500 font-sans">
                    г. Москва • Дата оформления: {new Date().toLocaleDateString('ru-RU')}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Кому выдано (Генподрядчик):</span>
                    <strong className="text-slate-900">{currentObject.contractor}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Заказчик (Застройщик):</span>
                    <strong className="text-slate-900">{currentObject.customer}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Наименование объекта строительства:</span>
                    <strong className="text-slate-900">{currentObject.name} ({currentObject.address})</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Разрешение на строительство:</span>
                    <strong className="text-slate-900">{currentObject.permit_number}</strong>
                  </div>
                </div>

                {/* Deadline Setting */}
                <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-300 text-xs font-sans flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <span className="font-bold text-amber-950">
                      Срок устранения нарушений в соответствии со ст. 54 ГрК РФ:
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={predpisanieDays}
                      onChange={(e) => setPredpisanieDays(Number(e.target.value))}
                      className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg font-bold text-amber-900 text-xs focus:outline-none"
                    >
                      <option value={15}>15 календарных дней</option>
                      <option value={30}>30 календарных дней (стандарт)</option>
                      <option value={45}>45 календарных дней</option>
                      <option value={60}>60 календарных дней</option>
                    </select>
                    <span className="text-amber-800 text-xs font-semibold">
                      (до{' '}
                      {new Date(Date.now() + predpisanieDays * 86400000).toLocaleDateString('ru-RU')}
                      )
                    </span>
                  </div>
                </div>

                {/* Table of Confirmed Violations Included in Predpisanie */}
                <div className="space-y-2 font-sans pt-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Перечень подтвержденных нарушений для устранения:</span>
                    <span className="text-purple-700">Всего записей: {protocol.findings.length}</span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-bold uppercase">
                        <tr>
                          <th className="p-2.5">Код</th>
                          <th className="p-2.5">Параметр / Дефект</th>
                          <th className="p-2.5">Требование ПД (Норма)</th>
                          <th className="p-2.5">Факт в РД (Нарушение)</th>
                          <th className="p-2.5">Нормативная ссылка</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {protocol.findings.map((f, idx) => (
                          <tr key={f.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono font-bold text-purple-700">{f.param_code}</td>
                            <td className="p-2.5 font-medium text-slate-900">{f.param_name}</td>
                            <td className="p-2.5 text-slate-600">{f.expected_value}</td>
                            <td className="p-2.5 text-rose-700 font-bold">{f.actual_value}</td>
                            <td className="p-2.5 text-slate-500 text-[11px]">{f.normative_reference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Footer for Step 3 */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setActiveWorkflowStep(2)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Назад к Шагу 2: Поиск гипотез</span>
            </button>

            <button
              onClick={() => setActiveWorkflowStep(4)}
              disabled={!isFullPackage}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-xs ${
                isFullPackage
                  ? 'bg-purple-700 hover:bg-purple-800 text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>
                {isCleanCompliant
                  ? 'Утвердить Акт соответствия и перейти к Шагу 4: Подписание с УКЭП →'
                  : 'Утвердить Предписание и перейти к Шагу 4: Подписание с УКЭП →'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: UKEP SIGNING & FINALIZATION */}
      {activeWorkflowStep === 4 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold mb-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                <span>Шаг 4 регламента • Усиленная квалифицированная электронная подпись</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Подписание протокола верификации и финализация
              </h2>
              <p className="text-xs text-slate-600">
                Наложение юридически значимой УКЭП по ГОСТ Р 34.10-2012 и неизменяемая фиксация результатов проверки
              </p>
            </div>

            {/* Certificate Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white space-y-4 shadow-md border border-indigo-700/40">
              <div className="flex items-center justify-between border-b border-indigo-800/60 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Сертификат ключа проверки электронной подписи</div>
                    <div className="text-xs text-indigo-300">Удостоверяющий центр Правительства Москвы (ГОСТ Р 34.10-2012)</div>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                  СЕРТИФИКАТ ДЕЙСТВИТЕЛЕН
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-indigo-100">
                <div>
                  <span className="text-indigo-300 block text-[11px]">Владелец:</span>
                  <strong>{activeProfile.title}</strong>
                </div>
                <div>
                  <span className="text-indigo-300 block text-[11px]">Серийный номер:</span>
                  <span className="font-mono text-[11px]">009F-2026-MOSGOS-UKEP-77</span>
                </div>
                <div>
                  <span className="text-indigo-300 block text-[11px]">Срок действия:</span>
                  <span>до 31.12.2026</span>
                </div>
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-indigo-700/40 text-xs font-mono flex items-center justify-between">
                <span className="text-indigo-300">Хеш протокола (SHA-256):</span>
                <span className="text-emerald-300">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</span>
              </div>

              {/* Status and Action */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  {isFinalized ? (
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Протокол подписан УКЭП: {protocol.signed_by} ({protocol.signed_at ? new Date(protocol.signed_at).toLocaleDateString('ru-RU') : 'Сегодня'})</span>
                    </div>
                  ) : (
                    <div className="text-xs text-indigo-200">
                      {canFinalize
                        ? 'Все замечания сверены. Протокол готов к финализации и подписанию.'
                        : `Внимание: в протоколе есть неподтвержденные замечания (${candidateCount}). Проверьте их в Шаге 1 перед подписанием.`}
                    </div>
                  )}
                </div>

                {!isFinalized && (
                  <button
                    onClick={onFinalizeProtocol}
                    disabled={!canFinalize}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center space-x-2 shadow-lg cursor-pointer ${
                      canFinalize
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Подписать с УКЭП и финализировать</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stepper Navigation Footer for Step 4 */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setActiveWorkflowStep(3)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Назад к Шагу 3: Предписание</span>
            </button>

            <button
              onClick={() => setActiveWorkflowStep(5)}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <span>Перейти к Шагу 5: Отправка отчета в ИАИС «РиН» →</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: TRANSMIT REPORT TO IAIS RIN & HIGHLIGHT OBJECT ON DASHBOARD */}
      {activeWorkflowStep === 5 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-700" />
                <span>Шаг 5 регламента • Экспорт и фиксация в государственной системе надзора</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Отправка отчета в ИАИС «РиН» и фиксация на Дашборде объектов
              </h2>
              <p className="text-xs text-slate-600">
                Передача полного комплекта проверки в надзорный контур Москвы. При отправке отчета объект выделяется на Дашборде специальным зеленым маркером.
              </p>
            </div>

            {/* If Already Verified and Sent */}
            {(currentObject.is_verified_and_sent || sentReportSuccess) ? (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white space-y-4 shadow-lg border border-emerald-400/40">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-wide uppercase">
                      ПРОВЕРКА ЗАВЕРШЕНА • ОТЧЕТ УСПЕШНО ОТПРАВЛЕН В ИАИС «РиН»!
                    </h3>
                    <p className="text-xs text-emerald-100 mt-0.5">
                      Документы зарегистрированы в Главном управлении государственного строительного надзора Москвы
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-black/20 rounded-xl border border-emerald-400/30 text-xs">
                  <div>
                    <span className="text-emerald-200 block text-[11px]">Регистрационный номер отчета:</span>
                    <strong className="font-mono text-sm">{currentObject.sent_report_id || 'ОПР-2026/041-МГСН'}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-200 block text-[11px]">Статус в Дашборде:</span>
                    <span className="font-bold text-white uppercase tracking-wider">✓ Выделен (Проверен и отправлен)</span>
                  </div>
                  <div>
                    <span className="text-emerald-200 block text-[11px]">Электронная подпись:</span>
                    <span>УКЭП подтверждена (ГОСТ Р 34.10)</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-400/30">
                  <span className="text-xs text-emerald-100">
                    Объект «{currentObject.name}» теперь подсвечен зеленым контуром и баннером на Дашборде.
                  </span>

                  {onNavigateToDashboard && (
                    <button
                      onClick={onNavigateToDashboard}
                      className="px-5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-900 rounded-xl text-xs font-black transition-all shadow-md flex items-center space-x-2 cursor-pointer"
                    >
                      <Building2 className="w-4 h-4 text-emerald-700" />
                      <span>Перейти на Дашборд объектов (Объект подсвечен) →</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Ready to Send Box */
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Состав передаваемого пакета надзорного дела:
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Протокол сверки 132 параметров + гипотезы ИИ</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Предписание об устранении нарушений (ст. 52, 54 ГрК РФ)</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Интерактивные чертежи с красной подсветкой коллизий</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Юридически значимый аудит-лог с УКЭП</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    После нажатия кнопки отчет поступит в ИАИС «РиН», а объект на Дашборде получит статус и подсветку «Отчет передан».
                  </div>

                  <button
                    onClick={handleExecuteSendReport}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs font-black shadow-lg transition-all flex items-center space-x-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Завершить проверку и отправить отчет в ИАИС «РиН»</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Navigation Footer for Step 5 */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setActiveWorkflowStep(4)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Назад к Шагу 4: Подписание с УКЭП</span>
            </button>

            {onNavigateToDashboard && (
              <button
                onClick={onNavigateToDashboard}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Вернуться на Дашборд объектов →</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal: Rejection Reason */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-base font-bold text-slate-900">
                Обоснование отклонения замечания
              </h4>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Выберите нормативное основание, по которому данный параметр признан соответствующим нормативам:
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Причина отклонения:</label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value as RejectionReasonCode)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="NORM_CORRECTION">Поправка / допуск по нормативу (СП / ГОСТ)</option>
                <option value="AUTHOR_SUPERVISION_ACT">Акт авторского надзора / согласование ГИПа</option>
                <option value="WRONG_REVISION">Устаревшая ревизия чертежа</option>
                <option value="MEASUREMENT_TOLERANCE">В пределах строительного допуска (СНиП)</option>
                <option value="OTHER">Иное нормативное основание</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Комментарий инспектора:
              </label>
              <textarea
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                placeholder="Укажите конкретный пункт СП, номер письма или листа..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl h-24 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Подтвердить отклонение
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Clarification */}
      {isClarifyModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-base font-bold text-slate-900">
                Запрос разъяснений у проектировщика / ГИПа
              </h4>
              <button
                onClick={() => setIsClarifyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Сформируйте официальный запрос в проектную организацию для предоставления пояснений:
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Текст запроса:</label>
              <textarea
                value={clarifyComment}
                onChange={(e) => setClarifyComment(e.target.value)}
                placeholder="Запросить обоснование изменения сечения балок..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl h-24 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                onClick={() => setIsClarifyModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmClarify}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl cursor-pointer"
              >
                Направить запрос
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Hypothesis with TZ Builder and Formulation Guide */}
      <HypothesisTZBuilderModal
        isOpen={isCreateHypoModalOpen}
        onClose={() => setIsCreateHypoModalOpen(false)}
        onAddHypothesis={(newHypo) => {
          if (onAddNewHypothesis) {
            onAddNewHypothesis(newHypo);
          }
        }}
        objectId={currentObject.id}
        objectName={currentObject.name}
      />

      {/* Modal: Supervisor Unlock */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-base font-bold text-rose-700 flex items-center space-x-1.5">
                <Unlock className="w-4 h-4" />
                <span>Отмена финализации (Супервизор)</span>
              </h4>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Разблокировка протокола возвращает статус «ВЕРИФИКАЦИЯ» и аннулирует подпись УКЭП. Укажите причину для журнала аудита:
            </p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Причина отмены финализации..."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl h-24 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  onCancelFinalization(cancelReason || 'По решению супервизора');
                  setIsCancelModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
              >
                Подтвердить разблокировку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Quick Versatile File & Stage Documentation Upload */}
      {isQuickUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Дозагрузка файлов и документации объекта
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {currentObject.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickUploadModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stage Completeness Bar */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Комплектность видов документации этапа:</span>
                <span className={`font-black px-2 py-0.5 rounded-full text-[10px] ${
                  isFullPackage ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isFullPackage ? '✓ Полный комплект (ПД + РД + ИД)' : '⚠️ Комплект не полон'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className={`p-2 rounded-xl border font-bold ${
                  hasPd ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-white border-amber-300 text-amber-900'
                }`}>
                  <div>Стадия ПД</div>
                  <div className="text-[10px] font-normal">{hasPd ? '✓ Загружена' : 'Ожидается'}</div>
                </div>
                <div className={`p-2 rounded-xl border font-bold ${
                  hasRd ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-white border-amber-300 text-amber-900'
                }`}>
                  <div>Стадия РД</div>
                  <div className="text-[10px] font-normal">{hasRd ? '✓ Загружена' : 'Ожидается'}</div>
                </div>
                <div className={`p-2 rounded-xl border font-bold ${
                  hasId ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-white border-amber-300 text-amber-900'
                }`}>
                  <div>Стадия ИД</div>
                  <div className="text-[10px] font-normal">{hasId ? '✓ Загружена' : 'Ожидается'}</div>
                </div>
              </div>
            </div>

            {/* Storage Memory Limit Bar */}
            {(() => {
              const currentTotalMb = (uploadedFilesList || []).reduce((acc, f) => acc + (f.sizeMb || 0), 0);
              const maxStorageMb = 200;
              const remainingMb = Math.max(0, +(maxStorageMb - currentTotalMb).toFixed(1));
              const pct = Math.min(100, (currentTotalMb / maxStorageMb) * 100);
              return (
                <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-200/60 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 font-bold text-slate-700">
                      <HardDrive className="w-3.5 h-3.5 text-purple-600" />
                      <span>Память хранилища проекта:</span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700">
                      Осталось памяти: {remainingMb} МБ из {maxStorageMb} МБ
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Stage Selector Chips for Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                К какой стадии привязать загружаемый файл:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'AUTO', label: 'Авто (по имени)' },
                  { id: 'PD', label: 'Стадия ПД (Проект)' },
                  { id: 'RD', label: 'Стадия РД (Рабочая)' },
                  { id: 'ID', label: 'Стадия ИД (Исполн.)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setQuickUploadStage(item.id as any)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      quickUploadStage === item.id
                        ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of currently loaded files with delete option */}
            {uploadedFilesList && uploadedFilesList.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Загруженные документы в проекте ({uploadedFilesList.length}):</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Нажмите корзину для удаления любого документа
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {uploadedFilesList.map((file, idx) => {
                    const isPd = file.stage === 'PD';
                    const isRd = file.stage === 'RD';
                    return (
                      <div
                        key={file.id || `uploaded-file-${idx}`}
                        className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                          isPd
                            ? 'bg-blue-50/50 border-blue-200'
                            : isRd
                            ? 'bg-purple-50/50 border-purple-200'
                            : 'bg-emerald-50/50 border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase shrink-0 ${
                              isPd ? 'bg-blue-600 text-white' : isRd ? 'bg-purple-600 text-white' : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {file.stage || 'РД'}
                          </span>
                          <span className="font-bold text-slate-800 truncate max-w-[280px]" title={file.name}>
                            {file.name}
                          </span>
                          <span className="text-slate-400 text-[10px] shrink-0">
                            {file.sizeMb} МБ
                          </span>
                        </div>

                        {(onDeleteUploadedPdf || onSelectUploadedPdf) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (onDeleteUploadedPdf) {
                                onDeleteUploadedPdf(file.id);
                              } else if (onSelectUploadedPdf) {
                                const remaining = uploadedFilesList.filter((f) => f.id !== file.id);
                                if (remaining.length > 0) {
                                  onSelectUploadedPdf(remaining[0].id);
                                }
                              }
                              setReportDownloadToast(`Документ «${file.name}» удален.`);
                              setTimeout(() => setReportDownloadToast(null), 3000);
                            }}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg cursor-pointer transition-colors shrink-0"
                            title="Удалить файл из проекта"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Direct File Drag & Drop Dropzone */}
            <div
              onClick={() => directFileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFiles = e.dataTransfer.files;
                if (droppedFiles && droppedFiles.length > 0 && onUploadNewPdfFile) {
                  const file = droppedFiles[0];
                  const stage =
                    quickUploadStage === 'AUTO'
                      ? file.name.toUpperCase().includes('ПД')
                        ? 'PD'
                        : file.name.toUpperCase().includes('ИД')
                        ? 'ID'
                        : 'RD'
                      : quickUploadStage;
                  onUploadNewPdfFile(file, stage);
                  if (onQuickAddStage) onQuickAddStage(stage);
                  setReportDownloadToast(`Файл «${file.name}» успешно загружен (Стадия ${stage})!`);
                  setTimeout(() => setReportDownloadToast(null), 3500);
                  setIsQuickUploadModalOpen(false);
                }
              }}
              className="border-2 border-dashed border-purple-300 hover:border-purple-500 bg-purple-50/40 hover:bg-purple-50/80 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
            >
              <input
                ref={directFileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.zip"
                onChange={(e) => {
                  const selected = e.target.files;
                  if (selected && selected.length > 0 && onUploadNewPdfFile) {
                    const file = selected[0];
                    const stage =
                      quickUploadStage === 'AUTO'
                        ? file.name.toUpperCase().includes('ПД')
                          ? 'PD'
                          : file.name.toUpperCase().includes('ИД')
                          ? 'ID'
                          : 'RD'
                        : quickUploadStage;
                    onUploadNewPdfFile(file, stage);
                    if (onQuickAddStage) onQuickAddStage(stage);
                    setReportDownloadToast(`Файл «${file.name}» успешно загружен (Стадия ${stage})!`);
                    setTimeout(() => setReportDownloadToast(null), 3500);
                    setIsQuickUploadModalOpen(false);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs text-purple-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                Нажмите для выбора любого файла или перетащите его сюда
              </div>
              <p className="text-[11px] text-slate-500">
                Поддерживаются любые файлы: .PDF, .DWG, .DXF, .PNG, .JPG, .ZIP (до 100 МБ)
              </p>
            </div>

            {/* Quick 1-click stage fillers */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 block">
                Или добавьте недостающие виды документации в 1 клик:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onQuickAddStage) onQuickAddStage('PD');
                    setReportDownloadToast('Комплект проектной документации (ПД) успешно прикреплен!');
                    setTimeout(() => setReportDownloadToast(null), 3500);
                  }}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    hasPd
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>+ Стадия ПД</span>
                    {hasPd && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Утвержденный проект</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onQuickAddStage) onQuickAddStage('RD');
                    setReportDownloadToast('Комплект рабочей документации (РД) успешно прикреплен!');
                    setTimeout(() => setReportDownloadToast(null), 3500);
                  }}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    hasRd
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>+ Стадия РД</span>
                    {hasRd && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Чертежи в работу</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onQuickAddStage) onQuickAddStage('ID');
                    setReportDownloadToast('Комплект исполнительной документации (ИД) успешно прикреплен!');
                    setTimeout(() => setReportDownloadToast(null), 3500);
                  }}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    hasId
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>+ Стадия ИД</span>
                    {hasId && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Акты АОСР, схемы</div>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              {onQuickCompletePackage && !isFullPackage ? (
                <button
                  type="button"
                  onClick={() => {
                    onQuickCompletePackage();
                    setReportDownloadToast('Все обязательные виды документации (ПД + РД + ИД) загружены!');
                    setTimeout(() => setReportDownloadToast(null), 3500);
                    setIsQuickUploadModalOpen(false);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>⚡ Загрузить все стадии (ПД+РД+ИД) в 1 клик</span>
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setIsQuickUploadModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {reportDownloadToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/20 flex items-center space-x-3 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
            <span>{reportDownloadToast}</span>
          </div>
        </div>
      )}

      {/* DOCUMENT AUDIT & VERIFICATION MODAL */}
      <DocumentAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        object={currentObject}
        protocol={protocol}
        suspicions={suspicions}
        onSelectFindingForInspection={(findingId) => {
          setSelectedFindingId(findingId);
          setActiveWorkflowStep(1);
        }}
      />

      {/* DRAWING COMPUTER VISION BBOX & OVERLAY VISUALIZER MODAL */}
      {selectedVisualizerSuspicion && (
        <DrawingCollisionVisualizerModal
          suspicion={selectedVisualizerSuspicion}
          onClose={() => setSelectedVisualizerSuspicion(null)}
          onPromoteToCandidate={(id) => {
            if (onPromoteToCandidate) {
              onPromoteToCandidate(id);
            }
          }}
          onNavigateToParserTab={() => {
            if (onNavigateToTab) {
              onNavigateToTab('parsing');
            }
          }}
        />
      )}
    </div>
  );
};
