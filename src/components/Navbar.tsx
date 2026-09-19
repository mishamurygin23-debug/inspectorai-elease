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
  KeyRound
} from 'lucide-react';
import { UserRole } from '../types';
import { ROLE_PROFILES } from '../data/rolesData';
import { Plus } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  selectedObjectName: string;
  onOpenUpload: () => void;
  onOpenCreateObject?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentRole,
  setCurrentRole,
  selectedObjectName,
  onOpenUpload,
  onOpenCreateObject,
}) => {
  const [roleChangeNotice, setRoleChangeNotice] = useState<string | null>(null);
  const currentProfile = ROLE_PROFILES[currentRole] || ROLE_PROFILES.INSPECTOR;

  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    const profile = ROLE_PROFILES[newRole];
    setRoleChangeNotice(`Аккаунт переключен: ${profile.fullName} (${profile.title})`);
    setTimeout(() => {
      setRoleChangeNotice(null);
    }, 4000);
  };

  const navItems = [
    { id: 'dashboard', label: 'Дашборд объектов', icon: Building2 },
    { id: 'inspection', label: 'Верификация протокола (Чертеж с ошибками)', icon: FileCheck2, badge: 'Красный PDF' },
    { id: 'matrix', label: 'Матрица 132 параметров', icon: Layers },
    { id: 'iais_rin', label: 'ИАИС «РиН» (Интеграция)', icon: Share2 },
    { id: 'ml_repo', label: 'Репозиторий нейросети v2.4', icon: FolderGit2 },
    { id: 'ml_gold', label: 'ML Дообучение & GOLD', icon: Cpu },
    { id: 'normative', label: 'Нормативная база 2026', icon: BookOpen },
    { id: 'audit', label: 'Журнал аудита', icon: History },
  ];

  return (
    <header className="bg-gradient-to-r from-[#2a0845] via-[#3b0764] to-[#1e1b4b] text-white shadow-xl sticky top-0 z-50 border-b border-purple-800/40">
      {/* Role switch notification banner */}
      {roleChangeNotice && (
        <div className="bg-emerald-600 text-white text-xs py-1.5 px-4 flex items-center justify-between shadow-inner animate-pulse">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <span className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              {roleChangeNotice} — УКЭП сертификат активирован
            </span>
            <button
              onClick={() => setRoleChangeNotice(null)}
              className="text-white hover:text-emerald-200 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top micro-bar with Moscow branding & official badge */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-purple-800/30 text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-purple-900/60 backdrop-blur px-2.5 py-1 rounded-md border border-purple-700/50">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold tracking-wide uppercase text-[10px] text-purple-200">
              Мосгосстройнадзор • Проект Мэра Москвы
            </span>
          </div>
          <span className="hidden sm:inline text-purple-300/80">|</span>
          <span className="hidden md:inline text-purple-200 text-[11px] font-medium">
            Лидеры цифровой трансформации 2026
          </span>
        </div>

        {/* System telemetry & user role selector */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="hidden xl:flex items-center space-x-2 text-purple-200 text-[11px]">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>SLA: 99.98%</span>
            <span className="text-purple-400">•</span>
            <span>API: 142 мс</span>
            <span className="text-purple-400">•</span>
            <span>RabbitMQ: OK</span>
          </div>

          {/* Active User Persona Badge & Dropdown Selector */}
          <div className="flex items-center space-x-2 bg-purple-950/90 px-3 py-1.5 rounded-xl border border-purple-500/60 shadow-inner ring-1 ring-purple-400/20">
            <div className="flex flex-col text-right pr-1">
              <span className="text-[11px] text-purple-200 font-bold leading-tight">
                {currentProfile.fullName}
              </span>
              <span className="text-[9px] text-purple-300 leading-tight">
                {currentProfile.title}
              </span>
            </div>

            <div className="h-6 w-px bg-purple-700"></div>

            <div className="flex items-center space-x-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentProfile.badgeColor}`}>
                {currentProfile.badge}
              </span>

              <div className="relative">
                <select
                  id="role-selector"
                  value={currentRole}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="bg-purple-900 hover:bg-purple-800 text-xs text-white font-bold px-2.5 py-1 rounded-lg border border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300 cursor-pointer transition-all shadow-sm"
                  title="Выберите аккаунт для переключения прав инспектора / супервизора / ML / админа"
                >
                  <option value="INSPECTOR" className="bg-slate-900 text-white font-medium">👤 Инспектор (Иванов А.С.)</option>
                  <option value="SUPERVISOR" className="bg-slate-900 text-white font-medium">👔 Супервизор (Смирнов В.П.)</option>
                  <option value="ML_ENGINEER" className="bg-slate-900 text-white font-medium">🧠 ML-инженер (Ковалева Е.М.)</option>
                  <option value="ADMIN" className="bg-slate-900 text-white font-medium">🛡️ Администратор (Соколов Д.Н.)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-900/50 border border-purple-400/30">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                Инспектор ИИ
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  ТЗ 2026
                </span>
              </h1>
            </div>
            <p className="text-xs text-purple-200/80 line-clamp-1">
              Автоматическая сверка проектной (ПД), рабочей (РД) и исполнительной (ИД) документации
            </p>
          </div>
        </div>

        {/* Object quick badge & Upload Action */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:block text-right">
            <div className="text-[11px] text-purple-300 font-medium">Активный объект проверки:</div>
            <div className="text-xs font-semibold text-white max-w-[280px] truncate" title={selectedObjectName}>
              {selectedObjectName}
            </div>
          </div>

          {onOpenCreateObject && (
            <button
              onClick={onOpenCreateObject}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-lg shadow-md transition-all duration-150 flex items-center space-x-1.5 cursor-pointer border border-emerald-300/40"
              title="Зарегистрировать новый объект строительства"
            >
              <Plus className="w-4 h-4" />
              <span>+ Создать объект</span>
            </button>
          )}

          <button
            onClick={onOpenUpload}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-medium text-xs rounded-lg shadow-md hover:shadow-purple-500/25 transition-all duration-150 flex items-center space-x-1.5 cursor-pointer border border-purple-300/30"
          >
            <Layers className="w-4 h-4" />
            <span>Загрузить файлы</span>
          </button>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto py-1 scrollbar-none text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2.5 font-medium rounded-t-lg transition-colors whitespace-nowrap cursor-pointer relative ${
                  isActive
                    ? 'bg-slate-50 text-purple-950 font-bold border-t-2 border-purple-500 shadow-sm'
                    : 'text-purple-200/90 hover:text-white hover:bg-purple-900/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-purple-700' : 'text-purple-300'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse">
                    DIFF
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
