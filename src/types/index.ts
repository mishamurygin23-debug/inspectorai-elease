// Основные типы данных в соответствии с Техническим заданием «Инспектор ИИ» (2026 г.)

export type DocStage = 'PD' | 'RD' | 'ID';

export type UploadScenario = 'FULL' | 'PD_RD_ONLY' | 'PD_ID_ONLY' | 'RD_ID_ONLY' | 'SINGLE_ONLY' | 'PARTIALLY_LOADED';

export type ProcessStatus = 'PENDING' | 'PARSING' | 'READY' | 'VERIFYING' | 'COMPLETED' | 'FINALIZED' | 'IN_REVIEW';

export type StageUploadStatus =
  | 'PD_UPLOADED' | 'PD_PARTIAL' | 'PD_MISSING'
  | 'RD_UPLOADED' | 'RD_PARTIAL' | 'RD_MISSING'
  | 'ID_UPLOADED' | 'ID_PARTIAL' | 'ID_MISSING';

export type FindingStatus =
  | 'NEGATIVE_VERIFIED'
  | 'CANDIDATE'
  | 'CONFIRMED_VIOLATION'
  | 'MISSING_EVIDENCE'
  | 'NOT_APPLICABLE'
  | 'NOT_COMPARABLE'
  | 'CLARIFICATION_REQUIRED'
  | 'SUSPICION';

export type ReviewPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type RejectionReasonCode =
  | 'WRONG_REVISION'
  | 'APPROVED_CHANGE'
  | 'OCR_ERROR'
  | 'ALIGNMENT_ERROR'
  | 'PARAMETER_NOT_APPLICABLE'
  | 'EXCEED_TOLERANCE_ACCEPTABLE'
  | 'OTHER';

export type DiscoveryMethod =
  | 'LOGICAL_ANALYSIS'
  | 'SEMANTIC_DISSONANCE'
  | 'NORMATIVE_ANALYSIS'
  | 'ML_PATTERN_ANALYSIS';

export type UserRole = 'INSPECTOR' | 'SUPERVISOR' | 'ML_ENGINEER' | 'ADMIN';

// Раздел ПД по ПП РФ № 87
export type SectionCode =
  | 'ПЗ'
  | 'СПЗУ'
  | 'АР'
  | 'КР'
  | 'ИОС1'
  | 'ИОС2'
  | 'ИОС3'
  | 'ИОС4'
  | 'ИОС5'
  | 'ТХ'
  | 'ПОС'
  | 'ПОД'
  | 'ООС'
  | 'ППМ'
  | 'ОДИ'
  | 'ЗУ'
  | 'СМ'
  | 'ИН';

// Таблица 1: Params (Матрица контроля 132 параметра)
export interface ControlParam {
  id: number;
  code: string; // например 'KR-55', 'AR-41', 'PZ-01'
  section: SectionCode;
  parameter_name: string;
  unit: string;
  source_pd: string;
  source_rd: string;
  source_id: string;
  trigger_logic: string;
  review_priority: ReviewPriority;
  sp_reference: string;
  gost_reference?: string;
  fz_reference?: string;
  other_normative?: string;
  data_type: 'number' | 'string' | 'boolean' | 'coordinate' | 'enum';
  min_value?: number;
  max_value?: number;
  regex_pattern?: string;
  is_active: boolean;
}

// Bounding box / полигон доказательства [0;1]
export interface BBoxPolygonNorm {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  highlightText?: string;
}

// Доказательный фрагмент
export interface EvidenceFragment {
  id: string;
  file_id: string;
  file_name: string;
  file_hash: string;
  stage: DocStage;
  discipline: string;
  document_code: string;
  revision: string;
  approval_status: 'APPROVED' | 'IN_PROGRESS' | 'SUPERSEDED';
  approval_date: string;
  sheet_page: string;
  bbox: BBoxPolygonNorm;
  extracted_value: string;
  role: 'EXPECTED' | 'ACTUAL' | 'CONTROL';
}

// Запись проверки / Finding
export interface CheckFinding {
  id: string;
  param_id: number;
  param_code: string;
  param_name: string;
  section: SectionCode;
  object_id: string;
  expected_value: string;
  actual_value: string;
  delta: string;
  completeness_status: 'COMPLETE' | 'PARTIAL' | 'MISSING';
  finding_status: FindingStatus;
  review_priority: ReviewPriority;
  normative_reference: string;
  evidence_fragments: EvidenceFragment[];
  justification: string;
  inspector_decision?: {
    user_id: string;
    inspector_name: string;
    timestamp: string;
    decision: 'CONFIRMED_VIOLATION' | 'NEGATIVE_VERIFIED' | 'CLARIFICATION_REQUIRED';
    rejection_reason?: RejectionReasonCode;
    comment?: string;
    clarification_details?: string;
  };
  is_atomic?: boolean;
  parent_candidate_id?: string;
}

// Свободный поиск гипотез (Suspicion)
export interface Suspicion {
  suspicion_id: number;
  object_id: string;
  discovery_method: DiscoveryMethod;
  confidence: number;
  description: string;
  pd_reference: string;
  rd_reference: string;
  id_reference?: string;
  review_priority: ReviewPriority;
  normative_base: string;
  finding_status: 'SUSPICION';
  inspector_status: 'PENDING' | 'PROMOTED_TO_CANDIDATE' | 'DISMISSED';
  promoted_finding_id?: string;
}

// Загруженный документ
export interface DocumentFile {
  id: string;
  object_id: string;
  name: string;
  size_mb: number;
  format: 'PDF' | 'DOCX' | 'XML';
  doc_stage: DocStage;
  discipline: string;
  document_code: string;
  revision: string;
  approval_status: 'APPROVED' | 'IN_PROGRESS' | 'SUPERSEDED';
  approval_date: string;
  predecessor_id?: string;
  file_hash: string;
  uploaded_at: string;
  ocr_quality: {
    character_accuracy: number;
    cer: number;
    exact_match: number;
    unreadable_zones_percent: number;
  };
}

// Объект капитального строительства
export interface ConstructionObject {
  id: string;
  name: string;
  address: string;
  customer: string; // Заказчик
  contractor: string; // Генподрядчик
  permit_number: string; // Разрешение на строительство
  status: 'GREEN' | 'YELLOW' | 'RED';
  active_protocol_id: string;
  created_at: string;
  scenarios: {
    upload_scenario: UploadScenario;
    stage_statuses: {
      pd: 'PD_UPLOADED' | 'PD_PARTIAL' | 'PD_MISSING';
      rd: 'RD_UPLOADED' | 'RD_PARTIAL' | 'RD_MISSING';
      id: 'ID_UPLOADED' | 'ID_PARTIAL' | 'ID_MISSING';
    };
  };
  stats: {
    total_params_checked: number;
    confirmed_violations: number;
    candidate_findings: number;
    negative_verified: number;
    clarification_required: number;
    missing_evidence: number;
    suspicions_count: number;
  };
  iais_rin_sync: {
    process_id: string;
    ukep_signature: {
      signatory: string;
      certificate_serial: string;
      valid_until: string;
      valid: boolean;
    };
    status: 'SYNCED' | 'PENDING' | 'ERROR';
  };
  is_verified_and_sent?: boolean;
  verified_and_sent_at?: string;
  sent_report_id?: string;
}

// Протокол проверки
export interface InspectionProtocol {
  id: string;
  object_id: string;
  version: string;
  matrix_version: string;
  dataset_version: string;
  model_version: string;
  input_manifest_hash: string;
  status: ProcessStatus;
  created_at: string;
  finalized_at?: string;
  finalized_by?: string;
  ukep_signature?: string;
  signed_at?: string;
  signed_by?: string;
  iais_sync_status: 'NOT_SYNCED' | 'PENDING_SYNC' | 'SYNCED' | 'ERROR';
  iais_sync_time?: string;
  iais_prescription_status?: 'ISSUED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXTENDED';
  findings: CheckFinding[];
  suspicions: Suspicion[];
}

// Журнал аудита
export interface AuditLogEntry {
  id: string;
  user_id: string;
  user_name: string;
  role: UserRole;
  action: string;
  object_id: string;
  target_id?: string;
  details: string;
  timestamp: string;
  ip_address: string;
  user_agent?: string;
  worm_hash?: string;
}

// Метрики качества ML (Приёмка по разделу 14)
export interface MLMetrics {
  model_version: string;
  dataset_version: string;
  matrix_version: string;
  character_accuracy: number; // порог >= 0.95
  exact_match: number; // порог >= 0.90
  document_linking: number; // порог >= 0.95
  evidence_localization_iou: number; // порог >= 0.95
  precision: number; // порог >= 0.90
  recall: number; // порог >= 0.80
  f1_score: number; // порог >= 0.85
  false_positive_rate: number; // порог <= 0.10
  gold_confirmed_count: number;
  gold_negative_count: number;
  split_stats: {
    train_objects: number;
    validation_objects: number;
    hidden_test_objects: number;
  };
  approval_status: 'APPROVED' | 'IN_REVIEW' | 'REJECTED';
  approved_by?: string;
  deployed_at?: string;
  rollback_to?: string;
}
