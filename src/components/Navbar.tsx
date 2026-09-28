import React, { useState } from 'react';
import {
  ShieldAlert,
  Building2,
  FileCheck2,
  Cpu,
  Database,
  Share2,
  History,
  BookOpen,
  UserCheck,
  Activity,
  Layers,
  FolderGit2,
  Split,
  CheckCircle2,
  Sparkles,
  KeyRound,
  ScanLine,
  ShieldCheck,
  UserPlus,
  Plus,
  Lock,
  ChevronDown,
  FolderOpen,
  LayoutGrid
} from 'lucide-react';
import { UserRole } from '../types';
import { ROLE_PROFILES } from '../data/rolesData';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  selectedObjectName: string;
  onOpenUpload: () => void;
  onOpenCreateObject?: () => void;
  onOpenAuth?: () => void;
}

export const ALL_TZ_MODULES = [
  { id: 'dashboard', label: '1. Дашборд объектов', icon: Building2, tag: 'Модуль 1' },
  { id: 'inspection', label: '2. Верификация протокола и чертежей', icon: FileCheck2, tag: 'Модуль 3' },
  { id: 'parsing', label: '3. Парсинг штампов ГОСТ и слоев', icon: ScanLine, tag: 'Модуль 1' },
  { id: 'hypotheses', label: '4. Свободный поиск гипотез (9.5)', icon: Sparkles, tag: 'Модуль 4' },
  { id: 'executive_docs', label: '5. Журнал ИД и АОСР', icon: FolderOpen, tag: 'Модуль 5' },
  { id: 'matrix', label: '6. Матрица 132 параметров', icon: Layers, tag: 'Модуль 2' },
  { id: 'iais_rin', label: '7. Шлюз ИАИС «РиН» (9.6)', icon: Share2, tag: 'Модуль 6' },
  { id: 'ml_retrain', label: '8. MLOps и GOLD-датасет (9.4)', icon: Cpu, tag: 'Модуль 7' },
  { id: 'ml_repo', label: '9. Репозиторий нейросети v2.4', icon: FolderGit2, tag: 'Модуль 8' },
  { id: 'normative', label: '10. Нормативная база 2026', icon: BookOpen, tag: 'Модуль 9' },
  { id: 'audit', label: '11. Журнал аудита WORM', icon: ShieldCheck, tag: 'Модуль 10' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentRole,
  setCurrentRole,
  selectedObjectName,
  onOpenUpload,
  onOpenCreateObject,
  onOpenAuth,
}) => {
  const currentProfile = ROLE_PROFILES[currentRole] || ROLE_PROFILES.INSPECTOR;
  const [isAllModulesOpen, setIsAllModulesOpen] = useState<boolean>(false);

  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
  };

  // Role-aware primary tabs
  const getNavItemsForRole = () => {
    if (currentRole === 'SUPERVISOR') {
      return [
        { id: 'dashboard', label: 'Дашборд объектов', icon: Building2 },
        { id: 'inspection', label: 'Верификация и утверждение', icon: FileCheck2 },
        { id: 'executive_docs', label: 'Журнал ИД', icon: FolderOpen },
        { id: 'iais_rin', label: 'Выгрузка в ИАИС «РиН»', icon: Share2, isHighlight: true },
        { id: 'matrix', label: 'Матрица 132 параметров', icon: Layers },
      ];
    }

    if (currentRole === 'ML_ENGINEER') {
      return [
        { id: 'dashboard', label: 'Дашборд объектов', icon: Building2 },
        { id: 'inspection', label: 'CV-Верификация чертежей', icon: FileCheck2 },
        { id: 'ml_retrain', label: 'ML Дообучение & GOLD', icon: Cpu, isHighlight: true },
        { id: 'ml_repo', label: 'Репозиторий нейросети v2.4', icon: FolderGit2 },
      ];
    }

    if (currentRole === 'ADMIN') {
      return [
        { id: 'dashboard', label: 'Дашборд объектов', icon: Building2 },
        { id: 'inspection', label: 'Верификация (Root)', icon: FileCheck2 },
        { id: 'matrix', label: 'Матрица 132 параметров', icon: Layers },
        { id: 'iais_rin', label: 'Выгрузка в ИАИС «РиН»', icon: Share2 },
        { id: 'normative', label: 'Нормативная база 2026', icon: BookOpen },
        { id: 'audit', label: 'Журнал аудита (WORM)', icon: ShieldCheck },
      ];
    }

    // Default: INSPECTOR
    return [
      { id: 'dashboard', label: 'Дашборд объектов', icon: Building2 },
      { id: 'inspection', label: 'Верификация протокола и чертежей', icon: FileCheck2 },
      { id: 'parsing', label: 'Парсинг штампов ГОСТ', icon: ScanLine },
      { id: 'hypotheses', label: 'Свободный поиск 9.5', icon: Sparkles },
      { id: 'executive_docs', label: 'Журнал ИД', icon: FolderOpen },
      { id: 'matrix', label: 'Матрица 132 параметров', icon: Layers },
      { id: 'iais_rin', label: 'Выгрузка в ИАИС «РиН»', icon: Share2 },
    ];
  };

  const navItems = getNavItemsForRole();

  return (
    <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-50 border-b border-purple-900/60 backdrop-blur-md bg-opacity-95">
      {/* Level 1: Brand, Active Object & User Account Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Left: Brand & City Supervision Identity */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-800 flex items-center justify-center shadow-lg shadow-purple-950/60 border border-purple-400/30 shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-white">
                  Инспектор ИИ
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  Мосгосстройнадзор
                </span>
              </div>
              <p className="text-[11px] text-purple-200/70 hidden sm:block">
                Единый контур автоматической сверки ПД, РД и ИД по 132 параметрам
              </p>
            </div>
          </div>

          {/* Center: Current Inspection Object Pill */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-purple-900/50 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="text-purple-300/80 font-medium">Объект:</span>
            <span className="text-white font-bold max-w-[260px] truncate" title={selectedObjectName}>
              {selectedObjectName}
            </span>
          </div>

          {/* Right: Quick Actions & User Profile Card */}
          <div className="flex items-center space-x-2.5 flex-wrap">
            {/* Create Object Button */}
            {onOpenCreateObject && (
              <button
                type="button"
                onClick={onOpenCreateObject}
                className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer border border-emerald-400/30"
                title="Зарегистрировать новый объект строительства"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+ Объект</span>
              </button>
            )}

            {/* Quick Upload Files Button */}
            <button
              type="button"
              onClick={onOpenUpload}
              className="px-3 py-1.5 bg-purple-700/80 hover:bg-purple-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer border border-purple-400/30"
              title="Загрузить чертежи и документацию"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Загрузить</span>
            </button>

            {/* User Persona & Role Selector */}
            <div className="flex items-center bg-slate-950/90 pl-2.5 pr-1.5 py-1 rounded-xl border border-purple-800/60 shadow-inner">
              <div className="text-right pr-2 hidden sm:block">
                <div className="text-[11px] font-bold text-white leading-tight">
                  {currentProfile.shortName || currentProfile.fullName}
                </div>
                <div className="text-[10px] text-purple-300/80 leading-tight">
                  {currentProfile.badge}
                </div>
              </div>

              {/* Role Dropdown */}
              <div className="relative">
                <select
                  id="role-selector"
                  value={currentRole}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="bg-purple-900/80 hover:bg-purple-800 text-white text-xs font-semibold px-2 py-1 pr-6 rounded-lg border border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer appearance-none transition-colors"
                  title="Быстрое переключение роли"
                >
                  <option value="INSPECTOR" className="bg-slate-900 text-white">Инспектор</option>
                  <option value="SUPERVISOR" className="bg-slate-900 text-white">Супервизор</option>
                  <option value="ML_ENGINEER" className="bg-slate-900 text-white">ML-инженер</option>
                  <option value="ADMIN" className="bg-slate-900 text-white">Администратор</option>
                </select>
                <ChevronDown className="w-3 h-3 text-purple-300 absolute right-1.5 top-2 pointer-events-none" />
              </div>

              {/* Login / Register Trigger Button */}
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="ml-1.5 p-1 text-purple-300 hover:text-white hover:bg-purple-800/60 rounded-lg transition-colors cursor-pointer"
                  title="Открыть окно аутентификации или регистрации нового инспектора"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Level 2: Clean, Modern Navigation Tabs Bar */}
      <div className="bg-slate-950/80 border-t border-purple-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Primary role tabs */}
            <nav className="flex space-x-1 overflow-x-auto py-1.5 scrollbar-none text-xs">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-950'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-purple-400'}`} />
                    <span>{item.label}</span>
                    {item.isHighlight && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Quick All 11 Modules Dropdown Button */}
            <div className="relative shrink-0 pl-2">
              <button
                type="button"
                onClick={() => setIsAllModulesOpen(!isAllModulesOpen)}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isAllModulesOpen
                    ? 'bg-purple-700 text-white border-purple-400'
                    : 'bg-slate-900 hover:bg-slate-800 text-purple-200 border-purple-900/60'
                }`}
                title="Перейти к любому из 11 модулей ТЗ"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Все модули ТЗ (11)</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isAllModulesOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* All Modules Popover */}
              {isAllModulesOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-slate-900 border border-purple-700/80 rounded-2xl shadow-2xl z-50 p-2 text-xs space-y-1 backdrop-blur-md">
                  <div className="px-2.5 py-1.5 text-[11px] font-bold text-purple-300 border-b border-purple-950 flex items-center justify-between">
                    <span>Реестр модулей ТЗ 2026</span>
                    <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded">11 модулей</span>
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-0.5">
                    {ALL_TZ_MODULES.map((mod) => {
                      const Icon = mod.icon;
                      const isCurrent = activeTab === mod.id;
                      return (
                        <button
                          key={mod.id}
                          onClick={() => {
                            setActiveTab(mod.id);
                            setIsAllModulesOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-purple-600 text-white font-bold shadow'
                              : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-white' : 'text-purple-400'}`} />
                            <span className="truncate">{mod.label}</span>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ml-1 font-mono ${
                            isCurrent ? 'bg-purple-800 text-purple-200' : 'bg-slate-950 text-slate-400'
                          }`}>
                            {mod.tag}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
