import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { InspectionWorkspace } from './components/InspectionWorkspace';
import { Matrix132Tab } from './components/Matrix132Tab';
import { HypothesisTab } from './components/HypothesisTab';
import { IaisRinTab } from './components/IaisRinTab';
import { MLRetrainingTab } from './components/MLRetrainingTab';
import { MLRepositoryTab } from './components/MLRepositoryTab';
import { NormativeBaseTab } from './components/NormativeBaseTab';
import { AuditLogTab } from './components/AuditLogTab';
import { UploadModal } from './components/UploadModal';
import { ExportModal } from './components/ExportModal';
import { CreateObjectModal } from './components/CreateObjectModal';

import {
  initialObjects,
  initialProtocol,
  initialAuditLogs,
  initialSuspicions,
} from './data/mockData';

import {
  UserRole,
  FindingStatus,
  RejectionReasonCode,
  ConstructionObject,
  InspectionProtocol,
  AuditLogEntry,
  Suspicion,
  CheckFinding,
  EvidenceFragment,
} from './types';

import { CheckCircle2, Eye, ArrowRight, X, UploadCloud } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('INSPECTOR');
  const [objects, setObjects] = useState<ConstructionObject[]>(initialObjects);
  const [selectedObjectId, setSelectedObjectId] = useState<string>(initialObjects[0].id);
  const [protocol, setProtocol] = useState<InspectionProtocol>(initialProtocol);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialAuditLogs);
  const [suspicions, setSuspicions] = useState<Suspicion[]>(initialSuspicions);

  // Modals state
  const [isCreateObjectOpen, setIsCreateObjectOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isIncrementalUpload, setIsIncrementalUpload] = useState<boolean>(false);

  // Workflow progress banner state (1. Create -> 2. Upload -> 3. Inspect)
  const [workflowNotice, setWorkflowNotice] = useState<{
    step: 1 | 2 | 3;
    title: string;
    message: string;
    objectName: string;
  } | null>(null);

  const currentObject = objects.find((o) => o.id === selectedObjectId) || objects[0];

  // Helper to add audit log entry
  const addAuditEntry = (action: string, details: string) => {
    const roleNames: Record<UserRole, string> = {
      INSPECTOR: 'Иванов А.С.',
      SUPERVISOR: 'Смирнов В.П.',
      ML_ENGINEER: 'Ковалева Е.М.',
      ADMIN: 'Администратор системы',
    };

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user_id: `usr-${currentRole.toLowerCase()}`,
      user_name: roleNames[currentRole],
      role: currentRole,
      action,
      object_id: currentObject.id,
      target_id: protocol.id,
      details,
      ip_address: '10.24.112.44',
      worm_hash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // 1. Step 1: Create Construction Object
  const handleCreateObjectSuccess = (newObject: ConstructionObject) => {
    setObjects((prev) => [newObject, ...prev]);
    setSelectedObjectId(newObject.id);
    addAuditEntry(
      'OBJECT_CREATED',
      `Зарегистрирован новый объект надзора: «${newObject.name}» (Адрес: ${newObject.address}, РНС: ${newObject.permit_number}).`
    );

    setWorkflowNotice({
      step: 2,
      title: 'Шаг 1 выполнен: Объект создан!',
      message: `Объект «${newObject.name}» зарегистрирован. Загрузите комплекты ПД и РД для запуска автоматической сверки.`,
      objectName: newObject.name,
    });

    // Automatically open Upload Modal for this newly created object
    setIsIncrementalUpload(false);
    setIsUploadOpen(true);
  };

  // 2. Add finding to protocol from Visual Diff comparison
  const handleAddFindingFromDiff = (finding: CheckFinding) => {
    const evidence: EvidenceFragment[] = finding.evidence_fragments && finding.evidence_fragments.length > 0
      ? finding.evidence_fragments
      : [
          {
            id: `ev-${Date.now()}`,
            file_id: 'file-diff-1',
            file_name: 'Сравнение ПД vs РД (Diff)',
            file_hash: 'sha256-diff',
            stage: 'RD',
            discipline: finding.section || 'АР',
            document_code: finding.param_code || 'DIFF',
            revision: 'Изм. 4',
            approval_status: 'APPROVED',
            approval_date: '2026-07-08',
            sheet_page: 'Лист 14',
            bbox: { x: 0.2, y: 0.3, width: 0.4, height: 0.3, page: 1 },
            extracted_value: finding.actual_value,
            role: 'ACTUAL',
          },
        ];

    const newFinding: CheckFinding = {
      ...finding,
      id: finding.id || `f-diff-${Date.now()}`,
      param_id: finding.param_id || 999,
      object_id: currentObject.id,
      completeness_status: finding.completeness_status || 'COMPLETE',
      param_code: finding.param_code || 'DIFF-MANUAL',
      section: finding.section || 'АР',
      param_name: finding.param_name || 'Несоответствие ПД и РД, выявленное визуальным сравнением',
      finding_status: 'CONFIRMED_VIOLATION',
      review_priority: finding.review_priority || 'HIGH',
      expected_value: finding.expected_value || 'Согласно ПД (Эталон)',
      actual_value: finding.actual_value || 'Согласно РД (Факт)',
      delta: finding.delta || 'Геометрическое/конструктивное расхождение',
      justification: finding.justification || 'Выявлено инспектором в интерактивном режиме сравнения 2 файлов.',
      normative_reference: finding.normative_reference || 'СП 70.13330.2012 п. 9.1',
      evidence_fragments: evidence,
      inspector_decision: {
        user_id: `usr-${currentRole.toLowerCase()}`,
        inspector_name: currentRole === 'INSPECTOR' ? 'Иванов А.С.' : 'Смирнов В.П.',
        timestamp: new Date().toISOString(),
        decision: 'CONFIRMED_VIOLATION',
        comment: 'Подтверждено по результатам визуального сравнения двух чертежей.',
      },
    };

    setProtocol((prev) => ({
      ...prev,
      findings: [newFinding, ...prev.findings],
    }));

    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === currentObject.id
          ? {
              ...obj,
              status: 'RED',
              stats: {
                ...obj.stats,
                confirmed_violations: obj.stats.confirmed_violations + 1,
              },
            }
          : obj
      )
    );

    addAuditEntry(
      'DIFF_FINDING_ADDED',
      `В протокол добавлено замечание из визуального сравнения двух чертежей: ${newFinding.param_name} (${newFinding.expected_value} vs ${newFinding.actual_value}).`
    );
  };

  // 3. Update finding status (Inspector/Supervisor workflow)
  const handleUpdateFindingStatus = (
    findingId: string,
    status: FindingStatus,
    options?: {
      rejectionReason?: RejectionReasonCode;
      comment?: string;
      clarificationDetails?: string;
    }
  ) => {
    const finding = protocol.findings.find((f) => f.id === findingId);
    if (!finding) return;

    const previousStatus = finding.finding_status;

    setProtocol((prev) => ({
      ...prev,
      findings: prev.findings.map((f) => {
        if (f.id === findingId) {
          return {
            ...f,
            finding_status: status,
            inspector_decision: {
              user_id: `usr-${currentRole.toLowerCase()}`,
              inspector_name: currentRole === 'INSPECTOR' ? 'Иванов А.С.' : 'Смирнов В.П.',
              timestamp: new Date().toISOString(),
              decision:
                status === 'CONFIRMED_VIOLATION'
                  ? 'CONFIRMED_VIOLATION'
                  : status === 'CLARIFICATION_REQUIRED'
                  ? 'CLARIFICATION_REQUIRED'
                  : 'NEGATIVE_VERIFIED',
              rejection_reason: options?.rejectionReason,
              comment: options?.comment || '',
              clarification_details: options?.clarificationDetails,
            },
          };
        }
        return f;
      }),
    }));

    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id === currentObject.id) {
          let confirmedDelta = 0;
          let candidateDelta = 0;
          let negDelta = 0;

          if (previousStatus === 'CANDIDATE' && status === 'CONFIRMED_VIOLATION') {
            candidateDelta = -1;
            confirmedDelta = 1;
          } else if (previousStatus === 'CANDIDATE' && status === 'NEGATIVE_VERIFIED') {
            candidateDelta = -1;
            negDelta = 1;
          } else if (previousStatus === 'CONFIRMED_VIOLATION' && status === 'NEGATIVE_VERIFIED') {
            confirmedDelta = -1;
            negDelta = 1;
          } else if (previousStatus === 'NEGATIVE_VERIFIED' && status === 'CONFIRMED_VIOLATION') {
            negDelta = -1;
            confirmedDelta = 1;
          }

          return {
            ...obj,
            stats: {
              ...obj.stats,
              confirmed_violations: Math.max(0, obj.stats.confirmed_violations + confirmedDelta),
              candidate_findings: Math.max(0, obj.stats.candidate_findings + candidateDelta),
              negative_verified: Math.max(0, obj.stats.negative_verified + negDelta),
            },
          };
        }
        return obj;
      })
    );

    addAuditEntry(
      'UPDATE_FINDING_STATUS',
      `Статус параметра ${finding.param_code} изменен с ${previousStatus} на ${status}. ${
        options?.rejectionReason ? `Причина: ${options.rejectionReason}. ` : ''
      }${options?.comment ? `Комментарий: "${options.comment}"` : ''}`
    );
  };

  // 4. Split compound finding (Sub-rule 1:1)
  const handleSplitFinding = (findingId: string) => {
    const parentFinding = protocol.findings.find((f) => f.id === findingId);
    if (!parentFinding) return;

    const childA: CheckFinding = {
      ...parentFinding,
      id: `${parentFinding.id}-sub-1`,
      param_name: `${parentFinding.param_name} (Часть 1: Габариты проемов)`,
      is_atomic: true,
      parent_candidate_id: parentFinding.id,
      finding_status: 'CONFIRMED_VIOLATION',
    };

    const childB: CheckFinding = {
      ...parentFinding,
      id: `${parentFinding.id}-sub-2`,
      param_name: `${parentFinding.param_name} (Часть 2: Огнестойкость перегородок)`,
      is_atomic: true,
      parent_candidate_id: parentFinding.id,
      finding_status: 'CONFIRMED_VIOLATION',
    };

    setProtocol((prev) => ({
      ...prev,
      findings: [
        ...prev.findings.filter((f) => f.id !== findingId),
        childA,
        childB,
      ],
    }));

    addAuditEntry(
      'SPLIT_COMPOUND_FINDING',
      `Составное замечание ${parentFinding.param_code} разделено на 2 независимых дефекта по правилу 1 дефект = 1 запись.`
    );
  };

  // 5. Finalize protocol
  const handleFinalizeProtocol = () => {
    setProtocol((prev) => ({
      ...prev,
      status: 'FINALIZED',
      ukep_signature: `UKEP-SIG-2026-MOSGOS-${Date.now().toString(16).toUpperCase()}`,
      signed_at: new Date().toISOString(),
      signed_by: currentRole === 'SUPERVISOR' ? 'Смирнов В.П. (Супервизор)' : 'Иванов А.С. (Инспектор)',
      iais_sync_status: 'SYNCED',
    }));

    addAuditEntry(
      'FINALIZE_PROTOCOL',
      `Протокол проверки № ${protocol.id} утвержден с УКЭП и финализирован. Экспортирован в ИАИС «РиН».`
    );
  };

  // 6. Cancel finalization
  const handleCancelFinalization = (reason: string) => {
    setProtocol((prev) => ({
      ...prev,
      status: 'VERIFYING',
    }));

    addAuditEntry(
      'UNLOCK_PROTOCOL',
      `Финализация протокола № ${protocol.id} отменена супервизором. Причина: «${reason}».`
    );
  };

  // 6b. Toggle object verified and sent status (for Dashboard highlight)
  const handleToggleVerifiedAndSent = (objectId: string) => {
    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id === objectId) {
          const nextState = !obj.is_verified_and_sent;
          const reportCode = nextState
            ? `ОПР-2026/${obj.id.replace('obj-', '').toUpperCase()}-МГСН`
            : undefined;
          return {
            ...obj,
            is_verified_and_sent: nextState,
            verified_and_sent_at: nextState ? new Date().toISOString() : undefined,
            sent_report_id: reportCode,
          };
        }
        return obj;
      })
    );
  };

  // 6c. Complete full verification, transmit report to IAIS "RiN", and highlight object on Dashboard
  const handleSendReportAndHighlightObject = (objectId?: string) => {
    const targetId = objectId || currentObject.id;
    const targetObj = objects.find((o) => o.id === targetId) || currentObject;
    const reportCode = `ОПР-2026/${targetObj.id.replace('obj-', '').toUpperCase()}-МГСН`;

    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id === targetId) {
          return {
            ...obj,
            is_verified_and_sent: true,
            verified_and_sent_at: new Date().toISOString(),
            sent_report_id: reportCode,
            status: 'GREEN',
            iais_rin_sync: {
              ...obj.iais_rin_sync,
              status: 'SYNCED',
              registration_number: `РИН-${Date.now().toString().slice(-6)}/26`,
              ukep_signature: {
                ...obj.iais_rin_sync.ukep_signature,
                valid: true,
                signed_at: new Date().toISOString(),
              },
            },
          };
        }
        return obj;
      })
    );

    setProtocol((prev) => ({
      ...prev,
      status: 'FINALIZED',
      iais_sync_status: 'SYNCED',
      ukep_signature: `UKEP-SIG-2026-MOSGOS-${Date.now().toString(16).toUpperCase()}`,
      signed_at: new Date().toISOString(),
      signed_by: currentRole === 'SUPERVISOR' ? 'Смирнов В.П. (Супервизор)' : 'Иванов А.С. (Инспектор)',
    }));

    addAuditEntry(
      'REPORT_SENT_IAIS_RIN',
      `Полная проверка завершена: отчет по объекту «${targetObj.name}» (№ ${reportCode}) отправлен в надзорную систему ИАИС «РиН». Объект отмечен на Дашборде как полностью проверенный.`
    );
  };

  // 7. Step 2 & 3: Upload success and automatic verification
  const handleUploadSuccess = (filesCount: number) => {
    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id === selectedObjectId) {
          return {
            ...obj,
            status: 'RED',
            scenarios: {
              ...obj.scenarios,
              stage_statuses: {
                pd: 'PD_UPLOADED',
                rd: 'RD_UPLOADED',
                id: obj.scenarios.stage_statuses.id === 'ID_MISSING' ? 'ID_PARTIAL' : obj.scenarios.stage_statuses.id,
              },
            },
            stats: {
              ...obj.stats,
              total_params_checked: 132,
              confirmed_violations: Math.max(obj.stats.confirmed_violations, 5),
              candidate_findings: Math.max(obj.stats.candidate_findings, 3),
              negative_verified: Math.max(obj.stats.negative_verified, 14),
            },
          };
        }
        return obj;
      })
    );

    addAuditEntry(
      'OBJECT_CHECK_EXECUTED',
      `Для объекта «${currentObject.name}» загружено ${filesCount} файлов. Выполнена сверка 132 параметров нормативной базы 2026 года. Расхождения подсвечены КРАСНЫМ цветом.`
    );

    setWorkflowNotice({
      step: 3,
      title: 'Шаг 3: Проверка объекта успешно проведена!',
      message: `Комплекты ПД и РД сверены по 132 контрольным точкам. Обнаружено 5 расхождений, которые выделены КРАСНЫМ цветом в режиме визуального сравнения.`,
      objectName: currentObject.name,
    });
  };

  // 8. Promote suspicion from Free Hypothesis to Candidate
  const handlePromoteToCandidate = (suspicionId: number) => {
    const susp = suspicions.find((s) => s.suspicion_id === suspicionId);
    if (!susp) return;

    setSuspicions((prev) =>
      prev.map((s) =>
        s.suspicion_id === suspicionId
          ? { ...s, inspector_status: 'PROMOTED_TO_CANDIDATE' }
          : s
      )
    );

    const newFinding: CheckFinding = {
      id: `f-hypo-${susp.suspicion_id}`,
      param_id: susp.suspicion_id,
      object_id: currentObject.id,
      completeness_status: 'COMPLETE',
      param_code: `HYPO-${susp.suspicion_id}`,
      section: 'АР',
      param_name: susp.description.substring(0, 48) + '...',
      finding_status: 'CANDIDATE',
      review_priority: susp.review_priority,
      expected_value: susp.pd_reference,
      actual_value: susp.rd_reference,
      delta: 'Выявлено свободным поиском (SUSPICION)',
      justification: susp.description,
      normative_reference: susp.normative_base,
      evidence_fragments: [
        {
          id: `ev-hypo-${susp.suspicion_id}`,
          file_id: 'file-hypo',
          file_name: 'Гипотеза свободного поиска',
          file_hash: 'sha256-hypo',
          stage: 'RD',
          discipline: 'АР',
          document_code: 'HYPO',
          revision: 'Изм. 4',
          approval_status: 'APPROVED',
          approval_date: '2026-07-08',
          sheet_page: 'Лист 14',
          bbox: { x: 0.1, y: 0.2, width: 0.3, height: 0.3, page: 1 },
          extracted_value: susp.rd_reference,
          role: 'ACTUAL',
        },
      ],
    };

    setProtocol((prev) => ({
      ...prev,
      findings: [newFinding, ...prev.findings],
    }));

    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === currentObject.id
          ? {
              ...obj,
              stats: {
                ...obj.stats,
                candidate_findings: obj.stats.candidate_findings + 1,
              },
            }
          : obj
      )
    );

    addAuditEntry(
      'HYPOTHESIS_PROMOTED',
      `Гипотеза #${susp.suspicion_id} «${susp.description.substring(0, 40)}...» переведена в статус CANDIDATE для проверки инспектором.`
    );
  };

  // 9. Dismiss suspicion
  const handleDismissSuspicion = (suspicionId: number) => {
    setSuspicions((prev) =>
      prev.map((s) =>
        s.suspicion_id === suspicionId
          ? { ...s, inspector_status: 'DISMISSED' }
          : s
      )
    );

    addAuditEntry(
      'HYPOTHESIS_DISMISSED',
      `Гипотеза #${suspicionId} отклонена инспектором.`
    );
  };

  // 10. Add new manual hypothesis
  const handleAddNewHypothesis = (newHypo: Omit<Suspicion, 'suspicion_id'>) => {
    const nextId = Math.max(...suspicions.map((s) => s.suspicion_id), 0) + 1;
    const created: Suspicion = {
      ...newHypo,
      suspicion_id: nextId,
      finding_status: 'SUSPICION',
      inspector_status: 'PENDING',
    };

    setSuspicions((prev) => [created, ...prev]);

    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === currentObject.id
          ? {
              ...obj,
              stats: {
                ...obj.stats,
                suspicions_count: obj.stats.suspicions_count + 1,
              },
            }
          : obj
      )
    );

    addAuditEntry(
      'MANUAL_HYPOTHESIS_ADDED',
      `Инспектор добавил гипотезу свободного поиска: «${created.description.substring(0, 40)}...» (Приоритет: ${created.review_priority}).`
    );
  };

  // 11. Role switcher
  const handleSetCurrentRole = (role: UserRole) => {
    setCurrentRole(role);
    const roleNames: Record<UserRole, string> = {
      INSPECTOR: 'Иванов А.С. (Инспектор)',
      SUPERVISOR: 'Смирнов В.П. (Супервизор)',
      ML_ENGINEER: 'Ковалева Е.М. (ML-инженер)',
      ADMIN: 'Соколов Д.Н. (Администратор)',
    };
    addAuditEntry(
      'ROLE_SWITCH',
      `Смена активного профиля пользователя на: ${roleNames[role]} (УКЭП и права доступа обновлены).`
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-purple-600 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        setCurrentRole={handleSetCurrentRole}
        selectedObjectName={currentObject.name}
        onOpenUpload={() => {
          setIsIncrementalUpload(false);
          setIsUploadOpen(true);
        }}
        onOpenCreateObject={() => setIsCreateObjectOpen(true)}
      />

      {/* Sequential Workflow Banner when active */}
      {workflowNotice && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white border-b border-purple-700/60 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow">
                {workflowNotice.step}
              </span>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>{workflowNotice.title}</span>
                  <span className="text-[10px] px-2 py-0.2 rounded bg-purple-800 text-purple-200">
                    {workflowNotice.objectName}
                  </span>
                </div>
                <div className="text-[11px] text-purple-200/90">{workflowNotice.message}</div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {workflowNotice.step === 3 && (
                <button
                  onClick={() => setActiveTab('inspection')}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Верификация: чертеж с подсветкой ошибок</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </button>
              )}

              {workflowNotice.step === 2 && (
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Загрузить файлы в этот объект</span>
                </button>
              )}

              <button
                onClick={() => setWorkflowNotice(null)}
                className="text-purple-300 hover:text-white p-1 rounded cursor-pointer"
                title="Закрыть уведомление"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Body View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            objects={objects}
            selectedObjectId={selectedObjectId}
            onSelectObject={setSelectedObjectId}
            onNavigateToVerification={(id) => {
              setSelectedObjectId(id);
              setActiveTab('inspection');
            }}
            onOpenExport={(obj) => {
              setSelectedObjectId(obj.id);
              setIsExportOpen(true);
            }}
            onOpenUpload={() => {
              setIsIncrementalUpload(false);
              setIsUploadOpen(true);
            }}
            onOpenCreateObject={() => setIsCreateObjectOpen(true)}
            onOpenUploadForObject={(obj) => {
              setSelectedObjectId(obj.id);
              setIsIncrementalUpload(false);
              setIsUploadOpen(true);
            }}
            onToggleVerifiedAndSent={handleToggleVerifiedAndSent}
          />
        )}

        {(activeTab === 'inspection' || activeTab === 'hypotheses') && (
          <InspectionWorkspace
            currentObject={currentObject}
            protocol={protocol}
            currentRole={currentRole}
            onUpdateFindingStatus={handleUpdateFindingStatus}
            onSplitFinding={handleSplitFinding}
            onFinalizeProtocol={handleFinalizeProtocol}
            onCancelFinalization={handleCancelFinalization}
            onAddFindingToProtocol={handleAddFindingFromDiff}
            suspicions={suspicions}
            onPromoteToCandidate={handlePromoteToCandidate}
            onAddNewHypothesis={handleAddNewHypothesis}
            onDismissSuspicion={handleDismissSuspicion}
            onOpenUpload={() => {
              setIsIncrementalUpload(false);
              setIsUploadOpen(true);
            }}
            onOpenExport={() => setIsExportOpen(true)}
            onSendReportAndComplete={handleSendReportAndHighlightObject}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'matrix' && <Matrix132Tab />}

        {activeTab === 'iais_rin' && (
          <IaisRinTab
            currentObject={currentObject}
            protocol={protocol}
          />
        )}

        {activeTab === 'ml_repo' && (
          <MLRepositoryTab currentRole={currentRole} />
        )}

        {activeTab === 'ml_gold' && (
          <MLRetrainingTab currentRole={currentRole} />
        )}

        {activeTab === 'normative' && (
          <NormativeBaseTab currentRole={currentRole} />
        )}

        {activeTab === 'audit' && (
          <AuditLogTab logs={auditLogs} />
        )}
      </main>

      {/* Modals */}
      {/* 1. Create Object Modal */}
      <CreateObjectModal
        isOpen={isCreateObjectOpen}
        onClose={() => setIsCreateObjectOpen(false)}
        onCreateSuccess={handleCreateObjectSuccess}
      />

      {/* 2. Upload & Verification Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        onOpenDiffMode={() => {
          setActiveTab('diff_compare');
        }}
        onOpenVerification={() => {
          setActiveTab('inspection');
        }}
        isIncremental={isIncrementalUpload}
        objectName={currentObject.name}
      />

      {/* 3. Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        object={currentObject}
        protocol={protocol}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-5 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">Инспектор ИИ • Стройнадзор Москвы</span>
            <span>—</span>
            <span>Конкурс «Лидеры цифровой трансформации 2026»</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span>ГОСТ Р 21.101-2020</span>
            <span>•</span>
            <span>Приказ Минстроя № 344/пр</span>
            <span>•</span>
            <span>ПП РФ № 87</span>
            <span>•</span>
            <span>152-ФЗ / 187-ФЗ КИИ</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
