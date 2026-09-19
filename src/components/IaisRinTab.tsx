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
  KeyRound
} from 'lucide-react';
import { ConstructionObject, InspectionProtocol } from '../types';

interface IaisRinTabProps {
  currentObject: ConstructionObject;
  protocol: InspectionProtocol;
}

export const IaisRinTab: React.FC<IaisRinTabProps> = ({
  currentObject,
  protocol,
}) => {
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([
    '09:30:12 [PULL_REQUEST] Запрос от ИАИС «РиН» (process_id: proc-2024-041-998)',
    '09:30:13 [AUTH] Проверка сертификата УКЭП ГОСТ Р 34.10-2012: УСПЕШНО',
    '09:30:14 [GATE] Проверка статуса протокола: FINALIZED (2 нарушения)',
    '09:30:15 [PAYLOAD] Сформирован ответ: 2 предписания переданы в ИАИС «РиН»',
  ]);

  const [activePayloadTab, setActivePayloadTab] = useState<'JSON' | 'PREVIEW'>('PREVIEW');

  // Simulated prescription feedback from IAIS RiN
  const [prescriptions, setPrescriptions] = useState<
    Array<{
      id: string;
      param_code: string;
      doc_number: string;
      issue_date: string;
      deadline: string;
      status: 'ISSUED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXTENDED';
      contractor_reply?: string;
    }>
  >([
    {
      id: 'ПРЕД-2026-00124',
      param_code: 'KR-55',
      doc_number: '№ 77-01/26-КР-01',
      issue_date: '10.02.2026',
      deadline: '28.02.2026',
      status: 'IN_PROGRESS',
      contractor_reply: 'Заказана повторная ультразвуковая дефектоскопия бетона монолитных перекрытий.',
    },
    {
      id: 'ПРЕД-2026-00125',
      param_code: 'AR-41',
      doc_number: '№ 77-01/26-АР-02',
      issue_date: '10.02.2026',
      deadline: '20.02.2026',
      status: 'ISSUED',
      contractor_reply: 'Направлено письмо проектировщику для демонтажа заужающих стоек.',
    },
  ]);

  const isFinalized = protocol.status === 'FINALIZED';
  const hasValidUkep = currentObject.iais_rin_sync.ukep_signature.valid;

  const handleSimulateIaisPull = () => {
    setIsPulling(true);
    setTimeout(() => {
      const timestamp = new Date().toLocaleTimeString('ru-RU');
      setSyncLogs((prev) => [
        `${timestamp} [PULL_REQUEST] Успешная синхронизация с ИАИС «РиН». Статусы предписаний обновлены.`,
        ...prev,
      ]);
      setIsPulling(false);
    }, 1200);
  };

  const getPrescriptionStatusBadge = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">ISSUED (Выдано)</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">IN_PROGRESS (В работе)</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">COMPLETED (Устранено)</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">CANCELLED (Отменено)</span>;
      case 'EXTENDED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">EXTENDED (Продлено)</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const sampleJsonPayload = {
    process_id: currentObject.iais_rin_sync.process_id,
    protocol_id: protocol.id,
    object_id: currentObject.id,
    permit_number: currentObject.permit_number,
    status: protocol.status,
    verification_date: protocol.created_at,
    inspector_ukep: {
      signatory: currentObject.iais_rin_sync.ukep_signature.signatory,
      certificate_serial: currentObject.iais_rin_sync.ukep_signature.certificate_serial,
      valid_until: currentObject.iais_rin_sync.ukep_signature.valid_until,
      standard: 'ГОСТ Р 34.10-2012',
    },
    findings: protocol.findings.map((f) => ({
      param_code: f.param_code,
      param_name: f.param_name,
      status: f.finding_status,
      expected: f.expected_value,
      actual: f.actual_value,
      delta: f.delta,
      normative_basis: f.normative_reference,
    })),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
              Обеспечивает защищенный обмен данными с общегородской системой по pull-модели, проверку усиленной квалифицированной электронной подписи (УКЭП) и автоматическую обратную синхронизацию статусов предписаний.
            </p>
          </div>

          <button
            onClick={handleSimulateIaisPull}
            disabled={isPulling}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isPulling ? 'animate-spin' : ''}`} />
            <span>Выполнить pull-опрос ИАИС «РиН»</span>
          </button>
        </div>

        {/* 3 Verification Gate Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span>Идентификатор процесса:</span>
              <KeyRound className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="font-mono font-bold text-slate-900">
              {currentObject.iais_rin_sync.process_id}
            </div>
            <div className="text-[11px] text-slate-600 mt-1">
              Pull endpoint: /api/v1/iais-rin/status
            </div>
          </div>

          <div
            className={`p-3 rounded-xl border ${
              hasValidUkep
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-rose-50 border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-emerald-900">УКЭП должностного лица:</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="font-semibold text-emerald-950">
              {currentObject.iais_rin_sync.ukep_signature.signatory}
            </div>
            <div className="text-[10px] text-emerald-800 mt-1 font-mono">
              Серийный №: {currentObject.iais_rin_sync.ukep_signature.certificate_serial} (до {currentObject.iais_rin_sync.ukep_signature.valid_until})
            </div>
          </div>

          <div
            className={`p-3 rounded-xl border ${
              isFinalized
                ? 'bg-purple-50/70 border-purple-200'
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
            <div className="font-bold text-slate-900">
              {isFinalized ? 'РАЗРЕШЕНО (Протокол финализирован)' : 'ЗАБЛОКИРОВАНО (Черновик)'}
            </div>
            <div className="text-[11px] text-slate-600 mt-1">
              Пункт 9.6 ТЗ: передача черновиков категорически запрещена
            </div>
          </div>
        </div>
      </div>

      {/* Reverse Prescription Statuses Table */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Обратная синхронизация статусов предписаний из ИАИС «РиН»
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Статусы предписаний, сформированных по результатам подтвержденных нарушений
            </p>
          </div>
          <span className="text-xs text-slate-600">Всего: {prescriptions.length} предписания</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Номер предписания</th>
                <th className="py-2.5 px-3">Код параметра</th>
                <th className="py-2.5 px-3">Дата выдачи</th>
                <th className="py-2.5 px-3">Срок устранения</th>
                <th className="py-2.5 px-3">Статус в ИАИС «РиН»</th>
                <th className="py-2.5 px-3">Ответ застройщика</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prescriptions.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-mono font-bold text-purple-900">{p.id}</td>
                  <td className="py-3 px-3 font-mono font-semibold text-slate-800">{p.param_code}</td>
                  <td className="py-3 px-3 text-slate-600">{p.issue_date}</td>
                  <td className="py-3 px-3 text-slate-800 font-medium">{p.deadline}</td>
                  <td className="py-3 px-3">{getPrescriptionStatusBadge(p.status)}</td>
                  <td className="py-3 px-3 text-slate-600 text-[11px] max-w-xs">{p.contractor_reply}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload & Sync Logs Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* OpenAPI Payload Preview */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-purple-700" />
                Сформированный payload для ИАИС «РиН» (JSON)
              </span>
              <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                OpenAPI 3.0 / REST
              </span>
            </div>

            <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] h-64 overflow-y-auto leading-relaxed border border-slate-800">
              {JSON.stringify(sampleJsonPayload, null, 2)}
            </pre>
          </div>

          <div className="mt-3 text-[11px] text-slate-600">
            Содержит полную доказательную группу: объект + параметр + ссылки на листы ПД/РД/ИД
          </div>
        </div>

        {/* Sync Telemetry Logs */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-700" />
                События интеграционной шины (RabbitMQ / Pull)
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">Online</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 h-64 overflow-y-auto font-mono text-xs">
              {syncLogs.map((log, idx) => (
                <div key={idx} className="text-slate-700 text-[11px]">
                  {log}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-600">
            Все обращения сохраняются в журнале аудита с фиксацией IP-адреса шлюза
          </div>
        </div>
      </div>
    </div>
  );
};
