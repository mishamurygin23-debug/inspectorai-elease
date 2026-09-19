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
  FileText
} from 'lucide-react';
import {
  CheckFinding,
  ConstructionObject,
  FindingStatus,
  RejectionReasonCode,
  UserRole,
  InspectionProtocol,
  Suspicion
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
}) => {
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

  const activeFinding =
    protocol.findings.find((f) => f.id === selectedFindingId) || protocol.findings[0];

  const candidateCount = protocol.findings.filter(
    (f) => f.finding_status === 'CANDIDATE'
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

      {/* Main Single-Screen Verification Workflow Viewer */}
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
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="WITHIN_TOLERANCE">В пределах допустимых нормативных допусков (СП)</option>
                <option value="EXPERT_OPINION_ACCEPTED">Согласовано экспертным заключением ГАУ «Мосгосэкспертиза»</option>
                <option value="WRONG_REVISION">Устаревшая редакция чертежа (предоставлен новый лист)</option>
                <option value="OTHER">Иное техническое обоснование</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Комментарий инспектора (необязательно):
              </label>
              <textarea
                rows={3}
                placeholder="Укажите ссылку на лист, приказ или решение..."
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
              >
                Подтвердить отклонение (Норма)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Clarification Required */}
      {isClarifyModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-base font-bold text-slate-900">
                Запрос уточнения (CLARIFICATION_REQUIRED)
              </h4>
              <button
                onClick={() => setIsClarifyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Статус CLARIFICATION_REQUIRED отражает неоднозначность входных данных
              (конфликт редакций) и не превращается в нарушение до получения ответа.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Детали запроса к застройщику:
              </label>
              <textarea
                rows={3}
                placeholder="Например: предоставить утвержденный лист Изм. 4 со штампом в производство..."
                value={clarifyComment}
                onChange={(e) => setClarifyComment(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                onClick={() => setIsClarifyModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmClarify}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                Установить статус уточнения
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cancel Finalization (Supervisor only) */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-base font-bold text-rose-900 flex items-center gap-1.5">
                <Unlock className="w-5 h-5 text-rose-600" />
                Отмена финализации супервизором
              </h4>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Внимание: действие будет зафиксировано в журнале аудита с вашим user_id
              и временем. Протокол вернется в статус верификации, будет разрешена дозагрузка.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Обязательное основание отмены финализации:
              </label>
              <textarea
                rows={3}
                placeholder="Укажите служебную записку или причину пересмотра..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  onCancelFinalization(cancelReason || 'Пересмотр протокола по решению супервизора');
                  setIsCancelModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
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
