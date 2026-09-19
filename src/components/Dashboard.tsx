import React, { useState } from 'react';
import {
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  ArrowRight,
  Download,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  Layers,
  ChevronRight,
  Plus,
  UploadCloud,
  Eye,
  Split,
  FileCheck2
} from 'lucide-react';
import { ConstructionObject, UploadScenario } from '../types';

interface DashboardProps {
  objects: ConstructionObject[];
  selectedObjectId: string;
  onSelectObject: (id: string) => void;
  onNavigateToVerification: (id: string) => void;
  onOpenExport: (obj: ConstructionObject) => void;
  onOpenUpload: () => void;
  onOpenCreateObject: () => void;
  onOpenUploadForObject: (obj: ConstructionObject) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  objects,
  selectedObjectId,
  onSelectObject,
  onNavigateToVerification,
  onOpenExport,
  onOpenUpload,
  onOpenCreateObject,
  onOpenUploadForObject,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterScenario, setFilterScenario] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredObjects = objects.filter((obj) => {
    if (filterStatus !== 'ALL' && obj.status !== filterStatus) return false;
    if (filterScenario !== 'ALL' && obj.scenarios.upload_scenario !== filterScenario) return false;
    if (
      searchQuery &&
      !obj.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !obj.address.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !obj.permit_number.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const totalViolations = objects.reduce((acc, o) => acc + o.stats.confirmed_violations, 0);
  const totalCandidates = objects.reduce((acc, o) => acc + o.stats.candidate_findings, 0);
  const totalVerifiedNeg = objects.reduce((acc, o) => acc + o.stats.negative_verified, 0);
  const totalSuspicions = objects.reduce((acc, o) => acc + o.stats.suspicions_count, 0);

  const getStatusBadge = (status: ConstructionObject['status']) => {
    switch (status) {
      case 'RED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-600 mr-1.5 animate-pulse"></span>
            Красный: Критические нарушения
          </span>
        );
      case 'YELLOW':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>
            Желтый: Требует внимания
          </span>
        );
      case 'GREEN':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-600 mr-1.5"></span>
            Зеленый: Соответствует нормам
          </span>
        );
    }
  };

  const getScenarioBadge = (scenario: UploadScenario) => {
    switch (scenario) {
      case 'FULL':
        return <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">ПД + РД + ИД (FULL)</span>;
      case 'PD_RD_ONLY':
        return <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">ПД + РД (БЕЗ ИД)</span>;
      case 'PARTIALLY_LOADED':
        return <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">ЧАСТИЧНАЯ ДОЗАГРУЗКА</span>;
      default:
        return <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">{scenario}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Moscow Supervision highlights and Create Object action */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-purple-800/50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-800/60 border border-purple-600/40 text-xs text-purple-200 font-medium mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
              <span>Единый контур строительного надзора г. Москвы • Матрица 132 параметров</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Дашборд объектов государственного строительного надзора
            </h2>
            <p className="text-sm text-purple-200/90 mt-1 max-w-3xl">
              1. Создайте новый объект надзора → 2. Загрузите файлы ПД и РД → 3. Запустите автоматическую сверку 132 параметров с выделением расхождений <strong>КРАСНЫМ цветом</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Step 1: Create Object Button */}
            <button
              onClick={onOpenCreateObject}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center space-x-2 cursor-pointer ring-2 ring-emerald-400/40"
              title="Создать и зарегистрировать новый объект строительства в контуре надзора"
            >
              <Plus className="w-4 h-4" />
              <span>1. Создать новый объект</span>
            </button>

            {/* Step 2: Upload Files Button */}
            <button
              onClick={onOpenUpload}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg transition-all flex items-center space-x-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>2. Загрузить файлы</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-purple-800/40">
          <div className="bg-purple-950/50 backdrop-blur rounded-xl p-3.5 border border-purple-700/40">
            <div className="text-xs text-purple-300 font-medium flex items-center justify-between">
              <span>Подтвержденных нарушений</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400 mt-1">{totalViolations}</div>
            <div className="text-[11px] text-purple-300/80 mt-0.5">Включены в GOLD-набор</div>
          </div>

          <div className="bg-purple-950/50 backdrop-blur rounded-xl p-3.5 border border-purple-700/40">
            <div className="text-xs text-purple-300 font-medium flex items-center justify-between">
              <span>Кандидатов на проверку</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">{totalCandidates}</div>
            <div className="text-[11px] text-purple-300/80 mt-0.5">Требуют решения инспектора</div>
          </div>

          <div className="bg-purple-950/50 backdrop-blur rounded-xl p-3.5 border border-purple-700/40">
            <div className="text-xs text-purple-300 font-medium flex items-center justify-between">
              <span>Отрицательных эталонов</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{totalVerifiedNeg}</div>
            <div className="text-[11px] text-purple-300/80 mt-0.5">NEGATIVE_VERIFIED (FPR &lt; 5%)</div>
          </div>

          <div className="bg-purple-950/50 backdrop-blur rounded-xl p-3.5 border border-purple-700/40">
            <div className="text-xs text-purple-300 font-medium flex items-center justify-between">
              <span>Гипотез свободного поиска</span>
              <Building2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-indigo-400 mt-1">{totalSuspicions}</div>
            <div className="text-[11px] text-purple-300/80 mt-0.5">Вне Матрицы (SUSPICION)</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 ml-1" />
          <input
            type="text"
            placeholder="Поиск по названию, адресу, номеру разрешения на строительство..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs sm:text-sm px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">Статус:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="ALL">Все статусы (Светофор)</option>
              <option value="RED">Красный (Нарушения)</option>
              <option value="YELLOW">Желтый (Внимание)</option>
              <option value="GREEN">Зеленый (Норма)</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <span className="font-medium">Сценарий:</span>
            <select
              value={filterScenario}
              onChange={(e) => setFilterScenario(e.target.value)}
              className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="ALL">Все сценарии</option>
              <option value="FULL">FULL (ПД + РД + ИД)</option>
              <option value="PD_RD_ONLY">PD_RD_ONLY (ПД + РД)</option>
              <option value="PARTIALLY_LOADED">Частичная дозагрузка</option>
            </select>
          </div>

          <button
            onClick={onOpenCreateObject}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Новый объект</span>
          </button>
        </div>
      </div>

      {/* Objects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredObjects.map((obj) => {
          const isSelected = obj.id === selectedObjectId;
          return (
            <div
              key={obj.id}
              className={`bg-white rounded-2xl p-5 shadow-sm border transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'border-purple-600 ring-2 ring-purple-600/20 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div>
                {/* Header with status badge & scenario */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  {getStatusBadge(obj.status)}
                  {getScenarioBadge(obj.scenarios.upload_scenario)}
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {obj.name}
                </h3>
                <p className="text-xs text-slate-600 mt-1 flex items-center">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                  <span>{obj.address}</span>
                </p>

                {/* Sub details: Customer, contractor, permit */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-600 block text-[11px]">Заказчик:</span>
                    <span className="font-semibold text-slate-800 line-clamp-1">{obj.customer}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[11px]">Генподрядчик:</span>
                    <span className="font-semibold text-slate-800 line-clamp-1">{obj.contractor}</span>
                  </div>
                  <div className="col-span-2 mt-1">
                    <span className="text-slate-600 block text-[11px]">Разрешение на строительство:</span>
                    <span className="font-mono text-slate-800 font-medium text-[11px]">{obj.permit_number}</span>
                  </div>
                </div>

                {/* Stage statuses indicators */}
                <div className="mt-3.5 flex items-center space-x-2 text-[11px]">
                  <span className="text-slate-600">Комплектность:</span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-medium ${
                      obj.scenarios.stage_statuses.pd === 'PD_UPLOADED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : obj.scenarios.stage_statuses.pd === 'PD_PARTIAL'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    ПД: {obj.scenarios.stage_statuses.pd === 'PD_UPLOADED' ? '100%' : obj.scenarios.stage_statuses.pd === 'PD_PARTIAL' ? '50%' : 'Ожидает'}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-medium ${
                      obj.scenarios.stage_statuses.rd === 'RD_UPLOADED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : obj.scenarios.stage_statuses.rd === 'RD_PARTIAL'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    РД: {obj.scenarios.stage_statuses.rd === 'RD_UPLOADED' ? '100%' : obj.scenarios.stage_statuses.rd === 'RD_PARTIAL' ? '50%' : 'Ожидает'}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-medium ${
                      obj.scenarios.stage_statuses.id === 'ID_UPLOADED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : obj.scenarios.stage_statuses.id === 'ID_PARTIAL'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {obj.scenarios.stage_statuses.id === 'ID_UPLOADED'
                      ? 'ИД: 100%'
                      : obj.scenarios.stage_statuses.id === 'ID_PARTIAL'
                      ? 'ИД: Частично'
                      : 'ИД: Не загружена'}
                  </span>
                </div>

                {/* Mini Stats Bar */}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-around text-center">
                  <div>
                    <div className="text-xs font-bold text-slate-700">{obj.stats.total_params_checked}</div>
                    <div className="text-[10px] text-slate-600">Параметров</div>
                  </div>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <div>
                    <div className="text-xs font-bold text-rose-600">{obj.stats.confirmed_violations}</div>
                    <div className="text-[10px] text-slate-600">Нарушений</div>
                  </div>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <div>
                    <div className="text-xs font-bold text-amber-600">{obj.stats.candidate_findings}</div>
                    <div className="text-[10px] text-slate-600">Кандидатов</div>
                  </div>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <div>
                    <div className="text-xs font-bold text-emerald-600">{obj.stats.negative_verified}</div>
                    <div className="text-[10px] text-slate-600">Без расхожд.</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons with explicit 3-step workflow support */}
              <div className="mt-5 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Step 2: Upload documents into this specific object */}
                  <button
                    onClick={() => onOpenUploadForObject(obj)}
                    className="px-3 py-1.5 text-xs font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                    title={`Загрузить чертежи и документы в объект «${obj.name}»`}
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-purple-700" />
                    <span>Загрузить файлы в объект</span>
                  </button>

                  {/* Step 3: Open PDF blueprint with red error highlights */}
                  <button
                    onClick={() => {
                      onSelectObject(obj.id);
                      onNavigateToVerification(obj.id);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                    title={`Открыть интерактивный чертеж с красной подсветкой ошибок для «${obj.name}»`}
                  >
                    <Eye className="w-3.5 h-3.5 text-rose-600" />
                    <span>Чертеж с ошибками (Красный PDF)</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => onOpenExport(obj)}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Экспорт</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectObject(obj.id);
                      onNavigateToVerification(obj.id);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-lg flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Верификация протокола</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
