import React, { useState } from 'react';
import {
  Share2,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileCode,
  Download,
  ExternalLink,
  Clock,
  KeyRound,
  Play,
  RotateCcw,
  Layers,
  Send,
  Code,
  FileText,
  BadgeCheck,
  AlertCircle,
  Copy,
  Check,
  Plus,
  Edit2
} from 'lucide-react';
import { ConstructionObject, InspectionProtocol } from '../types';

interface IaisRinTabProps {
  currentObject: ConstructionObject;
  protocol: InspectionProtocol;
  onUpdateSyncStatus?: (status: 'SYNCED' | 'PENDING' | 'PENDING_SYNC' | 'NOT_SYNCED' | 'ERROR') => void;
}

export type MandateStatus = 'ISSUED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXTENDED';

export interface PrescriptionItem {
  id: string;
  param_code: string;
  param_name: string;
  doc_number: string;
  issue_date: string;
  deadline: string;
  status: MandateStatus;
  contractor_reply?: string;
  discipline: string;
  inspector_name: string;
}

export const IaisRinTab: React.FC<IaisRinTabProps> = ({
  currentObject,
  protocol,
  onUpdateSyncStatus,
}) => {
  // Navigation sub-tabs within Module 6
  const [activeSubTab, setActiveSubTab] = useState<'OVERVIEW' | 'OPENAPI_CONSOLE' | 'BACKOFF_SIMULATOR' | 'CRYPTO_UKEP' | 'PRESCRIPTIONS'>('OVERVIEW');

  // Sync state
  const [syncStatus, setSyncStatus] = useState<'SYNCED' | 'PENDING' | 'PENDING_SYNC' | 'NOT_SYNCED' | 'ERROR'>(
    (currentObject.iais_rin_sync.status as any) || 'SYNCED'
  );
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Sync Logs
  const [syncLogs, setSyncLogs] = useState<string[]>([
    '09:30:12 [PULL_REQUEST] Запрос от ИАИС «РиН» (process_id: ' + (currentObject.iais_rin_sync.process_id || 'proc-2026-001') + ')',
    '09:30:13 [AUTH] Проверка сертификата УКЭП ГОСТ Р 34.10-2012 / ГОСТ Р 34.11-2012: ВАЛИДЕН',
    '09:30:14 [GATE] Проверка статуса протокола: ' + (protocol.status === 'FINALIZED' ? 'FINALIZED (Доступ открыт)' : 'DRAFT (Заблокировано)'),
    '09:30:15 [PAYLOAD] Сформирован ответ: передано нарушений и доказательных фрагментов в ИАИС «РиН»',
  ]);

  // Exponential backoff simulator state
  const [backoffStep, setBackoffStep] = useState<number>(0);
  const [isSimulatingBackoff, setIsSimulatingBackoff] = useState<boolean>(false);
  const [backoffLogs, setBackoffLogs] = useState<string[]>([]);

  // OpenAPI Console state
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('GET_INSPECTION');
  const [consoleResponse, setConsoleResponse] = useState<{
    status: number;
    statusText: string;
    durationMs: number;
    headers: Record<string, string>;
    body: any;
  } | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState<boolean>(false);

  // Prescriptions list
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([
    {
      id: 'ПРЕД-2026-00124',
      param_code: 'KR-55',
      param_name: 'Класс прочности бетона монолитного перекрытия',
      doc_number: '№ 77-01/26-КР-01',
      issue_date: '10.02.2026',
      deadline: '28.02.2026',
      status: 'IN_PROGRESS',
      contractor_reply: 'Заказана повторная ультразвуковая дефектоскопия бетона монолитных перекрытий лабораторией НИИЖБ.',
      discipline: 'КР',
      inspector_name: 'Иванов А.С.',
    },
    {
      id: 'ПРЕД-2026-00125',
      param_code: 'AR-41',
      param_name: 'Ширина путей эвакуации и габариты коридоров',
      doc_number: '№ 77-01/26-АР-02',
      issue_date: '10.02.2026',
      deadline: '20.02.2026',
      status: 'ISSUED',
      contractor_reply: 'Направлено обращение генеральному проектировщику для согласования демонтажа заужающих стоек.',
      discipline: 'АР',
      inspector_name: 'Иванов А.С.',
    },
    {
      id: 'ПРЕД-2026-00126',
      param_code: 'IOS-12',
      param_name: 'Сечение магистральных воздуховодов дымоудаления',
      doc_number: '№ 77-01/26-ОВ-01',
      issue_date: '05.02.2026',
      deadline: '18.02.2026',
      status: 'COMPLETED',
      contractor_reply: 'Смонтированы проектные воздуховоды 1000х600 с огнезащитным покрытием EI 120. Акт освидетельствования АОСР-ОВ-04 приложен.',
      discipline: 'ИОС1',
      inspector_name: 'Смирнов В.П.',
    },
  ]);

  // Edit prescription modal / state
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<MandateStatus>('IN_PROGRESS');
  const [editReply, setEditReply] = useState<string>('');

  // New prescription form state
  const [isNewPrescriptionModalOpen, setIsNewPrescriptionModalOpen] = useState<boolean>(false);
  const [newParamCode, setNewParamCode] = useState<string>('SPZU-03');
  const [newParamName, setNewParamName] = useState<string>('Пожарный проезд и разворотная площадка');
  const [newDeadline, setNewDeadline] = useState<string>('15.03.2026');
  const [newDiscipline, setNewDiscipline] = useState<string>('СПЗУ');

  const isFinalized = protocol.status === 'FINALIZED';
  const hasValidUkep = currentObject.iais_rin_sync.ukep_signature.valid;

  // 1. Live Pull Request Simulation
  const handleSimulateIaisPull = () => {
    setIsPulling(true);
    const timeStart = new Date().toLocaleTimeString('ru-RU');
    
    setTimeout(() => {
      const timestamp = new Date().toLocaleTimeString('ru-RU');
      if (!isFinalized) {
        setSyncLogs((prev) => [
          `${timestamp} [GATE_REJECT] HTTP 422 Unprocessable Entity: Протокол находится в статусе «${protocol.status}». Выгрузка черновиков запрещена п. 9.6 ТЗ!`,
          ...prev,
        ]);
        setSyncStatus('ERROR');
        onUpdateSyncStatus?.('ERROR');
      } else {
        setSyncLogs((prev) => [
          `${timestamp} [PULL_SUCCESS] HTTP 200 OK: ИАИС «РиН» успешно выгрузила финализированный протокол (ID: ${protocol.id}). Статусы предписаний синхронизированы.`,
          ...prev,
        ]);
        setSyncStatus('SYNCED');
        onUpdateSyncStatus?.('SYNCED');
      }
      setIsPulling(false);
    }, 1000);
  };

  // 2. Exponential Backoff & Retry Simulation
  const handleRunExponentialBackoff = async () => {
    setIsSimulatingBackoff(true);
    setBackoffStep(1);
    setSyncStatus('PENDING_SYNC');
    onUpdateSyncStatus?.('PENDING_SYNC');
    
    setBackoffLogs([
      `[T+0.0s] [Попытка 1/4] GET /api/v1/inspection/${currentObject.iais_rin_sync.process_id} -> 503 Service Unavailable (Внешний шлюз ИАИС «РиН» временно недоступен).`,
    ]);

    // Delay 2s (Attempt 2)
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setBackoffStep(2);
    setBackoffLogs((prev) => [
      `[T+2.0s] [Попытка 2/4] Задержка 2.0с. Повторный запрос -> 504 Gateway Timeout. Очередь RabbitMQ переполнена.`,
      ...prev,
    ]);

    // Delay 4s (Attempt 3 -> PENDING_SYNC)
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setBackoffStep(3);
    setBackoffLogs((prev) => [
      `[T+5.0s] [Попытка 3/4] Задержка 4.0с. Перевод процесса в буфер отложенной доставки [PENDING_SYNC] согласно п. 9.6 ТЗ. Данные сохранены в локальном контуре.`,
      ...prev,
    ]);

    // Delay 8s (Attempt 4 -> Recovery 200 OK)
    await new Promise((resolve) => setTimeout(resolve, 3500));
    setBackoffStep(4);
    setSyncStatus('SYNCED');
    onUpdateSyncStatus?.('SYNCED');
    setBackoffLogs((prev) => [
      `[T+8.5s] [Попытка 4/4] Задержка 8.0с. Соединение с ИАИС «РиН» восстановлено! HTTP 200 OK: Все пакеты и предписания успешно приняты. Статус: SYNCED.`,
      ...prev,
    ]);
    setIsSimulatingBackoff(false);
  };

  // 3. OpenAPI Request Execution
  const handleExecuteOpenApiConsole = () => {
    setIsSendingRequest(true);
    setConsoleResponse(null);

    setTimeout(() => {
      setIsSendingRequest(false);

      if (selectedEndpoint === 'POST_DOCUMENTS_UPLOAD') {
        setConsoleResponse({
          status: 201,
          statusText: 'Created',
          durationMs: 245,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'x-process-id': currentObject.iais_rin_sync.process_id || 'proc-2026-001',
            'x-manifest-hash': protocol.input_manifest_hash || 'sha256-e9b4a1c...',
            'x-eqes-verified': 'true',
          },
          body: {
            status: 'ACCEPTED',
            process_id: currentObject.iais_rin_sync.process_id,
            uploaded_files_count: 3,
            message: 'Манифест проектной документации принят на валидацию и распределен по разделам ПП РФ № 87.',
            stages_detected: ['PD', 'RD', 'ID'],
            queue_position: 1,
            estimated_ocr_sec: 4.2,
          },
        });
      } else if (selectedEndpoint === 'GET_INSPECTION') {
        if (!isFinalized) {
          setConsoleResponse({
            status: 422,
            statusText: 'Unprocessable Entity',
            durationMs: 82,
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'x-gate-rule': 'TZ-9.6-DRAFT-PROHIBITED',
            },
            body: {
              error_code: 'ERR_PROTOCOL_NOT_FINALIZED',
              error_message: 'Доступ заблокирован: выгрузка предварительных черновиков в городскую систему запрещена. Протокол должен быть утвержден инспектором и подписан УКЭП.',
              current_protocol_status: protocol.status,
              required_status: 'FINALIZED',
            },
          });
        } else {
          setConsoleResponse({
            status: 200,
            statusText: 'OK',
            durationMs: 114,
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'x-eqes-signer': currentObject.iais_rin_sync.ukep_signature.signatory,
              'x-eqes-serial': currentObject.iais_rin_sync.ukep_signature.certificate_serial,
              'x-timestamp-tsp': new Date().toISOString(),
            },
            body: {
              process_id: currentObject.iais_rin_sync.process_id,
              protocol_id: protocol.id,
              object_id: currentObject.id,
              permit_number: currentObject.permit_number,
              status: protocol.status,
              matrix_version: protocol.matrix_version || '1.0',
              model_version: protocol.model_version || 'v2.4',
              findings_count: protocol.findings.length,
              findings: protocol.findings.map((f) => ({
                param_code: f.param_code,
                param_name: f.param_name,
                section: f.section,
                finding_status: f.finding_status,
                review_priority: f.review_priority,
                expected: f.expected_value,
                actual: f.actual_value,
                delta: f.delta,
                normative_reference: f.normative_reference,
                evidence_count: f.evidence_fragments?.length || 0,
              })),
            },
          });
        }
      } else if (selectedEndpoint === 'GET_PRESCRIPTIONS') {
        setConsoleResponse({
          status: 200,
          statusText: 'OK',
          durationMs: 96,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'x-total-count': String(prescriptions.length),
          },
          body: {
            process_id: currentObject.iais_rin_sync.process_id,
            total: prescriptions.length,
            items: prescriptions,
          },
        });
      } else if (selectedEndpoint === 'POST_PRESCRIPTION') {
        setConsoleResponse({
          status: 201,
          statusText: 'Created',
          durationMs: 180,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'x-mandate-id': 'ПРЕД-2026-00127',
          },
          body: {
            status: 'ISSUED',
            mandate_id: 'ПРЕД-2026-00127',
            issued_at: new Date().toISOString(),
            deadline: '2026-03-25T18:00:00Z',
            notified_parties: [currentObject.customer, currentObject.contractor],
          },
        });
      } else if (selectedEndpoint === 'GET_OPENAPI_SPEC') {
        setConsoleResponse({
          status: 200,
          statusText: 'OK',
          durationMs: 45,
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
          body: {
            openapi: '3.0.3',
            info: {
              title: 'Интеграционный шлюз ИАИС «Разрешения и Надзор» — Инспектор ИИ',
              version: '1.0.0',
              description: 'Шлюз автоматизированного информационного взаимодействия Мосгосстройнадзора (Раздел 9.6 ТЗ 2026).',
            },
            paths: {
              '/api/v1/documents/upload': { post: { summary: 'Прием проектной и рабочей документации' } },
              '/api/v1/inspection/{process_id}': { get: { summary: 'Pull-получение результатов верификации' } },
              '/api/v1/inspection/{process_id}/prescriptions': {
                get: { summary: 'Реестр предписаний' },
                post: { summary: 'Формирование предписания' },
              },
            },
          },
        });
      }
    }, 450);
  };

  const getPrescriptionStatusBadge = (status: MandateStatus) => {
    switch (status) {
      case 'ISSUED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">ISSUED (Выдано)</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">IN_PROGRESS (В работе)</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">COMPLETED (Устранено)</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">CANCELLED (Отменено)</span>;
      case 'EXTENDED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">EXTENDED (Продлено)</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const handleSavePrescriptionEdit = () => {
    if (!editingPrescriptionId) return;
    setPrescriptions((prev) =>
      prev.map((p) =>
        p.id === editingPrescriptionId
          ? {
              ...p,
              status: editStatus,
              contractor_reply: editReply || p.contractor_reply,
            }
          : p
      )
    );
    setEditingPrescriptionId(null);
  };

  const handleAddNewPrescription = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `ПРЕД-2026-00${120 + prescriptions.length + 1}`;
    const docNo = `№ 77-01/26-${newDiscipline}-${String(prescriptions.length + 1).padStart(2, '0')}`;
    const newPrescription: PrescriptionItem = {
      id: newId,
      param_code: newParamCode,
      param_name: newParamName,
      doc_number: docNo,
      issue_date: new Date().toLocaleDateString('ru-RU'),
      deadline: newDeadline,
      status: 'ISSUED',
      discipline: newDiscipline,
      inspector_name: currentObject.iais_rin_sync.ukep_signature.signatory || 'Иванов А.С.',
      contractor_reply: 'Предписание направлено генеральному подрядчику через личный кабинет ИАИС «РиН».',
    };
    setPrescriptions((prev) => [newPrescription, ...prev]);
    setIsNewPrescriptionModalOpen(false);
  };

  const handleCopyJson = (obj: any) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadOpenApiJson = () => {
    const spec = {
      openapi: '3.0.3',
      info: {
        title: 'Шлюз интеграции ИАИС «Разрешения и Надзор» — Инспектор ИИ',
        version: '1.0.0',
        description: 'Техническое задание «Инспектор ИИ» (Раздел 9.6).',
      },
      servers: [{ url: 'https://ais-inspect.stroinadzor.mos.ru/api/v1' }],
      paths: {
        '/documents/upload': {
          post: {
            summary: 'Прием манифеста и пакета документов',
            requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
            responses: { '201': { description: 'Успешная загрузка' } },
          },
        },
        '/inspection/{process_id}': {
          get: {
            summary: 'Pull-запрос результатов проверки инспектора',
            parameters: [{ name: 'process_id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              '200': { description: 'Протокол финализирован и передан' },
              '422': { description: 'Черновик (передача запрещена)' },
            },
          },
        },
        '/inspection/{process_id}/prescriptions': {
          get: { summary: 'Получение списка предписаний' },
          post: { summary: 'Выдача предписания' },
        },
      },
    };
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openapi-iais-rin-v1.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Main Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
              <Share2 className="w-3.5 h-3.5 text-purple-700" />
              <span>Модуль 6 & Раздел 9.6 ТЗ • Шлюз интеграции с ИАИС «РиН»</span>
            </div>
            <h2 className="text-xl font-black text-slate-900">
              Интеграционный шлюз ИАИС «Разрешения и Надзор» (Мосгосстройнадзор)
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Полнофункциональный шлюз информационного обмена по <strong>pull-модели (REST over HTTPS, OpenAPI 3.0)</strong>, криптографическая проверка усиленной квалифицированной электронной подписи (УКЭП ГОСТ Р 34.10-2012), механизм повторных попыток с экспоненциальной задержкой (Exponential Backoff) и двусторонняя синхронизация предписаний.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleDownloadOpenApiJson}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer border border-slate-300"
              title="Скачать спецификацию OpenAPI 3.0 (JSON)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>OpenAPI 3.0 JSON</span>
            </button>

            <button
              onClick={handleSimulateIaisPull}
              disabled={isPulling}
              className="px-4 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isPulling ? 'animate-spin' : ''}`} />
              <span>{isPulling ? 'Pull-опрос...' : 'Выполнить pull-опрос'}</span>
            </button>
          </div>
        </div>

        {/* 4 Interactive Gateway Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-slate-100 text-xs">
          {/* 1. Process ID */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="font-semibold">Идентификатор процесса:</span>
              <KeyRound className="w-4 h-4 text-purple-600" />
            </div>
            <div className="font-mono font-bold text-slate-900 text-sm">
              {currentObject.iais_rin_sync.process_id || 'proc-2026-altufievo-001'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              GET /api/v1/inspection/{'{process_id}'}
            </div>
          </div>

          {/* 2. EQES / UKEP */}
          <div
            className={`p-3.5 rounded-xl border ${
              hasValidUkep
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold">УКЭП инспектора:</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="font-semibold text-xs truncate" title={currentObject.iais_rin_sync.ukep_signature.signatory}>
              {currentObject.iais_rin_sync.ukep_signature.signatory || 'Иванов А.С.'}
            </div>
            <div className="text-[10px] text-emerald-800 mt-1 font-mono">
              ГОСТ Р 34.10-2012 (до {currentObject.iais_rin_sync.ukep_signature.valid_until || '31.12.2026'})
            </div>
          </div>

          {/* 3. Gate Status (Draft protection) */}
          <div
            className={`p-3.5 rounded-xl border ${
              isFinalized
                ? 'bg-purple-50/80 border-purple-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900">Шлюз выгрузки (Gate):</span>
              {isFinalized ? (
                <Lock className="w-4 h-4 text-purple-700" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              )}
            </div>
            <div className="font-bold text-slate-900 text-xs">
              {isFinalized ? 'РАЗРЕШЕНО (FINALIZED)' : 'ЗАБЛОКИРОВАНО (DRAFT)'}
            </div>
            <div className="text-[10px] text-slate-600 mt-1">
              Пункт 9.6: передача черновиков запрещена
            </div>
          </div>

          {/* 4. Network Sync State */}
          <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200">
            <div className="flex items-center justify-between text-indigo-900 mb-1">
              <span className="font-bold">Статус синхронизации:</span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  syncStatus === 'SYNCED'
                    ? 'bg-emerald-500 animate-pulse'
                    : syncStatus === 'PENDING_SYNC'
                    ? 'bg-amber-500 animate-ping'
                    : syncStatus === 'ERROR'
                    ? 'bg-rose-500'
                    : 'bg-slate-400'
                }`}
              ></span>
            </div>
            <div className="font-mono font-bold text-indigo-950 text-sm">
              {syncStatus}
            </div>
            <div className="text-[10px] text-indigo-700 mt-1">
              {syncStatus === 'SYNCED'
                ? 'Данные в контуре города'
                : syncStatus === 'PENDING_SYNC'
                ? 'Очередь повторов (Backoff)'
                : 'Ожидает pull-запроса'}
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center space-x-1.5 mt-6 pt-4 border-t border-slate-100 overflow-x-auto">
          {[
            { id: 'OVERVIEW', label: '1. Мониторинг шлюза', icon: Share2 },
            { id: 'OPENAPI_CONSOLE', label: '2. OpenAPI 3.0 Консоль (REST)', icon: Code },
            { id: 'BACKOFF_SIMULATOR', label: '3. Механизм Retry & Backoff', icon: RotateCcw },
            { id: 'CRYPTO_UKEP', label: '4. Валидация УКЭП (ГОСТ)', icon: ShieldCheck },
            { id: 'PRESCRIPTIONS', label: '5. Реестр предписаний (5 статусов)', icon: FileText, count: prescriptions.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-purple-600'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-purple-800 text-white' : 'bg-slate-200 text-slate-800'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-tab 1: OVERVIEW */}
      {activeSubTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Architecture Diagram */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-700" />
                Архитектура взаимодействия по pull-модели (Раздел 9.6 ТЗ)
              </span>
              <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                REST over HTTPS / TLS 1.3
              </span>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 text-white text-xs font-mono space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/90 border border-slate-700">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                  <span className="font-bold text-blue-200">Внешняя система: ИАИС «РиН»</span>
                </div>
                <span className="text-[11px] text-slate-400">Инициатор (Client)</span>
              </div>

              <div className="flex justify-center text-purple-400 text-xs py-1">
                ⬇️ Pull-запрос: GET /api/v1/inspection/{'{process_id}'} (с токеном УКЭП)
              </div>

              <div className="p-2.5 rounded-lg bg-purple-950/80 border border-purple-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-purple-200">Защитный шлюз проверки (Gate)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-800 text-purple-200">
                    Правило ТЗ 9.6
                  </span>
                </div>
                <p className="text-[11px] text-purple-300">
                  1. Валидация УКЭП должностного лица (ГОСТ Р 34.10-2012)<br />
                  2. Проверка статуса: только FINALIZED (черновики DRAFT отсекаются с 422 Unprocessable Entity)<br />
                  3. Проверка WORM-хэша аудита
                </p>
              </div>

              <div className="flex justify-center text-purple-400 text-xs py-1">
                ⬇️ Ответ: 200 OK + JSON Манифест + BBox координаты + Предписания
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-800">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span className="font-bold text-emerald-200">Ядро «Инспектор ИИ» (Сервер)</span>
                </div>
                <span className="text-[11px] text-emerald-300">Статус: {syncStatus}</span>
              </div>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-800">Ключевые регламенты интеграции:</div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li><strong>Формат данных:</strong> JSON / XML в соответствии со спецификацией OpenAPI 3.0</li>
                <li><strong>Аутентификация:</strong> mTLS + Bearer-токен на основе УКЭП (ГОСТ Р 34.10-2012)</li>
                <li><strong>Отказоустойчивость:</strong> при сетевых сбоях переход в статус <code>PENDING_SYNC</code> с экспоненциальным backoff (2с, 4с, 8с)</li>
              </ul>
            </div>
          </div>

          {/* Sync Telemetry Log & Quick Actions */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-700" />
                  События интеграционной шины (RabbitMQ / Event Stream)
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Шлюз активен
                </span>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2 h-72 overflow-y-auto font-mono text-xs text-slate-300">
                {syncLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`text-[11px] p-1.5 rounded ${
                      log.includes('GATE_REJECT')
                        ? 'bg-rose-950/60 text-rose-300 border border-rose-900/50'
                        : log.includes('PULL_SUCCESS')
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-900/50'
                        : 'text-slate-300'
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                Объект: {currentObject.name.substring(0, 35)}...
              </span>
              <button
                onClick={() => setSyncLogs([])}
                className="text-purple-600 hover:text-purple-800 text-[11px] font-bold cursor-pointer"
              >
                Очистить лог
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: OPENAPI_CONSOLE */}
      {activeSubTab === 'OPENAPI_CONSOLE' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Интерактивная консоль тестирования REST API (OpenAPI 3.0)
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Позволяет протестировать выполнение реальных HTTP-запросов интеграционного шлюза со всеми заголовками безопасности.
            </p>

            {/* Endpoint Selector Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { id: 'GET_INSPECTION', method: 'GET', path: '/api/v1/inspection/{process_id}', desc: 'Pull протокола проверки' },
                { id: 'POST_DOCUMENTS_UPLOAD', method: 'POST', path: '/api/v1/documents/upload', desc: 'Загрузка манифеста документации' },
                { id: 'GET_PRESCRIPTIONS', method: 'GET', path: '/api/v1/inspection/{process_id}/prescriptions', desc: 'Реестр выданных предписаний' },
                { id: 'POST_PRESCRIPTION', method: 'POST', path: '/api/v1/inspection/{process_id}/prescriptions', desc: 'Выпуск нового предписания' },
                { id: 'GET_OPENAPI_SPEC', method: 'GET', path: '/api/v1/openapi.json', desc: 'Спецификация OpenAPI 3.0' },
              ].map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => {
                    setSelectedEndpoint(ep.id);
                    setConsoleResponse(null);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center space-x-2 transition-all cursor-pointer border ${
                    selectedEndpoint === ep.id
                      ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                  }`}
                >
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                      ep.method === 'GET'
                        ? selectedEndpoint === ep.id ? 'bg-purple-800 text-purple-200' : 'bg-blue-100 text-blue-800'
                        : selectedEndpoint === ep.id ? 'bg-purple-800 text-purple-200' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span>{ep.path}</span>
                </button>
              ))}
            </div>

            {/* Request Execution Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Request Details */}
              <div className="bg-slate-900 rounded-xl p-4 text-white text-xs font-mono space-y-3 border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-purple-400 font-bold">Параметры HTTP-запроса:</span>
                  <button
                    onClick={handleExecuteOpenApiConsole}
                    disabled={isSendingRequest}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow"
                  >
                    {isSendingRequest ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    <span>{isSendingRequest ? 'Отправка...' : 'Выполнить (Send)'}</span>
                  </button>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px]">URL:</span>
                  <div className="text-emerald-400 font-semibold break-all">
                    https://ais-inspect.stroinadzor.mos.ru/api/v1/
                    {selectedEndpoint === 'GET_INSPECTION'
                      ? `inspection/${currentObject.iais_rin_sync.process_id || 'proc-2026-001'}`
                      : selectedEndpoint === 'POST_DOCUMENTS_UPLOAD'
                      ? 'documents/upload'
                      : selectedEndpoint === 'GET_PRESCRIPTIONS'
                      ? `inspection/${currentObject.iais_rin_sync.process_id || 'proc-2026-001'}/prescriptions`
                      : selectedEndpoint === 'POST_PRESCRIPTION'
                      ? `inspection/${currentObject.iais_rin_sync.process_id || 'proc-2026-001'}/prescriptions`
                      : 'openapi.json'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px]">Заголовки (Headers):</span>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1 text-slate-300">
                    <div>Authorization: Bearer EQES-GOST-R3410-2012-TOKEN</div>
                    <div>Content-Type: application/json; charset=utf-8</div>
                    <div>X-Client-System: IAIS-RIN-MOSCOW-PROD</div>
                    <div>X-Request-ID: req-2026-{Date.now().toString().slice(-6)}</div>
                  </div>
                </div>

                {selectedEndpoint === 'POST_DOCUMENTS_UPLOAD' && (
                  <div>
                    <span className="text-slate-400 text-[10px]">Request Body (JSON):</span>
                    <pre className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] text-purple-300 overflow-x-auto">
{JSON.stringify({
  object_id: currentObject.id,
  permit_number: currentObject.permit_number,
  upload_scenario: currentObject.scenarios.upload_scenario,
  documents: [
    { code: 'ПД-АР', name: 'Архитектурные решения', stage: 'PD', hash: 'sha256-a1...' },
    { code: 'РД-АР', name: 'Рабочие чертежи', stage: 'RD', hash: 'sha256-b2...' }
  ]
}, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Response Panel */}
              <div className="bg-slate-900 rounded-xl p-4 text-white text-xs font-mono space-y-3 border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-purple-400 font-bold">Ответ сервера (Response):</span>
                  {consoleResponse && (
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          consoleResponse.status >= 200 && consoleResponse.status < 300
                            ? 'bg-emerald-900 text-emerald-300 border border-emerald-700'
                            : 'bg-rose-900 text-rose-300 border border-rose-700'
                        }`}
                      >
                        {consoleResponse.status} {consoleResponse.statusText}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        {consoleResponse.durationMs} ms
                      </span>
                    </div>
                  )}
                </div>

                {!consoleResponse ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-2">
                    <Play className="w-8 h-8 text-slate-600" />
                    <span>Нажмите «Выполнить (Send)» для отправки запроса</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <span className="text-slate-400 text-[10px]">Response Headers:</span>
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[10px] text-slate-400 space-y-0.5">
                        {Object.entries(consoleResponse.headers).map(([k, v]) => (
                          <div key={k}>{k}: {v}</div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-400 text-[10px]">Response Body (JSON):</span>
                        <button
                          onClick={() => handleCopyJson(consoleResponse.body)}
                          className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center space-x-1 cursor-pointer"
                        >
                          {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedCode ? 'Скопировано' : 'Копировать'}</span>
                        </button>
                      </div>
                      <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-emerald-300 max-h-56 overflow-y-auto leading-relaxed">
                        {JSON.stringify(consoleResponse.body, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 3: BACKOFF_SIMULATOR */}
      {activeSubTab === 'BACKOFF_SIMULATOR' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold mb-2">
                <RotateCcw className="w-3.5 h-3.5 text-indigo-700" />
                <span>Отказоустойчивость • Экспоненциальный Backoff и статус PENDING_SYNC</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                Симулятор сбоев внешней сети и повторных попыток
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                При временной недоступности серверов ИАИС «РиН» система автоматически активирует механизм повторных попыток с экспоненциальной задержкой (2с &rarr; 4с &rarr; 8с) и фиксирует статус <code>PENDING_SYNC</code>.
              </p>
            </div>

            <button
              onClick={handleRunExponentialBackoff}
              disabled={isSimulatingBackoff}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center space-x-2 cursor-pointer shrink-0"
            >
              <Play className={`w-4 h-4 ${isSimulatingBackoff ? 'animate-spin' : ''}`} />
              <span>{isSimulatingBackoff ? 'Симуляция выполняется...' : 'Запустить тест сбоя и Backoff'}</span>
            </button>
          </div>

          {/* 4 Steps Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            {[
              {
                step: 1,
                title: 'Попытка 1 (0.0с)',
                statusText: 'Сбой 503 Service Unavailable',
                desc: 'Внешний шлюз не ответил в течение таймаута 3000 мс.',
                color: backoffStep >= 1 ? 'border-rose-400 bg-rose-50 text-rose-950' : 'border-slate-200 bg-slate-50',
              },
              {
                step: 2,
                title: 'Попытка 2 (2.0с)',
                statusText: 'Задержка 2с (Retry)',
                desc: 'Повторный запрос: отказ брокера сообщений ИАИС.',
                color: backoffStep >= 2 ? 'border-amber-400 bg-amber-50 text-amber-950' : 'border-slate-200 bg-slate-50',
              },
              {
                step: 3,
                title: 'Попытка 3 (5.0с)',
                statusText: 'Буферизация PENDING_SYNC',
                desc: 'Данные зафиксированы в надежном контуре ожидания.',
                color: backoffStep >= 3 ? 'border-indigo-400 bg-indigo-50 text-indigo-950' : 'border-slate-200 bg-slate-50',
              },
              {
                step: 4,
                title: 'Попытка 4 (8.5с)',
                statusText: 'Успех: 200 OK (SYNCED)',
                desc: 'Канал восстановлен, данные приняты ИАИС «РиН».',
                color: backoffStep >= 4 ? 'border-emerald-400 bg-emerald-50 text-emerald-950' : 'border-slate-200 bg-slate-50',
              },
            ].map((s) => (
              <div key={s.step} className={`p-4 rounded-xl border transition-all ${s.color}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs">{s.title}</span>
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                    {s.step}
                  </span>
                </div>
                <div className="font-bold text-xs mb-1">{s.statusText}</div>
                <p className="text-[11px] text-slate-600 leading-tight">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Backoff Logs */}
          <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-200 space-y-2 border border-slate-800">
            <div className="text-purple-400 font-bold border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>Хронология событий симулятора Backoff:</span>
              <span className="text-[10px] text-slate-400 font-normal">Алгоритм: Full Jitter Exponential Backoff</span>
            </div>
            {backoffLogs.length === 0 ? (
              <div className="text-slate-500 py-3 text-center">
                Нажмите «Запустить тест сбоя и Backoff» для демонстрации сценария отказа сети и автоматического восстановления
              </div>
            ) : (
              backoffLogs.map((log, i) => (
                <div key={i} className="text-[11px] text-slate-300 leading-relaxed">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sub-tab 4: CRYPTO_UKEP */}
      {activeSubTab === 'CRYPTO_UKEP' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Криптографический контур • 63-ФЗ «Об электронной подписи»</span>
            </div>
            <h3 className="text-lg font-black text-slate-900">
              Проверка сертификата усиленной квалифицированной электронной подписи (УКЭП)
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Протоколы проверки имеют юридическую силу только при подписании личной УКЭП должностного лица надзорного органа по ГОСТ Р 34.10-2012 / ГОСТ Р 34.11-2012.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Certificate Details Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-emerald-600" />
                  Реквизиты сертификата ГОСТ
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  ДЕЙСТВИТЕЛЕН
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-slate-500 text-[11px]">Владелец (Subject):</span>
                  <div className="font-bold text-slate-900">{currentObject.iais_rin_sync.ukep_signature.signatory}</div>
                </div>

                <div>
                  <span className="text-slate-500 text-[11px]">Серийный номер сертификата:</span>
                  <div className="font-mono text-purple-900 font-bold">{currentObject.iais_rin_sync.ukep_signature.certificate_serial}</div>
                </div>

                <div>
                  <span className="text-slate-500 text-[11px]">Срок действия:</span>
                  <div className="text-slate-800">с 01.01.2026 по {currentObject.iais_rin_sync.ukep_signature.valid_until}</div>
                </div>

                <div>
                  <span className="text-slate-500 text-[11px]">Удостоверяющий центр (Issuer):</span>
                  <div className="text-slate-800">Удостоверяющий центр Федерального казначейства (Аккредитованный УЦ Минцифры РФ)</div>
                </div>

                <div>
                  <span className="text-slate-500 text-[11px]">Алгоритмы криптографии:</span>
                  <div className="font-mono text-slate-900">ГОСТ Р 34.10-2012 (256 бит), ГОСТ Р 34.11-2012 (Стрибог)</div>
                </div>
              </div>
            </div>

            {/* Validation Checks */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Автоматические проверки безопасности шлюза
              </span>

              <div className="space-y-2.5">
                {[
                  { label: 'Проверка цепочки доверия корневого сертификата Минцифры', ok: true },
                  { label: 'Проверка по спискам отзыва (CRL / OCSP)', ok: true },
                  { label: 'Штамп доверенного времени TSP (RFC 3161)', ok: true },
                  { label: 'Соответствие полномочий профилю (OID 1.2.643.3.61.1.1)', ok: true },
                  { label: 'Защита от передачи черновиков (п. 9.6 ТЗ): статус FINALIZED', ok: isFinalized },
                ].map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-700 text-[11px]">{c.label}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {c.ok ? 'ПРОЙДЕНО' : 'ОШИБКА'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 5: PRESCRIPTIONS */}
      {activeSubTab === 'PRESCRIPTIONS' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Реестр предписаний об устранении нарушений (5 официальных статусов ТЗ)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Обратная синхронизация статусов с ИАИС «РиН»: <code>ISSUED</code>, <code>IN_PROGRESS</code>, <code>COMPLETED</code>, <code>CANCELLED</code>, <code>EXTENDED</code>
              </p>
            </div>

            <button
              onClick={() => setIsNewPrescriptionModalOpen(true)}
              className="px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Выдать предписание</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Номер предписания</th>
                  <th className="py-2.5 px-3">Раздел / Код</th>
                  <th className="py-2.5 px-3">Наименование нарушения</th>
                  <th className="py-2.5 px-3">Срок устранения</th>
                  <th className="py-2.5 px-3">Статус в ИАИС «РиН»</th>
                  <th className="py-2.5 px-3">Ответ застройщика</th>
                  <th className="py-2.5 px-3 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prescriptions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-purple-900">{p.id}</td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] mr-1">
                        {p.discipline}
                      </span>
                      {p.param_code}
                    </td>
                    <td className="py-3 px-3 text-slate-900 font-medium max-w-xs">{p.param_name}</td>
                    <td className="py-3 px-3 text-slate-800 font-semibold">{p.deadline}</td>
                    <td className="py-3 px-3">{getPrescriptionStatusBadge(p.status)}</td>
                    <td className="py-3 px-3 text-slate-600 text-[11px] max-w-xs truncate" title={p.contractor_reply}>
                      {p.contractor_reply || '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setEditingPrescriptionId(p.id);
                          setEditStatus(p.status);
                          setEditReply(p.contractor_reply || '');
                        }}
                        className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Изменить статус
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Prescription Modal */}
      {editingPrescriptionId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Обновление статуса предписания {editingPrescriptionId}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Статус в ИАИС «РиН» (5 статусов ТЗ):</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as MandateStatus)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ISSUED">ISSUED (Выдано застройщику)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (В процессе устранения)</option>
                  <option value="COMPLETED">COMPLETED (Нарушение устранено и подтверждено)</option>
                  <option value="CANCELLED">CANCELLED (Отменено по предписанию суда / надзора)</option>
                  <option value="EXTENDED">EXTENDED (Срок устранения официально продлен)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Комментарий / ответ застройщика:</label>
                <textarea
                  value={editReply}
                  onChange={(e) => setEditReply(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  placeholder="Укажите реквизиты исправленного листа РД или акта АОСР..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setEditingPrescriptionId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleSavePrescriptionEdit}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow cursor-pointer"
              >
                Сохранить статус
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Prescription Modal */}
      {isNewPrescriptionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAddNewPrescription} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Формирование нового предписания в ИАИС «РиН»
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Раздел ПП РФ № 87:</label>
                <select
                  value={newDiscipline}
                  onChange={(e) => setNewDiscipline(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="АР">АР — Архитектурные решения</option>
                  <option value="КР">КР — Конструктивные решения</option>
                  <option value="ИОС1">ИОС1 — Отопление и вентиляция</option>
                  <option value="ИОС2">ИОС2 — Водоснабжение и канализация</option>
                  <option value="ИОС3">ИОС3 — Электроснабжение</option>
                  <option value="СПЗУ">СПЗУ — Схема планировочной организации</option>
                  <option value="ПОС">ПОС — Проект организации строительства</option>
                  <option value="ППМ">ППМ — Противопожарные мероприятия</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Код параметра Матрицы 132:</label>
                <input
                  type="text"
                  value={newParamCode}
                  onChange={(e) => setNewParamCode(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  placeholder="Например: KR-55 или AR-41"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Суть нарушения:</label>
                <input
                  type="text"
                  value={newParamName}
                  onChange={(e) => setNewParamName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  placeholder="Описание несоответствия между ПД и РД"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Срок устранения нарушения:</label>
                <input
                  type="text"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  placeholder="ДД.ММ.ГГГГ"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewPrescriptionModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow cursor-pointer"
              >
                Выдать предписание
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
