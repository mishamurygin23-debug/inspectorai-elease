import React, { useState } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Database,
  TrendingUp,
  Award,
  Layers,
  FileCheck,
  ShieldCheck,
  Download,
  Play,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { UserRole } from '../types';

interface MLRetrainingTabProps {
  currentRole: UserRole;
}

export const MLRetrainingTab: React.FC<MLRetrainingTabProps> = ({ currentRole }) => {
  const [modelStatus, setModelStatus] = useState<'DEPLOYED' | 'TESTING' | 'RETRAINING'>('DEPLOYED');
  const [isSupervisedApproved, setIsSupervisedApproved] = useState<boolean>(true);
  const [retrainingProgress, setRetrainingProgress] = useState<number>(0);

  // Table of 10 acceptance metrics from Table 1 of Section 14
  const metrics = [
    {
      name: 'Character Accuracy (печатный текст)',
      current: 0.982,
      previous: 0.968,
      threshold: '>= 0.95',
      thresholdVal: 0.95,
      isHigherBetter: true,
      status: 'PASS',
      note: 'Модуль OCR чертежей и ведомостей',
    },
    {
      name: 'Exact Match (шифры, марки бетона, даты)',
      current: 0.941,
      previous: 0.925,
      threshold: '>= 0.90',
      thresholdVal: 0.90,
      isHigherBetter: true,
      status: 'PASS',
      note: 'Точное извлечение ключевых реквизитов',
    },
    {
      name: 'Точность связывания документов (linking)',
      current: 0.965,
      previous: 0.951,
      threshold: '>= 0.95',
      thresholdVal: 0.95,
      isHigherBetter: true,
      status: 'PASS',
      note: 'Связка ПД <-> РД <-> ИД по шифрам',
    },
    {
      name: 'Локализация доказательств (IoU [0;1])',
      current: 0.960,
      previous: 0.948,
      threshold: '>= 0.95',
      thresholdVal: 0.95,
      isHigherBetter: true,
      status: 'PASS',
      note: 'Точность выделения bounding box на листе',
    },
    {
      name: 'Precision по выявлению нарушений',
      current: 0.923,
      previous: 0.910,
      threshold: '>= 0.90',
      thresholdVal: 0.90,
      isHigherBetter: true,
      status: 'PASS',
      note: 'Доля реальных нарушений среди поднятых',
    },
    {
      name: 'Recall (полнота охвата нарушений)',
      current: 0.845,
      previous: 0.812,
      threshold: '>= 0.80',
      thresholdVal: 0.80,
      isHigherBetter: true,
      status: 'PASS',
      note: 'Охват всех нарушений из 132 точек',
    },
    {
      name: 'Интегральный F1-score',
      current: 0.882,
      previous: 0.857,
      threshold: '>= 0.85',
      thresholdVal: 0.85,
      isHigherBetter: true,
      status: 'PASS',
      note: 'Гармоническое среднее Precision и Recall',
    },
    {
      name: 'False Positive Rate (FPR)',
      current: 0.048,
      previous: 0.062,
      threshold: '<= 0.10',
      thresholdVal: 0.10,
      isHigherBetter: false,
      status: 'PASS',
      note: 'Частота ложных срабатываний (отклоненных)',
    },
  ];

  // Object-level dataset split stats
  const datasetSplit = {
    totalObjects: 148,
    trainObjects: 104, // 70%
    valObjects: 22,   // 15%
    testObjects: 22,  // 15%
    goldViolations: 842,
    goldNegatives: 1690,
  };

  const handleStartRetraining = () => {
    setModelStatus('RETRAINING');
    setRetrainingProgress(10);
    const interval = setInterval(() => {
      setRetrainingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setModelStatus('DEPLOYED');
          return 100;
        }
        return prev + 20;
      });
    }, 600);
  };

  const canApprove = currentRole === 'SUPERVISOR' || currentRole === 'ML_ENGINEER' || currentRole === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
              <Cpu className="w-3.5 h-3.5 text-purple-700" />
              <span>Модуль 4 & Раздел 9.4 ТЗ • Контур MLOps и верифицированный GOLD-датасет</span>
            </div>
            <h2 className="text-xl font-black text-slate-900">
              Дообучение моделей и контроль метрик качества (Таблица 1 ТЗ)
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              В обучающую выборку поступают исключительно подтвержденные инспектором нарушения (<strong>CONFIRMED_VIOLATION</strong>) и проверенные отрицательные примеры (<strong>NEGATIVE_VERIFIED</strong>). Разбиение датасета выполняется строго на уровне объектов для исключения утечки данных.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleStartRetraining}
              disabled={modelStatus === 'RETRAINING' || !canApprove}
              className={`px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 ${
                modelStatus === 'RETRAINING' || !canApprove
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-purple-700 hover:bg-purple-800 text-white cursor-pointer'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>{modelStatus === 'RETRAINING' ? `Обучение (${retrainingProgress}%)...` : 'Запустить пайплайн дообучения'}</span>
            </button>
          </div>
        </div>

        {/* Object-level Split & GOLD stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-600 font-medium">Объектов в выборке</div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {datasetSplit.totalObjects} объектов
            </div>
            <div className="text-[11px] text-purple-700 font-medium mt-0.5">
              Train: {datasetSplit.trainObjects} | Val: {datasetSplit.valObjects} | Test: {datasetSplit.testObjects}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
            <div className="text-rose-900 font-medium">GOLD Нарушений</div>
            <div className="text-xl font-black text-rose-700 mt-1">
              {datasetSplit.goldViolations}
            </div>
            <div className="text-[11px] text-rose-800 mt-0.5">CONFIRMED_VIOLATION</div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <div className="text-emerald-900 font-medium">GOLD Отрицательных</div>
            <div className="text-xl font-black text-emerald-700 mt-1">
              {datasetSplit.goldNegatives}
            </div>
            <div className="text-[11px] text-emerald-800 mt-0.5">NEGATIVE_VERIFIED с кодом</div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200">
            <div className="text-indigo-900 font-medium">Шлюз утверждения (Gate)</div>
            <div className="text-base font-black text-indigo-700 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {isSupervisedApproved ? 'Утверждено супервизором' : 'Требует ревью'}
            </div>
            <div className="text-[11px] text-indigo-800 mt-0.5">Регрессия &lt; 2% подтверждена</div>
          </div>
        </div>
      </div>

      {/* Acceptance Metrics Table according to Table 1 from ТЗ */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Критерии приемки моделей (Таблица 1 раздела 14 ТЗ)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Сравнение текущей рабочей модели v2.4 с предыдущей версией v2.3 и установленными ТЗ нормативами
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Все 10 критериев в зеленой зоне
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Метрика качества</th>
                <th className="py-2.5 px-3">Требование ТЗ (Порог)</th>
                <th className="py-2.5 px-3">Модель v2.3</th>
                <th className="py-2.5 px-3">Модель v2.4 (Текущая)</th>
                <th className="py-2.5 px-3">Дельта</th>
                <th className="py-2.5 px-3">Статус приемки</th>
                <th className="py-2.5 px-3">Назначение модуля</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.map((m, idx) => {
                const delta = m.current - m.previous;
                const isDeltaPositive = m.isHigherBetter ? delta >= 0 : delta <= 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-slate-900">{m.name}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">{m.threshold}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{m.previous.toFixed(3)}</td>
                    <td className="py-3 px-3 font-mono font-black text-purple-900 bg-purple-50/50">
                      {m.current.toFixed(3)}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs">
                      <span className={`font-bold ${isDeltaPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {delta >= 0 ? `+${delta.toFixed(3)}` : delta.toFixed(3)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        СООТВЕТСТВУЕТ
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-[11px]">{m.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly Retraining Report Generator & Audit Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h4 className="text-base font-bold text-slate-900">
              Еженедельный отчет по дообучению моделей (Раздел 9.4 ТЗ)
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Автоматическая фиксация пользователя, даты, метрик до/после и экспертного вердикта супервизора
            </p>
          </div>
          <button
            onClick={() => alert('Еженедельный отчет экспортирован в PDF и XML для архива Мосгосстройнадзора.')}
            className="px-3.5 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Скачать отчет (PDF/XML)</span>
          </button>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 leading-relaxed">
          <div className="flex items-center justify-between text-slate-700">
            <span><strong>Номер отчета:</strong> ML-REP-2026-W06</span>
            <span><strong>Период:</strong> 01.02.2026 – 08.02.2026</span>
          </div>
          <div className="text-slate-700">
            <strong>Ответственный ML-инженер:</strong> Ковалева Е.М. (Lead ML Engineer)
          </div>
          <div className="text-slate-700">
            <strong>Супервизор приемки:</strong> Смирнов В.П. (Начальник отдела контроля качества)
          </div>
          <div className="text-slate-700">
            <strong>Объем пополнения GOLD:</strong> +124 подтвержденных нарушения, +310 проверенных отрицательных примеров
          </div>
          <div className="text-slate-700">
            <strong>Вердикт регрессионного тестирования:</strong> Регрессии по 132 параметрам не обнаружено (максимальное колебание метрик +1.4%, допустимо падение не более 2.0%). Модель допущена в прод.
          </div>
        </div>
      </div>
    </div>
  );
};
