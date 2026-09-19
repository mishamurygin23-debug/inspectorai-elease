import React, { useState } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  Lock,
  UserCheck,
  Calendar,
  FileCheck2
} from 'lucide-react';
import { AuditLogEntry } from '../types';

interface AuditLogTabProps {
  logs: AuditLogEntry[];
}

export const AuditLogTab: React.FC<AuditLogTabProps> = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (selectedAction !== 'ALL' && log.action !== selectedAction) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.user_name.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        (log.target_id && log.target_id.toLowerCase().includes(q)) ||
        log.object_id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CONFIRMED_VIOLATION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">CONFIRM_VIOLATION</span>;
      case 'REJECT_FINDING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">REJECT_FINDING</span>;
      case 'FINALIZE_PROTOCOL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">FINALIZE</span>;
      case 'UNLOCK_PROTOCOL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">SUPERVISOR_UNLOCK</span>;
      case 'INCREMENTAL_UPLOAD':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">UPLOAD_FILES</span>;
      case 'SYNC_IAIS_RIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">IAIS_PULL_SYNC</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
              <History className="w-3.5 h-3.5 text-purple-700" />
              <span>Модуль 9 ТЗ • Неизменяемый журнал аудита действий (WORM-хранилище)</span>
            </div>
            <h2 className="text-xl font-black text-slate-900">
              Журнал событий и контроль версий протоколов проверок
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Все действия инспекторов, супервизоров и интеграционных служб протоколируются с фиксацией user_id, временной метки (timestamp), IP-адреса и криптографического следа изменений в соответствии с 149-ФЗ и 187-ФЗ.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-800">WORM целостность: ОК</span>
          </div>
        </div>

        {/* Filter */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Поиск по инспектору, объекту, описанию действия..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
            >
              <option value="ALL">Все типы событий</option>
              <option value="CONFIRMED_VIOLATION">Подтверждение нарушения</option>
              <option value="REJECT_FINDING">Отклонение (NEGATIVE_VERIFIED)</option>
              <option value="FINALIZE_PROTOCOL">Финализация протокола</option>
              <option value="UNLOCK_PROTOCOL">Отмена финализации супервизором</option>
              <option value="INCREMENTAL_UPLOAD">Инкрементальная загрузка</option>
              <option value="SYNC_IAIS_RIN">Синхронизация ИАИС «РиН»</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Дата и время</th>
                <th className="py-2.5 px-3">Пользователь / Роль</th>
                <th className="py-2.5 px-3">Тип действия</th>
                <th className="py-2.5 px-3">Идентификатор цели</th>
                <th className="py-2.5 px-3">Подробности действия</th>
                <th className="py-2.5 px-3">IP-адрес</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('ru-RU')}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{log.user_name}</div>
                    <div className="text-[10px] text-purple-700 font-mono">{log.role}</div>
                  </td>
                  <td className="py-3 px-3">{getActionBadge(log.action)}</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-700">{log.target_id || log.object_id}</td>
                  <td className="py-3 px-3 text-slate-700 max-w-md">{log.details}</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
