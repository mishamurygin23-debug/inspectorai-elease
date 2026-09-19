import React, { useState } from 'react';
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
  ExternalLink
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
}) => {
  // Step-by-step workflow state: 1 to 5
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<1 | 2 | 3 | 4 | 5>(1);

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

  // Step 2: Hypothesis search & filter state
  const [hypoSearchQuery, setHypoSearchQuery] = useState<string>('');
  const [hypoFilterMethod, setHypoFilterMethod] = useState<string>('ALL');
  const [isCreateHypoModalOpen, setIsCreateHypoModalOpen] = useState<boolean>(false);
  const [newHypoMethod, setNewHypoMethod] = useState<DiscoveryMethod>('LOGICAL_ANALYSIS');
  const [newHypoDesc, setNewHypoDesc] = useState<string>('');
  const [newHypoPd, setNewHypoPd] = useState<string>('');
  const [newHypoRd, setNewHypoRd] = useState<string>('');
  const [newHypoNorm, setNewHypoNorm] = useState<string>('');

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

  const isFinalized = protocol.status === 'FINALIZED';
  const canFinalize = candidateCount === 0;

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

  const handleCreateHypoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHypoDesc || !onAddNewHypothesis) return;
    onAddNewHypothesis({
      object_id: currentObject.id,
      discovery_method: newHypoMethod,
      confidence: 0.88,
      description: newHypoDesc,
      pd_reference: newHypoPd || 'ПД: спецификации и раздел АР',
      rd_reference: newHypoRd || 'РД: рабочие листы чертежей',
      review_priority: 'HIGH',
      normative_base: newHypoNorm || 'СП / Градостроительный кодекс РФ',
      finding_status: 'SUSPICION',
      inspector_status: 'PENDING',
    });
    setNewHypoDesc('');
    setNewHypoPd('');
    setNewHypoRd('');
    setNewHypoNorm('');
    setIsCreateHypoModalOpen(false);
  };

  const handleExecuteSendReport = () => {
    if (onSendReportAndComplete) {
      onSendReportAndComplete(currentObject.id);
    }
    setSentReportSuccess(true);
  };

  const filteredSuspicions = suspicions.filter((s) => {
    if (hypoFilterMethod !== 'ALL' && s.discovery_method !== hypoFilterMethod) return false;
    if (
      hypoSearchQuery &&
      !s.description.toLowerCase().includes(hypoSearchQuery.toLowerCase()) &&
      !s.normative_base.toLowerCase().includes(hypoSearchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

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
      title: 'Сверка замечаний',
      badge: 'Красный PDF',
      sub: candidateCount === 0 ? '✓ Проверено' : `${candidateCount} кандидатов`,
      done: candidateCount === 0,
    },
    {
      step: 2 as const,
      num: '2',
      title: 'Свободный поиск ИИ',
      badge: 'Гипотезы',
      sub: `${suspicions.length} гипотез`,
      done: suspicions.some((s) => s.inspector_status === 'PROMOTED_TO_CANDIDATE'),
    },
    {
      step: 3 as const,
      num: '3',
      title: 'Предписание',
      badge: 'ст. 52, 54 ГрК',
      sub: `Срок ${predpisanieDays} дней`,
      done: confirmedCount > 0,
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

        {/* Global Toolbar: Upload, Export, Finalize */}
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>К Дашборду</span>
            </button>
          )}

          <button
            onClick={onOpenUpload}
            disabled={isFinalized}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center space-x-1.5 ${
              isFinalized
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 cursor-pointer'
            }`}
            title="Загрузка дополнительных листов или новых ревизий чертежей"
          >
            <Split className="w-3.5 h-3.5" />
            <span>Дозагрузка РД</span>
          </button>

          <button
            onClick={onOpenExport}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Экспорт протокола в PDF, Excel или выгрузка в ИАИС «РиН»"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Экспорт протокола</span>
          </button>

          {isFinalized ? (
            (currentRole === 'SUPERVISOR' || currentRole === 'ADMIN') && (
              <button
                onClick={() => setIsCancelModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Отменить финализацию</span>
              </button>
            )
          ) : (
            <button
              onClick={onFinalizeProtocol}
              disabled={!canFinalize}
              className={`px-4 py-2 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 ${
                canFinalize
                  ? 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white cursor-pointer shadow-purple-600/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>Финализировать протокол</span>
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
              {activeWorkflowStep === 1 && 'Сверка замечаний на чертежах (Красный PDF)'}
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
      {activeWorkflowStep === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Шаг 2 регламента • Свободный поиск гипотез и скрытых коллизий ИИ</span>
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  Модуль глубокого анализа чертежей (Раздел 9.5 ТЗ)
                </h2>
                <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                  Позволяет инспектору выявлять скрытые проектные несоответствия вне жесткой Матрицы 132 параметров.
                  Любая найденная гипотеза может быть в 1 клик включена в официальный протокол для оформления Предписания.
                </p>
              </div>

              <button
                onClick={() => setIsCreateHypoModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Сформировать гипотезу вручную</span>
              </button>
            </div>

            {/* Quick Prompt Chips */}
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
              <div className="text-xs font-bold text-slate-700">
                Быстрый выбор готовых инженерных гипотез по объекту «{currentObject.name}»:
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '🔥 Огнестойкость сэндвич-панелей (EI 150 vs EI 90)', q: 'огнестойкость' },
                  { label: '🏢 Назначение пом. 104 (ИТП vs Серверная)', q: 'серверная' },
                  { label: '🏗️ Расход арматуры ростверков (+28%)', q: 'арматура' },
                  { label: '📐 Отклонение кронштейнов НВФ (+18 мм)', q: 'кронштейн' },
                  { label: '♿ Доступность МГН: уклон пандуса 1:12 vs 1:20', q: 'пандус' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setHypoSearchQuery(chip.q);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="mt-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Введите ключевые слова для поиска (например: огнестойкость, арматура, вентиляция, фундамент)..."
                  value={hypoSearchQuery}
                  onChange={(e) => setHypoSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              {hypoSearchQuery && (
                <button
                  onClick={() => setHypoSearchQuery('')}
                  className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Сбросить
                </button>
              )}
            </div>

            {/* 4 Method Filter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {(Object.keys(methodDetails) as DiscoveryMethod[]).map((method) => {
                const info = methodDetails[method];
                const Icon = info.icon;
                const count = suspicions.filter((s) => s.discovery_method === method).length;
                return (
                  <div
                    key={method}
                    onClick={() => setHypoFilterMethod(hypoFilterMethod === method ? 'ALL' : method)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      hypoFilterMethod === method
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {count}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 mt-2">{info.label}</div>
                    <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">{info.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* List of Suspicions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Обнаруженные гипотезы и потенциальные коллизии ({filteredSuspicions.length})
              </h3>
              <span className="text-xs text-slate-500">
                Нажмите «+ Добавить в протокол», чтобы привязать замечание к Предписанию
              </span>
            </div>

            {filteredSuspicions.map((susp) => {
              const isPromoted = susp.inspector_status === 'PROMOTED_TO_CANDIDATE';
              const isDismissed = susp.inspector_status === 'DISMISSED';

              return (
                <div
                  key={susp.suspicion_id}
                  className={`bg-white rounded-2xl p-5 border transition-all shadow-xs space-y-3 ${
                    isPromoted
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : isDismissed
                      ? 'border-slate-200 bg-slate-50 opacity-60'
                      : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        ИИ уверенность: {Math.round(susp.confidence * 100)}%
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600">
                        #{susp.suspicion_id}
                      </span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-700 font-medium">
                        {susp.normative_base}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isPromoted ? (
                        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Включено в протокол как замечание
                        </span>
                      ) : (
                        <button
                          onClick={() => onPromoteToCandidate && onPromoteToCandidate(susp.suspicion_id)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>+ Включить в протокол (CANDIDATE)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-sm font-bold text-slate-900 leading-snug">
                    {susp.description}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-500 font-bold block text-[11px]">По проекту (ПД):</span>
                      <span className="text-slate-800 font-medium">{susp.pd_reference}</span>
                    </div>
                    <div>
                      <span className="text-rose-600 font-bold block text-[11px]">По факту (РД):</span>
                      <span className="text-slate-800 font-medium">{susp.rd_reference}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stepper Navigation Footer for Step 2 */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
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

      {/* STEP 3: OFFICIAL PREDPISANIE GENERATION */}
      {activeWorkflowStep === 3 && (
        <div className="space-y-4">
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
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <span>Утвердить Предписание и перейти к Шагу 4: Подписание с УКЭП →</span>
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

      {/* Modal: Create Hypothesis Manually */}
      {isCreateHypoModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateHypoSubmit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Формирование инженерной гипотезы ИИ вручную</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsCreateHypoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Метод выявления:</label>
                <select
                  value={newHypoMethod}
                  onChange={(e) => setNewHypoMethod(e.target.value as DiscoveryMethod)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                >
                  <option value="LOGICAL_ANALYSIS">Логический анализ связок</option>
                  <option value="SEMANTIC_DISSONANCE">Семантический диссонанс</option>
                  <option value="NORMATIVE_ANALYSIS">Нормативный анализ (СП, ГОСТ)</option>
                  <option value="ML_PATTERN_ANALYSIS">ML-паттерн-анализ</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Суть гипотезы / коллизии:</label>
                <textarea
                  value={newHypoDesc}
                  onChange={(e) => setNewHypoDesc(e.target.value)}
                  placeholder="Опишите предполагаемое расхождение..."
                  required
                  rows={3}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Требование ПД:</label>
                  <input
                    type="text"
                    value={newHypoPd}
                    onChange={(e) => setNewHypoPd(e.target.value)}
                    placeholder="ПД: раздел АР..."
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Факт РД:</label>
                  <input
                    type="text"
                    value={newHypoRd}
                    onChange={(e) => setNewHypoRd(e.target.value)}
                    placeholder="РД: лист 12..."
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Нормативная база:</label>
                <input
                  type="text"
                  value={newHypoNorm}
                  onChange={(e) => setNewHypoNorm(e.target.value)}
                  placeholder="СП 59.13330.2020 / СП 16.13330..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsCreateHypoModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
              >
                Создать гипотезу
              </button>
            </div>
          </form>
        </div>
      )}

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
    </div>
  );
};
