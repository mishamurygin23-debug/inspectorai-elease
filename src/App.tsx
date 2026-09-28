import React, { useState, useEffect } from 'react';
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
import { ExecutiveDocumentationRegistry } from './components/ExecutiveDocumentationRegistry';
import { DrawingParserTab } from './components/DrawingParserTab';
import { UploadModal } from './components/UploadModal';
import { ExportModal } from './components/ExportModal';
import { CreateObjectModal } from './components/CreateObjectModal';
import { AuthModal } from './components/AuthModal';
import { UploadedPdfMetadata } from './components/ActualPdfViewer';
import { classifyFileObject, classifyDocument } from './utils/documentClassifier';

import {
  initialObjects,
  initialProtocol,
  initialAuditLogs,
  initialSuspicions,
  COMPREHENSIVE_SUSPICIONS_CATALOG,
} from './data/mockData';
import { ROLE_PROFILES } from './data/rolesData';

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
  SectionCode,
} from './types';

import { CheckCircle2, Eye, ArrowRight, X, UploadCloud } from 'lucide-react';

const defaultEmptyObject: ConstructionObject = {
  id: 'empty-obj',
  name: 'Объект не выбран',
  address: 'Создайте объект или загрузите документацию (ПД / РД / ИД)',
  customer: 'Не указан',
  contractor: 'Не указан',
  permit_number: 'Не указан',
  status: 'GREEN',
  active_protocol_id: 'prot-empty',
  created_at: new Date().toISOString(),
  scenarios: {
    upload_scenario: 'FULL',
    stage_statuses: {
      pd: 'PD_MISSING',
      rd: 'RD_MISSING',
      id: 'ID_MISSING',
    },
  },
  stats: {
    total_params_checked: 0,
    confirmed_violations: 0,
    candidate_findings: 0,
    negative_verified: 0,
    clarification_required: 0,
    missing_evidence: 0,
    suspicions_count: 0,
  },
  iais_rin_sync: {
    process_id: '',
    ukep_signature: {
      signatory: '',
      certificate_serial: '',
      valid_until: '',
      valid: false,
    },
    status: 'PENDING',
  },
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('INSPECTOR');
  const [objects, setObjects] = useState<ConstructionObject[]>(initialObjects);
  const [selectedObjectId, setSelectedObjectId] = useState<string>(initialObjects[0]?.id || '');
  const [protocol, setProtocol] = useState<InspectionProtocol>(initialProtocol);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialAuditLogs);
  const [suspicions, setSuspicions] = useState<Suspicion[]>(initialSuspicions);

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isCreateObjectOpen, setIsCreateObjectOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isIncrementalUpload, setIsIncrementalUpload] = useState<boolean>(false);

  // Actual uploaded PDF files state for authentic inspection viewer
  const [uploadedPdfs, setUploadedPdfs] = useState<UploadedPdfMetadata[]>([]);
  const [activePdfBlobUrl, setActivePdfBlobUrl] = useState<string>('');
  const [activePdfName, setActivePdfName] = useState<string>('');
  const [activePdfSizeMb, setActivePdfSizeMb] = useState<number>(0);

  // Workflow progress banner state (1. Create -> 2. Upload -> 3. Inspect)
  const [workflowNotice, setWorkflowNotice] = useState<{
    step: 1 | 2 | 3;
    title: string;
    message: string;
    objectName: string;
  } | null>(null);

  const currentObject =
    objects.find((o) => o.id === selectedObjectId) || objects[0] || defaultEmptyObject;

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

  const handleUploadNewPdfFile = async (file: File, explicitStage?: 'PD' | 'RD' | 'ID') => {
    const classification = await classifyFileObject(file);
    const assignedStage = explicitStage || classification.stage;
    const blobUrl = URL.createObjectURL(file);
    const sizeMb = +(file.size / (1024 * 1024)).toFixed(1);

    const newPdfItem: UploadedPdfMetadata = {
      id: `pdf-uploaded-${Date.now()}`,
      name: file.name,
      blobUrl: blobUrl,
      sizeMb: sizeMb || 1.0,
      stage: assignedStage,
      uploadedAt: 'Только что',
    };

    setUploadedPdfs((prev) => [newPdfItem, ...prev]);
    setActivePdfBlobUrl(blobUrl);
    setActivePdfName(file.name);
    setActivePdfSizeMb(sizeMb || 1.0);

    // If no object exists yet, automatically create an object for this file
    if (objects.length === 0 || !objects.some((o) => o.id === selectedObjectId)) {
      const autoObjName =
        classification.suggestedObjectName ||
        file.name.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ');

      const newObj: ConstructionObject = {
        id: `obj-${Date.now()}`,
        name: autoObjName,
        address: 'г. Москва (адрес уточняется по проектным данным)',
        customer: 'Заказчик строительства',
        contractor: 'Генеральная подрядная организация',
        permit_number: 'РНС уточняется',
        status: 'GREEN',
        active_protocol_id: `prot-${Date.now()}`,
        created_at: new Date().toISOString(),
        scenarios: {
          upload_scenario: assignedStage === 'PD' ? 'FULL' : 'PD_RD_ONLY',
          stage_statuses: {
            pd: assignedStage === 'PD' ? 'PD_UPLOADED' : 'PD_MISSING',
            rd: assignedStage === 'RD' ? 'RD_UPLOADED' : 'RD_MISSING',
            id: assignedStage === 'ID' ? 'ID_UPLOADED' : 'ID_MISSING',
          },
        },
        stats: {
          total_params_checked: 0,
          confirmed_violations: 0,
          candidate_findings: 0,
          negative_verified: 0,
          clarification_required: 0,
          missing_evidence: 0,
          suspicions_count: COMPREHENSIVE_SUSPICIONS_CATALOG.length,
        },
        iais_rin_sync: {
          process_id: `proc-${Date.now()}`,
          ukep_signature: {
            signatory: 'Иванов А.С., Инспектор Мосгосстройнадзора',
            certificate_serial: '00E17A8293DF4B1C90',
            valid_until: '31.12.2026',
            valid: true,
          },
          status: 'PENDING',
        },
      };
      setObjects([newObj]);
      setSelectedObjectId(newObj.id);
    } else {
      setObjects((prev) =>
        prev.map((obj) => {
          if (obj.id !== selectedObjectId) return obj;
          const currentStageStatuses = { ...obj.scenarios.stage_statuses };
          if (assignedStage === 'PD') currentStageStatuses.pd = 'PD_UPLOADED';
          if (assignedStage === 'RD') currentStageStatuses.rd = 'RD_UPLOADED';
          if (assignedStage === 'ID') currentStageStatuses.id = 'ID_UPLOADED';
          return {
            ...obj,
            scenarios: {
              ...obj.scenarios,
              stage_statuses: currentStageStatuses,
            },
            stats: {
              ...obj.stats,
              suspicions_count: COMPREHENSIVE_SUSPICIONS_CATALOG.length,
            },
          };
        })
      );
    }

    if (suspicions.length === 0) {
      setSuspicions(COMPREHENSIVE_SUSPICIONS_CATALOG);
    }

    addAuditEntry(
      'DOCUMENT_CLASSIFIED_AUTO',
      `Файл «${file.name}» определен как ${classification.stageName} (точность ${Math.round(classification.confidence * 100)}%). ${classification.primaryReason}`
    );

    setWorkflowNotice({
      step: 2,
      title: `Документ загружен: ${classification.stageName}`,
      message: `Файл «${file.name}» определен как стадия «${assignedStage}» (${classification.gostStandardRef}). ${
        assignedStage === 'PD'
          ? 'Назначен эталоном проекта! Замечаний в эталоне нет.'
          : 'Документ загружен и готов к верификации с эталоном.'
      }`,
      objectName: file.name,
    });

    // Immediately switch to the second section (Верификация протокола)
    setActiveTab('inspection');
  };

  const handleQuickAddStage = (stage: 'PD' | 'RD' | 'ID') => {
    const stageNames: Record<'PD' | 'RD' | 'ID', { code: string; title: string; sample: string }> = {
      PD: { code: 'ПД', title: 'Проектная документация (Эталон)', sample: 'ПД-2026-АР_Эталон_проекта_Мосгосэкспертиза.pdf' },
      RD: { code: 'РД', title: 'Рабочая документация (В производство)', sample: 'РД-2026-04.266-АР1_Рабочие_чертежи_в_производство.pdf' },
      ID: { code: 'ИД', title: 'Исполнительная документация (АОСР и геодезия)', sample: 'ИД-2026-АОСР-01_Акты_скрытых_работ_и_геодезия.pdf' },
    };

    const info = stageNames[stage];

    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id !== selectedObjectId) return obj;
        const currentStageStatuses = { ...obj.scenarios.stage_statuses };
        if (stage === 'PD') currentStageStatuses.pd = 'PD_UPLOADED';
        if (stage === 'RD') currentStageStatuses.rd = 'RD_UPLOADED';
        if (stage === 'ID') currentStageStatuses.id = 'ID_UPLOADED';
        return {
          ...obj,
          scenarios: {
            ...obj.scenarios,
            stage_statuses: currentStageStatuses,
          },
          stats: {
            ...obj.stats,
            suspicions_count: COMPREHENSIVE_SUSPICIONS_CATALOG.length,
          },
        };
      })
    );

    setUploadedPdfs((prev) => {
      if (prev.some((p) => p.stage === stage)) return prev;
      return [
        {
          id: `sample-${stage.toLowerCase()}-${Date.now()}`,
          name: info.sample,
          blobUrl: '',
          sizeMb: 5.4,
          stage: stage,
          uploadedAt: 'Только что',
        },
        ...prev,
      ];
    });

    if (suspicions.length === 0) {
      setSuspicions(COMPREHENSIVE_SUSPICIONS_CATALOG);
    }

    addAuditEntry(
      'STAGE_DOCUMENT_ADDED',
      `К объекту добавлена документация стадии «${info.code}» (${info.title}).`
    );
  };

  const handleQuickCompleteAllStages = () => {
    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id !== selectedObjectId) return obj;
        return {
          ...obj,
          scenarios: {
            ...obj.scenarios,
            stage_statuses: {
              pd: 'PD_UPLOADED',
              rd: 'RD_UPLOADED',
              id: 'ID_UPLOADED',
            },
          },
          stats: {
            ...obj.stats,
            total_params_checked: 132,
            suspicions_count: COMPREHENSIVE_SUSPICIONS_CATALOG.length,
          },
        };
      })
    );

    setUploadedPdfs((prev) => {
      const hasPd = prev.some((p) => p.stage === 'PD');
      const hasRd = prev.some((p) => p.stage === 'RD');
      const hasId = prev.some((p) => p.stage === 'ID');
      const newItems = [...prev];
      if (!hasPd) {
        newItems.push({
          id: `demo-pd-${Date.now()}`,
          name: 'ПД-2026-АР_Эталон_проекта_Мосгосэкспертиза.pdf',
          blobUrl: '',
          sizeMb: 8.4,
          stage: 'PD',
          uploadedAt: 'Только что',
        });
      }
      if (!hasRd) {
        newItems.push({
          id: `demo-rd-${Date.now()}`,
          name: 'РД-2026-04.266-АР1_Рабочие_чертежи_в_производство.pdf',
          blobUrl: '',
          sizeMb: 12.1,
          stage: 'RD',
          uploadedAt: 'Только что',
        });
      }
      if (!hasId) {
        newItems.push({
          id: `demo-id-${Date.now()}`,
          name: 'ИД-2026-АОСР-01_Акты_скрытых_работ_и_геодезия.pdf',
          blobUrl: '',
          sizeMb: 6.2,
          stage: 'ID',
          uploadedAt: 'Только что',
        });
      }
      return newItems;
    });

    if (suspicions.length === 0) {
      setSuspicions(COMPREHENSIVE_SUSPICIONS_CATALOG);
    }

    addAuditEntry(
      'PACKAGE_COMPLETED',
      'Загружен полный комплект строительной документации этапа: ПД (проект), РД (рабочая) и ИД (исполнительная).'
    );
  };

  const handleSelectUploadedPdf = (fileId: string) => {
    const found = uploadedPdfs.find((f) => f.id === fileId);
    if (found) {
      setActivePdfBlobUrl(found.blobUrl);
      setActivePdfName(found.name);
      setActivePdfSizeMb(found.sizeMb);
    }
  };

  const handleDeleteUploadedPdf = (fileId: string) => {
    setUploadedPdfs((prev) => {
      const filtered = prev.filter((f) => f.id !== fileId);
      if (filtered.length > 0) {
        setActivePdfBlobUrl(filtered[0].blobUrl);
        setActivePdfName(filtered[0].name);
        setActivePdfSizeMb(filtered[0].sizeMb);
      } else {
        setActivePdfBlobUrl('');
        setActivePdfName('');
        setActivePdfSizeMb(0);
      }
      return filtered;
    });
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
  const handleUploadSuccess = (
    filesCount: number,
    uploadedFiles?: Array<{
      id: string;
      name: string;
      sizeMb: number;
      format: string;
      stage: any;
      fileObject?: File;
      blobUrl?: string;
    }>
  ) => {
    if (uploadedFiles && uploadedFiles.length > 0) {
      const pdfFiles = uploadedFiles.filter(
        (f) =>
          f.name.toLowerCase().endsWith('.pdf') ||
          f.format === 'PDF' ||
          (f.fileObject && f.fileObject.type === 'application/pdf')
      );

      if (pdfFiles.length > 0) {
        const newPdfItems: UploadedPdfMetadata[] = pdfFiles.map((pf) => ({
          id: pf.id,
          name: pf.name,
          blobUrl: pf.blobUrl || (pf.fileObject ? URL.createObjectURL(pf.fileObject) : ''),
          sizeMb: pf.sizeMb,
          stage: pf.stage as any,
          uploadedAt: 'Только что',
        }));

        setUploadedPdfs((prev) => [...newPdfItems, ...prev]);

        if (newPdfItems[0]?.blobUrl) {
          setActivePdfBlobUrl(newPdfItems[0].blobUrl);
          setActivePdfName(newPdfItems[0].name);
          setActivePdfSizeMb(newPdfItems[0].sizeMb);
        }
      }
    }

    const hasPd = uploadedFiles?.some((f) => f.stage === 'PD');
    const hasRd = uploadedFiles?.some((f) => f.stage === 'RD');
    const hasId = uploadedFiles?.some((f) => f.stage === 'ID');

    // Only report violations if protocol actually contains findings
    const actualViolationsCount = protocol.findings.filter(
      (f) => f.finding_status === 'CONFIRMED_VIOLATION'
    ).length;
    const actualCandidatesCount = protocol.findings.filter(
      (f) => f.finding_status === 'CANDIDATE'
    ).length;
    const objectStatus = actualViolationsCount > 0 ? 'RED' : 'GREEN';

    // If no object exists yet, automatically create one
    if (objects.length === 0 || !objects.some((o) => o.id === selectedObjectId)) {
      const primaryFile = uploadedFiles?.[0];
      const detectedName = primaryFile?.name
        ? primaryFile.name.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ')
        : 'Новый объект строительства';

      const newObj: ConstructionObject = {
        id: `obj-${Date.now()}`,
        name: detectedName,
        address: 'г. Москва (адрес по ГПЗУ)',
        customer: 'Заказчик строительства',
        contractor: 'Генеральная подрядная организация',
        permit_number: 'РНС-77-2026',
        status: objectStatus,
        active_protocol_id: protocol.id,
        created_at: new Date().toISOString(),
        scenarios: {
          upload_scenario: hasPd && (hasRd || hasId) ? 'FULL' : 'PD_RD_ONLY',
          stage_statuses: {
            pd: hasPd ? 'PD_UPLOADED' : 'PD_MISSING',
            rd: hasRd ? 'RD_UPLOADED' : 'RD_MISSING',
            id: hasId ? 'ID_UPLOADED' : 'ID_MISSING',
          },
        },
        stats: {
          total_params_checked: hasPd && hasRd ? 132 : 48,
          confirmed_violations: actualViolationsCount,
          candidate_findings: actualCandidatesCount,
          negative_verified: 0,
          clarification_required: 0,
          missing_evidence: 0,
          suspicions_count: 0,
        },
        iais_rin_sync: {
          process_id: `proc-${Date.now()}`,
          ukep_signature: {
            signatory: 'Иванов А.С., Инспектор Мосгосстройнадзора',
            certificate_serial: '00E17A8293DF4B1C90',
            valid_until: '31.12.2026',
            valid: true,
          },
          status: 'PENDING',
        },
      };

      setObjects([newObj]);
      setSelectedObjectId(newObj.id);
    } else {
      setObjects((prev) =>
        prev.map((obj) => {
          if (obj.id === selectedObjectId) {
            return {
              ...obj,
              status: objectStatus,
              scenarios: {
                ...obj.scenarios,
                stage_statuses: {
                  pd: hasPd ? 'PD_UPLOADED' : obj.scenarios.stage_statuses.pd,
                  rd: hasRd ? 'RD_UPLOADED' : obj.scenarios.stage_statuses.rd,
                  id: hasId ? 'ID_UPLOADED' : obj.scenarios.stage_statuses.id,
                },
              },
              stats: {
                ...obj.stats,
                total_params_checked: hasPd && hasRd ? 132 : obj.stats.total_params_checked || 48,
                confirmed_violations: actualViolationsCount,
                candidate_findings: actualCandidatesCount,
              },
            };
          }
          return obj;
        })
      );
    }

    const currentObjName =
      objects.find((o) => o.id === selectedObjectId)?.name ||
      uploadedFiles?.[0]?.name ||
      'Объект';

    addAuditEntry(
      'OBJECT_CHECK_EXECUTED',
      `Для объекта «${currentObjName}» загружено ${filesCount} файлов. Автоматически распознаны стадии документации: ${
        hasPd ? 'ПД (Эталон) ' : ''
      }${hasRd ? 'РД (Рабочая) ' : ''}${hasId ? 'ИД (Исполнительная)' : ''}. Замечаний: ${actualViolationsCount}.`
    );

    if (hasPd && !hasRd && !hasId) {
      setWorkflowNotice({
        step: 2,
        title: 'Эталонный комплект (ПД) успешно загружен',
        message: 'Стадия П утверждена экспертизой. Нарушений в эталоне нет (0 замечаний). Теперь вы можете загрузить комплект РД для автоматической сверки.',
        objectName: currentObjName,
      });
    } else if (actualViolationsCount === 0) {
      setWorkflowNotice({
        step: 3,
        title: 'Проверка завершена: нарушений не обнаружено',
        message: 'Все параметры и контрольные точки проверены. Замечаний и несоответствий нормам 2026 года нет (0 ошибок).',
        objectName: currentObjName,
      });
    } else {
      setWorkflowNotice({
        step: 3,
        title: `Обнаружено ${actualViolationsCount} замечаний`,
        message: 'Обнаруженные отклонения зафиксированы в протоколе и выделены в режиме визуализатора.',
        objectName: currentObjName,
      });
    }

    // Immediately navigate to the 2nd section (Верификация протокола) and close upload modal
    setActiveTab('inspection');
    setIsUploadOpen(false);
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

    const disc = susp.discipline || 'АР';
    const tzCode = susp.tz_requirement_code || `ТЗ-9.5.${susp.suspicion_id}`;
    
    // Map discipline (АР, КР, ОВ, ВК, ЭОМ, СПЗ, ПЗУ, ТХ) to SectionCode
    const sectionMapping: Record<string, SectionCode> = {
      'АР': 'АР',
      'КР': 'КР',
      'КМ': 'КР',
      'КЖ': 'КР',
      'ОВ': 'ИОС1',
      'ВК': 'ИОС2',
      'ЭОМ': 'ИОС3',
      'СПЗ': 'ППМ',
      'ПЗУ': 'СПЗУ',
      'ТХ': 'ТХ',
      'ПЗ': 'ПЗ',
    };
    const validSection: SectionCode = sectionMapping[disc] || 'АР';

    const newFinding: CheckFinding = {
      id: `f-hypo-${susp.suspicion_id}`,
      param_id: susp.suspicion_id,
      object_id: currentObject.id,
      completeness_status: 'COMPLETE',
      param_code: tzCode,
      section: validSection,
      param_name: susp.description.substring(0, 56) + (susp.description.length > 56 ? '...' : ''),
      finding_status: 'CANDIDATE',
      review_priority: susp.review_priority,
      expected_value: susp.pd_reference,
      actual_value: susp.rd_reference,
      delta: 'Выявлено анализом гипотез ИИ (Раздел 9.5 ТЗ)',
      justification: susp.description,
      normative_reference: susp.normative_base,
      evidence_fragments: [
        {
          id: `ev-hypo-${susp.suspicion_id}`,
          file_id: 'file-hypo',
          file_name: `Гипотеза ИИ [${disc}] ${tzCode}`,
          file_hash: 'sha256-hypo',
          stage: 'RD',
          discipline: disc,
          document_code: tzCode,
          revision: 'Изм. 4',
          approval_status: 'APPROVED',
          approval_date: '2026-07-08',
          sheet_page: susp.rd_reference.split(',')[0] || 'Лист 14',
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

  // 11. Role switcher & Registration handler
  const handleSetCurrentRole = (role: UserRole) => {
    setCurrentRole(role);
    const profile = ROLE_PROFILES[role];
    addAuditEntry(
      'ROLE_SWITCH',
      `Вход в систему: ${profile.fullName} (${profile.title}). Сертификат УКЭП: ${profile.certificateSerial}.`
    );
  };

  const handleRegisterCustomUser = (userData: {
    fullName: string;
    role: UserRole;
    department: string;
    certificateNumber: string;
  }) => {
    const targetRole = userData.role;
    ROLE_PROFILES[targetRole].fullName = userData.fullName;
    const parts = userData.fullName.split(' ');
    if (parts.length >= 2) {
      ROLE_PROFILES[targetRole].shortName = `${parts[0]} ${parts[1][0]}.${parts[2] ? ` ${parts[2][0]}.` : ''}`;
    } else {
      ROLE_PROFILES[targetRole].shortName = userData.fullName;
    }
    ROLE_PROFILES[targetRole].department = userData.department;
    ROLE_PROFILES[targetRole].certificateSerial = userData.certificateNumber;

    setCurrentRole(targetRole);

    addAuditEntry(
      'USER_REGISTERED',
      `Зарегистрирован новый сотрудник в реестре надзора: ${userData.fullName} (Роль: ${ROLE_PROFILES[targetRole].badge}, Департамент: ${userData.department}). Выпущен сертификат ГОСТ: ${userData.certificateNumber}.`
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
        onOpenAuth={() => setIsAuthOpen(true)}
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
            currentRole={currentRole}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {activeTab === 'inspection' && (
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
            uploadedPdfBlobUrl={activePdfBlobUrl}
            uploadedPdfFileName={activePdfName}
            uploadedPdfSizeMb={activePdfSizeMb}
            uploadedFilesList={uploadedPdfs}
            onSelectUploadedPdf={handleSelectUploadedPdf}
            onDeleteUploadedPdf={handleDeleteUploadedPdf}
            onUploadNewPdfFile={handleUploadNewPdfFile}
            onQuickCompletePackage={handleQuickCompleteAllStages}
            onQuickAddStage={handleQuickAddStage}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'parsing' && (
          <div className="space-y-4">
            <DrawingParserTab
              uploadedFiles={uploadedPdfs}
              findings={protocol.findings}
              activeFinding={protocol.findings[0]}
              onNavigateToVerification={() => setActiveTab('inspection')}
            />
          </div>
        )}

        {activeTab === 'hypotheses' && (
          <div className="space-y-4">
            <HypothesisTab
              suspicions={suspicions}
              onPromoteToCandidate={handlePromoteToCandidate}
              onDismissSuspicion={handleDismissSuspicion}
              onAddNewHypothesis={handleAddNewHypothesis}
            />
          </div>
        )}

        {activeTab === 'executive_docs' && (
          <div className="space-y-4">
            <ExecutiveDocumentationRegistry
              files={uploadedPdfs}
              onSelectDocument={(doc) => {
                const matched = uploadedPdfs.find(
                  (f) => f.name === doc.name || (doc.blobUrl && f.blobUrl === doc.blobUrl)
                );
                if (matched) {
                  handleSelectUploadedPdf(matched.id);
                  setActiveTab('inspection');
                } else {
                  setActiveTab('inspection');
                }
              }}
              onUploadExecutiveDoc={() => {
                setIsIncrementalUpload(false);
                setIsUploadOpen(true);
              }}
              onDeleteDocument={(docId, docName) => {
                const matched = uploadedPdfs.find(
                  (f) => f.id === docId || f.name === docName
                );
                if (matched) {
                  handleDeleteUploadedPdf(matched.id);
                }
              }}
            />
          </div>
        )}

        {activeTab === 'matrix' && <Matrix132Tab />}

        {activeTab === 'iais_rin' && (
          <IaisRinTab
            currentObject={currentObject}
            protocol={protocol}
            onUpdateSyncStatus={(status) => {
              setObjects((prev) =>
                prev.map((obj) =>
                  obj.id === currentObject.id
                    ? {
                        ...obj,
                        iais_rin_sync: {
                          ...obj.iais_rin_sync,
                          status,
                        },
                      }
                    : obj
                )
              );
              setProtocol((prev) => ({
                ...prev,
                iais_sync_status: status as any,
              }));
              addAuditEntry(
                'IAIS_RIN_SYNC_STATUS',
                `Статус шлюза ИАИС «РиН» изменен на: ${status} (Процесс: ${currentObject.iais_rin_sync.process_id}).`
              );
            }}
          />
        )}

        {activeTab === 'ml_repo' && (
          <MLRepositoryTab currentRole={currentRole} />
        )}

        {(activeTab === 'ml_gold' || activeTab === 'ml_retrain') && (
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

      {/* 4. Unified Auth & Role Selection Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentRole={currentRole}
        onSelectRole={(role) => handleSetCurrentRole(role)}
        onRegisterCustomUser={handleRegisterCustomUser}
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
