import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { getComplete132Params } from '../data/matrix132';
import { ControlParam, SectionCode, ReviewPriority } from '../types';

export const Matrix132Tab: React.FC = () => {
  const allParams = getComplete132Params();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedParam, setSelectedParam] = useState<ControlParam | null>(allParams[0] || null);

  const filteredParams = allParams.filter((param) => {
    if (selectedSection !== 'ALL' && param.section !== selectedSection) return false;
    if (selectedPriority !== 'ALL' && param.review_priority !== selectedPriority) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        param.code.toLowerCase().includes(q) ||
        param.parameter_name.toLowerCase().includes(q) ||
        param.sp_reference.toLowerCase().includes(q) ||
        param.trigger_logic.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getPriorityBadge = (priority: ReviewPriority) => {
    switch (priority) {
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">MEDIUM</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">LOW</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
              <Layers className="w-3.5 h-3.5 text-purple-700" />
              <span>Ядро системы проверки • 132 параметра контроля</span>
            </div>
            <h2 className="text-xl font-black text-slate-900">
              Матрица контроля проектной, рабочей и исполнительной документации
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl">
              Построена на базе ПП РФ № 87, Приказа Минстроя России № 344/пр, СПДС ГОСТ Р 21.101-2020 и актуальных Сводов правил по состоянию на 2026 год.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <div className="text-lg font-black text-purple-700">{allParams.length}</div>
              <div className="text-[10px] text-slate-600">Всего параметров</div>
            </div>
            <div className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <div className="text-lg font-black text-rose-600">
                {allParams.filter((p) => p.review_priority === 'HIGH').length}
              </div>
              <div className="text-[10px] text-slate-600">High Priority</div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Поиск по коду (AR-41, KR-55...), названию или СП..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
            >
              <option value="ALL">Все 17 разделов</option>
              <option value="ПЗ">ПЗ — Пояснительная записка</option>
              <option value="СПЗУ">СПЗУ — Генплан</option>
              <option value="АР">АР — Архитектура</option>
              <option value="КР">КР — Конструктив</option>
              <option value="ИОС1">ИОС1 — Электроснабжение</option>
              <option value="ИОС2">ИОС2 — Водоснабжение</option>
              <option value="ИОС3">ИОС3 — Канализация</option>
              <option value="ИОС4">ИОС4 — Отопление и вентиляция</option>
              <option value="ИОС5">ИОС5 — Сети связи</option>
              <option value="ПОС">ПОС — Организация строительства</option>
              <option value="ООС">ООС — Экология</option>
              <option value="ППМ">ППМ — Пожарная безопасность</option>
              <option value="ОДИ">ОДИ — Доступность МГН</option>
              <option value="ЗУ">ЗУ — Энергоэффективность</option>
              <option value="СМ">СМ — Сметы</option>
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
            >
              <option value="ALL">Все приоритеты</option>
              <option value="HIGH">HIGH (Высокий)</option>
              <option value="MEDIUM">MEDIUM (Средний)</option>
              <option value="LOW">LOW (Низкий)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Split View: Table & Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table list (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[680px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-3">Код</th>
                  <th className="py-3 px-2">Раздел</th>
                  <th className="py-3 px-3">Наименование параметра</th>
                  <th className="py-3 px-2">Ед. изм.</th>
                  <th className="py-3 px-2">Приоритет</th>
                  <th className="py-3 px-3">Триггер</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParams.map((param) => {
                  const isSelected = selectedParam?.id === param.id;
                  return (
                    <tr
                      key={param.id}
                      onClick={() => setSelectedParam(param)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-purple-50 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-purple-900">
                        {param.code}
                      </td>
                      <td className="py-2.5 px-2 font-semibold text-slate-700">
                        {param.section}
                      </td>
                      <td className="py-2.5 px-3 text-slate-900 max-w-[200px] truncate">
                        {param.parameter_name}
                      </td>
                      <td className="py-2.5 px-2 text-slate-600 font-mono text-[11px]">
                        {param.unit}
                      </td>
                      <td className="py-2.5 px-2">{getPriorityBadge(param.review_priority)}</td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-[160px] truncate text-[11px]">
                        {param.trigger_logic}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Inspector Card (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sticky top-24 space-y-4">
          {selectedParam ? (
            <>
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                      {selectedParam.code}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-800 rounded">
                      Раздел {selectedParam.section}
                    </span>
                    {getPriorityBadge(selectedParam.review_priority)}
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-2 leading-snug">
                    {selectedParam.parameter_name}
                  </h3>
                </div>
              </div>

              {/* Parameter Data Sources */}
              <div className="space-y-2 text-xs">
                <div className="font-bold text-slate-700 uppercase text-[11px]">
                  Источники данных для автоматического сопоставления:
                </div>

                <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 space-y-0.5">
                  <div className="font-bold text-blue-900 text-[11px]">
                    1. Проектная документация (ПД):
                  </div>
                  <div className="text-slate-800">{selectedParam.source_pd}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 space-y-0.5">
                  <div className="font-bold text-indigo-900 text-[11px]">
                    2. Рабочая документация (РД):
                  </div>
                  <div className="text-slate-800">{selectedParam.source_rd}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-200 space-y-0.5">
                  <div className="font-bold text-purple-900 text-[11px]">
                    3. Исполнительная документация (ИД):
                  </div>
                  <div className="text-slate-800">{selectedParam.source_id}</div>
                </div>
              </div>

              {/* Trigger Logic & Normalisation */}
              <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200 text-xs space-y-1">
                <div className="font-bold text-rose-900 text-[11px] flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-700" />
                  Логика триггера расхождения:
                </div>
                <div className="text-slate-900 font-semibold">{selectedParam.trigger_logic}</div>
              </div>

              {/* Legal Reference links */}
              <div className="space-y-1.5 text-xs">
                <div className="font-bold text-slate-700 uppercase text-[11px]">
                  Нормативное обоснование (Законодательство РФ):
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-slate-800">
                  <div><strong>Свод правил:</strong> {selectedParam.sp_reference}</div>
                  {selectedParam.fz_reference && (
                    <div><strong>Федеральный закон:</strong> {selectedParam.fz_reference}</div>
                  )}
                  {selectedParam.gost_reference && (
                    <div><strong>ГОСТ:</strong> {selectedParam.gost_reference}</div>
                  )}
                </div>
              </div>

              {/* Technical specs */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100 text-slate-600">
                <div>Тип данных: <strong className="text-slate-900">{selectedParam.data_type}</strong></div>
                <div>Ед. изм.: <strong className="text-slate-900">{selectedParam.unit}</strong></div>
                {selectedParam.min_value !== undefined && (
                  <div>Min значение: <strong className="text-slate-900">{selectedParam.min_value}</strong></div>
                )}
                {selectedParam.max_value !== undefined && (
                  <div>Max значение: <strong className="text-slate-900">{selectedParam.max_value}</strong></div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              Выберите параметр из списка для просмотра детальной спецификации
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
