import React, { useState } from 'react';
import {
  KeyRound,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  Lock,
  UserCheck,
  Cpu,
  Building2,
  FileCheck2,
  BadgeCheck,
  Award,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import { UserRole } from '../types';
import { ROLE_PROFILES } from '../data/rolesData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onRegisterCustomUser?: (user: {
    fullName: string;
    role: UserRole;
    department: string;
    certificateNumber: string;
  }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  onSelectRole,
  onRegisterCustomUser,
}) => {
  const [activeTabMode, setActiveTabMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login Mode State
  const [selectedRoleState, setSelectedRoleState] = useState<UserRole>(currentRole);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authSuccess, setAuthSuccess] = useState<boolean>(false);

  // Registration Mode State
  const [regFullName, setRegFullName] = useState<string>('');
  const [regRole, setRegRole] = useState<UserRole>('INSPECTOR');
  const [regDepartment, setRegDepartment] = useState<string>('Управление по надзору за строительством (ЦАО)');
  const [regPosition, setRegPosition] = useState<string>('Главный специалист надзора');
  const [regCertificateSerial, setRegCertificateSerial] = useState<string>(
    `00E88${Math.random().toString(16).substring(2, 8).toUpperCase()}90`
  );
  const [regEmail, setRegEmail] = useState<string>('');
  const [regSuccess, setRegSuccess] = useState<boolean>(false);
  const [regErrorMessage, setRegErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const rolesList: {
    role: UserRole;
    icon: any;
    roleName: string;
    personName: string;
    post: string;
    department: string;
    certificate: string;
    color: string;
    accentBg: string;
    border: string;
    tag: string;
    badgeStyle: string;
    keyCapabilities: string[];
    visibleTabs: string[];
  }[] = [
    {
      role: 'INSPECTOR',
      icon: UserCheck,
      roleName: 'Инспектор',
      personName: 'Иванов Александр Сергеевич',
      post: 'Инспектор 1-й категории Мосгосстройнадзора',
      department: 'Управление по надзору за строительством (СВАО)',
      certificate: '00E17A8293DF4B1C90 (ГОСТ Р 34.10)',
      color: 'text-emerald-400',
      accentBg: 'bg-emerald-950/40 hover:bg-emerald-900/30',
      border: 'border-emerald-500/40',
      tag: 'Оперативная проверка',
      badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      keyCapabilities: [
        'Полноэкранная верификация чертежей (BBox, Сплит, Калька)',
        'Утверждение / Отклонение нарушений (CONFIRMED / NEGATIVE)',
        'Формирование первичного предписания (ст. 52, 54 ГрК РФ)',
      ],
      visibleTabs: ['Дашборд объектов', 'Верификация протокола и чертежей', 'AI Парсер', 'Матрица 132 параметров'],
    },
    {
      role: 'SUPERVISOR',
      icon: ShieldCheck,
      roleName: 'Супервизор',
      personName: 'Смирнов Виктор Павлович',
      post: 'Начальник отдела контроля и согласований',
      department: 'Мосгосстройнадзор • Руководство надзора',
      certificate: '00E25B9110AE77C124 (УКЭП Руководителя)',
      color: 'text-blue-400',
      accentBg: 'bg-blue-950/40 hover:bg-blue-900/30',
      border: 'border-blue-500/40',
      tag: 'Утверждение и УКЭП',
      badgeStyle: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      keyCapabilities: [
        'Утверждение и финализация протокола с наложением УКЭП',
        'Снятие блокировок протоколов с указанием правового основания',
        'Прямая авторизованная передача протоколов в ИАИС «РиН»',
      ],
      visibleTabs: ['Дашборд объектов', 'Верификация протокола', 'Выгрузка в ИАИС «РиН»', 'Матрица 132 параметров'],
    },
    {
      role: 'ML_ENGINEER',
      icon: Cpu,
      roleName: 'ML-инженер',
      personName: 'Ковалева Елена Михайловна',
      post: 'ML Lead / Ведущий специалист ИИ-лаборатории',
      department: 'Центр искусственного интеллекта ДИТ г. Москвы',
      certificate: '00E44D3381BC99A501 (Доступ к весам)',
      color: 'text-purple-400',
      accentBg: 'bg-purple-950/40 hover:bg-purple-900/30',
      border: 'border-purple-500/40',
      tag: 'Нейросети и GOLD',
      badgeStyle: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      keyCapabilities: [
        'Дообучение модели и проверка IoU BBox чертежей',
        'Аудит эталонного GOLD-датасета строительных коллизий',
        'Репозиторий весов нейросети и калибровка уверенности',
      ],
      visibleTabs: ['Дашборд объектов', 'Верификация чертежей', 'ML Дообучение & GOLD', 'Репозиторий нейросети v2.4'],
    },
    {
      role: 'ADMIN',
      icon: Lock,
      roleName: 'Администратор',
      personName: 'Соколов Дмитрий Николаевич',
      post: 'Главный системный администратор АИС',
      department: 'Департамент информационных технологий города Москвы',
      certificate: '00E99F1288BB33A011 (Root CA)',
      color: 'text-amber-400',
      accentBg: 'bg-amber-950/40 hover:bg-amber-900/30',
      border: 'border-amber-500/40',
      tag: 'Полный доступ (Root)',
      badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      keyCapabilities: [
        'Неограниченный системный оверрайд любых статусов',
        'WORM-журнал аудита и мониторинг отказоустойчивости',
        'Управление нормативной базой 132 параметров и правами',
      ],
      visibleTabs: ['Все разделы системы', 'Матрица 132 параметров', 'Журнал аудита', 'Нормативная база 2026', 'ИАИС «РиН»'],
    },
  ];

  const currentSelection = rolesList.find((r) => r.role === selectedRoleState) || rolesList[0];

  const handleConfirmLogin = () => {
    setIsAuthenticating(true);
    setTimeout(() => {
      onSelectRole(selectedRoleState);
      setIsAuthenticating(false);
      setAuthSuccess(true);
      setTimeout(() => {
        setAuthSuccess(false);
        onClose();
      }, 700);
    }, 600);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim()) {
      setRegErrorMessage('Пожалуйста, укажите ваши фамилию, имя и отчество');
      return;
    }

    setRegErrorMessage(null);
    setIsAuthenticating(true);

    setTimeout(() => {
      // Update global profile in memory if callback is provided
      if (onRegisterCustomUser) {
        onRegisterCustomUser({
          fullName: regFullName.trim(),
          role: regRole,
          department: regDepartment,
          certificateNumber: regCertificateSerial,
        });
      } else {
        // Fallback update in rolesData
        ROLE_PROFILES[regRole].fullName = regFullName.trim();
        const parts = regFullName.trim().split(' ');
        if (parts.length >= 2) {
          ROLE_PROFILES[regRole].shortName = `${parts[0]} ${parts[1][0]}.${parts[2] ? ` ${parts[2][0]}.` : ''}`;
        }
        ROLE_PROFILES[regRole].department = regDepartment;
        ROLE_PROFILES[regRole].title = regPosition;
        ROLE_PROFILES[regRole].certificateSerial = regCertificateSerial;
      }

      onSelectRole(regRole);
      setIsAuthenticating(false);
      setRegSuccess(true);

      setTimeout(() => {
        setRegSuccess(false);
        onClose();
      }, 900);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-purple-500/40 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border-b border-purple-800/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
              {activeTabMode === 'LOGIN' ? (
                <KeyRound className="w-5 h-5 text-purple-300" />
              ) : (
                <UserPlus className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-black text-white">
                  Единая система аутентификации и регистрации • Мосгосстройнадзор
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ЕСИА • УКЭП ГОСТ
                </span>
              </div>
              <p className="text-xs text-purple-200/70">
                {activeTabMode === 'LOGIN'
                  ? 'Выберите существующую учетную запись должностного лица или зарегистрируйте нового сотрудника'
                  : 'Регистрация нового инспектора / эксперта с выпуском сертификата электронной подписи'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher: Быстрый Вход vs Новая Регистрация */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTabMode('LOGIN')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTabMode === 'LOGIN'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>1. Быстрый вход (Выбор роли)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTabMode('REGISTER')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTabMode === 'REGISTER'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-300" />
              <span>2. Регистрация нового сотрудника / Эксперта</span>
              <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                Новое
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Удостоверяющий центр Минцифры РФ</span>
          </div>
        </div>

        {/* TAB 1: LOGIN MODE */}
        {activeTabMode === 'LOGIN' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto">
            {/* Left: 4 Roles Selector */}
            <div className="md:col-span-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Выберите учетную запись для входа:
                </span>
                <button
                  onClick={() => setActiveTabMode('REGISTER')}
                  className="text-xs text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>+ Зарегистрироваться</span>
                </button>
              </div>

              {rolesList.map((item) => {
                const isSelected = selectedRoleState === item.role;
                const Icon = item.icon;
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setSelectedRoleState(item.role)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? `bg-slate-800/90 ${item.border} ring-2 ring-purple-500/50 shadow-lg scale-[1.01]`
                        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${item.border} ${isSelected ? 'bg-purple-900/50' : 'bg-slate-800'}`}>
                        <Icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-white">{item.roleName}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${item.badgeStyle}`}>
                            {item.tag}
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-slate-300">{item.personName}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{item.post}</div>
                      </div>
                    </div>

                    <div className="pl-2">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-purple-400 bg-purple-600 text-white' : 'border-slate-700'}`}>
                        {isSelected && <span className="text-xs">✓</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Selected Role Privileges & Electronic Signature Card */}
            <div className="md:col-span-6 flex flex-col justify-between space-y-4">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                      Права и функционал профиля
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-purple-300">
                    {currentSelection.certificate}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-bold text-white">{currentSelection.personName}</div>
                  <div className="text-[11px] text-purple-300">{currentSelection.department}</div>
                </div>

                {/* Functional permissions list */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Разрешенные операции в системе:
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {currentSelection.keyCapabilities.map((cap, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visible Navigation Tabs */}
                <div className="pt-2 border-t border-slate-850 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Доступные разделы на панели навигации:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentSelection.visibleTabs.map((tab, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-950/70 border border-purple-700/50 text-purple-200"
                      >
                        {tab}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Login button */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmLogin}
                  disabled={isAuthenticating}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-purple-900/40 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
                >
                  {isAuthenticating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Авторизация по ГОСТ Р 34.10...</span>
                    </>
                  ) : authSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Вход выполнен успешно!</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Войти как {currentSelection.roleName} ({currentSelection.personName.split(' ')[0]})</span>
                    </>
                  )}
                </button>
                <div className="text-center text-[10px] text-slate-500">
                  Авторизация через криптопровайдер КриптоПро CSP 5.0 • Сертификат проверен
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTRATION MODE */}
        {activeTabMode === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto">
            {/* Left: Registration Form Inputs */}
            <div className="md:col-span-7 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                <BadgeCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Анкета регистрации сотрудника надзора
                </h3>
              </div>

              {regErrorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-xs text-rose-300 flex items-center space-x-2">
                  <Info className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{regErrorMessage}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  ФИО инспектора / эксперта <span className="text-rose-400">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Петров Денис Владимирович"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Назначаемая должность и права доступа <span className="text-rose-400">*</span>:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'INSPECTOR', label: 'Инспектор', desc: 'Проверка чертежей и составление замечаний' },
                    { id: 'SUPERVISOR', label: 'Супервизор', desc: 'Утверждение протокола и наложение УКЭП' },
                    { id: 'ML_ENGINEER', label: 'ML-инженер', desc: 'Обучение нейросети и разметка чертежей' },
                    { id: 'ADMIN', label: 'Администратор', desc: 'Полный доступ к системе и журналу аудита' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRegRole(r.id as UserRole)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        regRole === r.id
                          ? 'bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-black text-white">{r.label}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Department */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Подразделение / Округ Москвы:
                </label>
                <select
                  value={regDepartment}
                  onChange={(e) => setRegDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
                >
                  <option value="Управление по надзору за строительством (ЦАО)">Управление по надзору за строительством (ЦАО)</option>
                  <option value="Управление по надзору за строительством (СВАО)">Управление по надзору за строительством (СВАО)</option>
                  <option value="Управление по надзору за строительством (ЗАО)">Управление по надзору за строительством (ЗАО)</option>
                  <option value="Управление по надзору за строительством (ЮАО)">Управление по надзору за строительством (ЮАО)</option>
                  <option value="Управление по надзору за строительством (ТиНАО)">Управление по надзору за строительством (ТиНАО)</option>
                  <option value="Отдел координации и выдачи разрешений">Отдел координации и выдачи разрешений</option>
                  <option value="Центр искусственного интеллекта ДИТ г. Москвы">Центр искусственного интеллекта ДИТ г. Москвы</option>
                </select>
              </div>

              {/* Position and Email in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    Должность:
                  </label>
                  <input
                    type="text"
                    value={regPosition}
                    onChange={(e) => setRegPosition(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    Рабочий Email (mos.ru):
                  </label>
                  <input
                    type="email"
                    placeholder="inspector@stroynadzor.mos.ru"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>
            </div>

            {/* Right: Issued UKEP Certificate Preview & Action */}
            <div className="md:col-span-5 flex flex-col justify-between space-y-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border border-emerald-500/40 space-y-4 shadow-xl">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <Award className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Электронный сертификат УКЭП (ГОСТ)
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Удостоверяющий центр:</span>
                    <span className="text-white font-mono">Правительство Москвы</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Серийный номер:</span>
                    <span className="text-emerald-300 font-mono text-[10px]">{regCertificateSerial}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Стандарт криптографии:</span>
                    <span className="text-white font-mono">ГОСТ Р 34.10-2012</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Срок действия:</span>
                    <span className="text-emerald-400 font-bold">до 31.12.2026</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Будет активировано после регистрации:
                  </div>
                  <div className="flex items-center space-x-2 text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Автоматический вход в систему</span>
                  </div>
                  <div className="flex items-center space-x-2 text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Фиксация в WORM-журнале аудита</span>
                  </div>
                  <div className="flex items-center space-x-2 text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Выгрузка предписаний в ИАИС «РиН»</span>
                  </div>
                </div>
              </div>

              {/* Register Submit Button */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
                >
                  {isAuthenticating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Генерация ключей УКЭП и регистрация...</span>
                    </>
                  ) : regSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Успешно зарегистрирован и авторизован!</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Зарегистрировать и войти в систему</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center space-x-2 text-[10px] text-slate-400">
                  <span>Уже есть учетная запись?</span>
                  <button
                    type="button"
                    onClick={() => setActiveTabMode('LOGIN')}
                    className="text-purple-300 hover:text-white font-bold underline cursor-pointer"
                  >
                    Перейти ко входу
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
