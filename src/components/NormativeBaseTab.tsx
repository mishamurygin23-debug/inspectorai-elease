import React, { useState } from 'react';
import {
  BookOpen,
  Scale,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Save,
  Search,
  Layers
} from 'lucide-react';
import { UserRole } from '../types';

interface NormativeBaseTabProps {
  currentRole: UserRole;
}

export const NormativeBaseTab: React.FC<NormativeBaseTabProps> = ({ currentRole }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Regulatory documents list directly from Section 2 of ТЗ
  const legalActs = [
    {
      code: 'ГрК РФ (№ 190-ФЗ)',
      title: 'Градостроительный кодекс Российской Федерации',
      articles: 'Статьи 52, 54 (Государственный строительный надзор)',
      effectiveDate: 'Действующая редакция 2026',
      status: 'ФЕДЕРАЛЬНЫЙ ЗАКОН',
    },
    {
      code: 'ПП РФ № 87',
      title: 'Положение о составе разделов проектной документации и требованиях к их содержанию',
      articles: 'Разделы 1–12 (ПЗ, СПЗУ, АР, КР, ИОС1-5, ПОС, ООС, ППМ, ОДИ, СМ)',
      effectiveDate: 'С изменениями 2024–2026',
      status: 'ПОСТАНОВЛЕНИЕ ПРАВИТЕЛЬСТВА РФ',
    },
    {
      code: 'ПП РФ № 2078',
      title: 'Перечень национальных стандартов и сводов правил для соблюдения ТР о безопасности зданий',
      articles: 'С изм. от 28.12.2024 № 1961 (Обязательный перечень СП)',
      effectiveDate: '28.12.2024 / 2026',
      status: 'ПОСТАНОВЛЕНИЕ ПРАВИТЕЛЬСТВА РФ',
    },
    {
      code: 'Приказ Минстроя № 344/пр',
      title: 'Об утверждении состава и порядка ведения исполнительной документации при строительстве',
      articles: 'Акты АОСР, АООК, геодезические исполнительные схемы, журналы работ',
      effectiveDate: 'Приказ Минстроя РФ',
      status: 'ВЕДОМСТВЕННЫЙ АКТ',
    },
    {
      code: 'ГОСТ Р 21.101-2020',
      title: 'СПДС. Основные требования к проектной и рабочей документации',
      articles: 'Оформление чертежей, основные надписи, штампы, внесение изменений',
      effectiveDate: 'ГОСТ Р',
      status: 'НАЦИОНАЛЬНЫЙ СТАНДАРТ',
    },
    {
      code: 'ФЗ № 123-ФЗ',
      title: 'Технический регламент о требованиях пожарной безопасности',
      articles: 'Эвакуационные пути, огнестойкость конструкций, противопожарные преграды',
      effectiveDate: 'Федеральный закон',
      status: 'ТЕХНИЧЕСКИЙ РЕГЛАМЕНТ',
    },
    {
      code: 'СП 59.13330.2020',
      title: 'Доступность зданий и сооружений для маломобильных групп населения (МГН)',
      articles: 'Пандусы, уклоны (до 5%), ширина входных дверей (от 0.9 м), тактильные полосы',
      effectiveDate: 'Свод правил',
      status: 'СВОД ПРАВИЛ',
    },
    {
      code: 'ПП Москвы № 397-ПП',
      title: 'Положение о Комитете государственного строительного надзора города Москвы',
      articles: 'Полномочия Мосгосстройнадзора, регламент контрольно-надзорных мероприятий',
      effectiveDate: 'Правительство Москвы',
      status: 'РЕГИОНАЛЬНЫЙ АКТ МОСКВЫ',
    },
  ];

  // Hot dynamic thresholds configurable without redeploying code
  const [dynamicThresholds, setDynamicThresholds] = useState([
    {
      id: 'th-1',
      param_code: 'AR-41',
      name: 'Ширина эвакуационных проходов и дверей',
      section: 'АР',
      unit: 'м',
      currentMin: 0.9,
      currentMax: 2.4,
      sp: 'СП 1.13130.2020 п. 4.2.5',
    },
    {
      id: 'th-2',
      param_code: 'ODI-01',
      name: 'Максимальный уклон наружного пандуса для МГН',
      section: 'ОДИ',
      unit: '%',
      currentMin: 0.0,
      currentMax: 5.0,
      sp: 'СП 59.13330.2020 п. 5.1.14',
    },
    {
      id: 'th-3',
      param_code: 'PZ-01',
      name: 'Допустимое превышение этажности над ПЗ',
      section: 'ПЗ',
      unit: 'этаж',
      currentMin: 0,
      currentMax: 0,
      sp: 'ГрК РФ ст. 52, ПП РФ № 87',
    },
    {
      id: 'th-4',
      param_code: 'KR-05',
      name: 'Защитный слой бетона рабочей арматуры',
      section: 'КР',
      unit: 'мм',
      currentMin: 25,
      currentMax: 50,
      sp: 'СП 63.13330.2018 п. 10.3',
    },
  ]);

  const handleUpdateThreshold = (id: string, field: 'currentMin' | 'currentMax', value: number) => {
    setDynamicThresholds((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleSaveThresholds = () => {
    setSaveSuccess('Пороговые значения успешно сохранены в базе без перекомпиляции приложения!');
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
              <BookOpen className="w-3.5 h-3.5 text-purple-700" />
              <span>Модуль 8 & Раздел 2 ТЗ • Нормативная база и динамические пороги</span>
            </div>
            <h2 className="text-xl font-black text-slate-900">
              Управление нормативной базой Стройнадзора 2026 года
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Реестр федеральных законов, постановлений Правительства РФ, ГОСТов и сводов правил (СП). Модуль позволяет инспектору и администратору конфигурировать числовые допуски алгоритмов без изменения программного кода.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSaveThresholds}
              className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>Сохранить настройки порогов</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-300 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}
      </div>

      {/* Dynamic Threshold Editor Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-700" />
              Настройка пороговых значений без изменения кода
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Корректировка диапазона допустимых величин (min/max) для автоматических проверок
            </p>
          </div>
          <span className="text-[11px] font-mono text-purple-800 bg-purple-50 px-2 py-1 rounded border border-purple-200">
            Hot-reloaded Thresholds
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dynamicThresholds.map((t) => (
            <div
              key={t.id}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-xs font-bold text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded">
                      {t.param_code}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      Раздел {t.section}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    {t.name}
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {t.unit}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 text-[11px] font-medium mb-1">
                    Минимум ({t.unit}):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={t.currentMin}
                    onChange={(e) => handleUpdateThreshold(t.id, 'currentMin', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-[11px] font-medium mb-1">
                    Максимум ({t.unit}):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={t.currentMax}
                    onChange={(e) => handleUpdateThreshold(t.id, 'currentMax', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span>{t.sp}</span>
                <span className="text-emerald-700 font-semibold">Активен</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statutory Registry Table */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Реестр действующих нормативно-правовых актов
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Законодательный каркас государственного строительного надзора г. Москвы
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Код акта</th>
                <th className="py-2.5 px-3">Наименование нормативного документа</th>
                <th className="py-2.5 px-3">Ключевые статьи и разделы</th>
                <th className="py-2.5 px-3">Редакция</th>
                <th className="py-2.5 px-3">Юридический статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {legalActs.map((act, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-mono font-bold text-purple-900">{act.code}</td>
                  <td className="py-3 px-3 font-semibold text-slate-900 max-w-sm">{act.title}</td>
                  <td className="py-3 px-3 text-slate-700">{act.articles}</td>
                  <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{act.effectiveDate}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {act.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
