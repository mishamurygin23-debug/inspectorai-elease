import React, { useState } from 'react';
import {
  ShieldAlert,
  Sparkles,
  GitBranch,
  FileCode2,
  CheckCircle,
  XCircle,
  ArrowRight,
  TrendingUp,
  Brain,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Suspicion, DiscoveryMethod } from '../types';

interface HypothesisTabProps {
  suspicions: Suspicion[];
  onPromoteToCandidate: (suspicionId: number) => void;
  onDismissSuspicion: (suspicionId: number) => void;
  onAddNewHypothesis: (hypothesis: Omit<Suspicion, 'suspicion_id'>) => void;
}

export const HypothesisTab: React.FC<HypothesisTabProps> = ({
  suspicions,
  onPromoteToCandidate,
  onDismissSuspicion,
  onAddNewHypothesis,
}) => {
  const [filterMethod, setFilterMethod] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // New suspicion form state
  const [newMethod, setNewMethod] = useState<DiscoveryMethod>('LOGICAL_ANALYSIS');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newPdRef, setNewPdRef] = useState<string>('');
  const [newRdRef, setNewRdRef] = useState<string>('');
  const [newNorm, setNewNorm] = useState<string>('');

  const methodDetails: Record<DiscoveryMethod, { label: string; icon: any; color: string; desc: string }> = {
    LOGICAL_ANALYSIS: {
      label: 'Логический анализ',
      icon: GitBranch,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      desc: 'Проверка логических связок: «Если А, то должно быть Б»',
    },
    SEMANTIC_DISSONANCE: {
      label: 'Семантический диссонанс',
      icon: FileCode2,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      desc: 'Поиск смысловых и терминологических противоречий между ПД и РД',
    },
    NORMATIVE_ANALYSIS: {
      label: 'Нормативный анализ',
      icon: ShieldAlert,
      color: 'bg-amber-100 text-amber-800 border-amber-200',
      desc: 'Прямая сверка проектных решений с требованиями СП, ГОСТ и СанПиН',
    },
    ML_PATTERN_ANALYSIS: {
      label: 'ML-паттерн-анализ',
      icon: Brain,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      desc: 'Поиск аномалий на основе обученной модели по историческим стройкам Москвы',
    },
  };

  const filteredSuspicions = suspicions.filter((s) => {
    if (filterMethod !== 'ALL' && s.discovery_method !== filterMethod) return false;
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc) return;
    onAddNewHypothesis({
      object_id: 'obj-77-01-2024-041',
      discovery_method: newMethod,
      confidence: 0.85,
      description: newDesc,
      pd_reference: newPdRef || 'ПД: спецификации',
      rd_reference: newRdRef || 'РД: спецификации',
      review_priority: 'HIGH',
      normative_base: newNorm || 'СП / Градостроительный кодекс РФ',
      finding_status: 'SUSPICION',
      inspector_status: 'PENDING',
    });
    setNewDesc('');
    setNewPdRef('');
    setNewRdRef('');
    setNewNorm('');
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
              <span>Раздел 9.5 ТЗ • Автономный поиск потенциальных расхождений</span>
            </div>
            <h2 className="text-xl font-black text-slate-900">
              Модуль свободного поиска гипотез (SUSPICION)
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Формирует гипотезы о возможных расхождениях <strong>вне фиксированной Матрицы</strong>. Подозрение (SUSPICION) не считается нарушением, не входит в сводную статистику штрафов и не используется для дообучения до момента привязки доказательств и подтверждения инспектором.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center space-x-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Сформировать гипотезу вручную</span>
          </button>
        </div>

        {/* 4 Method Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 mt-5 pt-4 border-t border-slate-100">
          {(Object.keys(methodDetails) as DiscoveryMethod[]).map((method) => {
            const info = methodDetails[method];
            const Icon = info.icon;
            const count = suspicions.filter((s) => s.discovery_method === method).length;
            return (
              <div
                key={method}
                onClick={() => setFilterMethod(filterMethod === method ? 'ALL' : method)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  filterMethod === method
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {count} гип.
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
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <span className="font-bold text-slate-800">
            Обнаруженные подозрения ({filteredSuspicions.length}):
          </span>
          <span>Перевод в CANDIDATE требует обязательной привязки координат листов</span>
        </div>

        {filteredSuspicions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-600 border border-slate-200">
            По выбранному методу подозрения отсутствуют
          </div>
        ) : (
          filteredSuspicions.map((suspicion) => {
            const methodInfo = methodDetails[suspicion.discovery_method];
            const MethodIcon = methodInfo.icon;
            const isPromoted = suspicion.inspector_status === 'PROMOTED_TO_CANDIDATE';
            const isDismissed = suspicion.inspector_status === 'DISMISSED';

            return (
              <div
                key={suspicion.suspicion_id}
                className={`bg-white rounded-2xl p-5 shadow-sm border transition-all ${
                  isPromoted
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : isDismissed
                    ? 'border-slate-200 bg-slate-50/50 opacity-60'
                    : 'border-slate-200 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-xs font-bold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded">
                      SUSPICION #{suspicion.suspicion_id}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${methodInfo.color}`}>
                      {methodInfo.label}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600">
                      Уверенность модели: <strong className="text-purple-700">{(suspicion.confidence * 100).toFixed(0)}%</strong>
                    </span>
                  </div>

                  <div>
                    {isPromoted ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Переведено в CANDIDATE
                      </span>
                    ) : isDismissed ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Отклонено инспектором
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                        Ожидает рассмотрения
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                    {suspicion.description}
                  </p>
                </div>

                {/* References */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-600 block text-[10px] font-bold uppercase">Ссылка на ПД:</span>
                    <span className="text-slate-800 font-medium">{suspicion.pd_reference}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-600 block text-[10px] font-bold uppercase">Ссылка на РД / ИД:</span>
                    <span className="text-slate-800 font-medium">{suspicion.rd_reference}</span>
                  </div>
                </div>

                <div className="mt-2 text-xs text-purple-900 bg-purple-50 p-2 rounded-lg border border-purple-200 flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-purple-700 shrink-0" />
                  <span><strong>Нормативный базис:</strong> {suspicion.normative_base}</span>
                </div>

                {/* Action Buttons if not decided */}
                {!isPromoted && !isDismissed && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onDismissSuspicion(suspicion.suspicion_id)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Отклонить гипотезу
                    </button>
                    <button
                      onClick={() => onPromoteToCandidate(suspicion.suspicion_id)}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Привязать доказательства и перевести в CANDIDATE</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add Manual Hypothesis */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Создание гипотезы свободного поиска
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Метод выявления:</label>
                <select
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value as DiscoveryMethod)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="LOGICAL_ANALYSIS">Логический анализ («Если А, то Б»)</option>
                  <option value="SEMANTIC_DISSONANCE">Семантический диссонанс терминологии</option>
                  <option value="NORMATIVE_ANALYSIS">Нормативный анализ СП/ГОСТ/СанПиН</option>
                  <option value="ML_PATTERN_ANALYSIS">ML-паттерн-анализ исторических данных</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Суть подозрения (описание):</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Опишите выявленную аномалию или противоречие..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ссылка на ПД:</label>
                  <input
                    type="text"
                    placeholder="25-01-АР, лист..."
                    value={newPdRef}
                    onChange={(e) => setNewPdRef(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ссылка на РД / ИД:</label>
                  <input
                    type="text"
                    placeholder="25-01-АР-КЛ, лист..."
                    value={newRdRef}
                    onChange={(e) => setNewRdRef(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Нормативный базис (СП/ГОСТ):</label>
                <input
                  type="text"
                  placeholder="Например: СП 54.13330.2022 п. 7.1.3"
                  value={newNorm}
                  onChange={(e) => setNewNorm(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                >
                  Добавить подозрение
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
