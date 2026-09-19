import { UserRole } from '../types';

export interface RoleProfile {
  role: UserRole;
  fullName: string;
  shortName: string;
  title: string;
  department: string;
  badge: string;
  badgeColor: string;
  certificateSerial: string;
  validUntil: string;
  actionTitle: string;
  permissions: string[];
  capabilities: {
    canVerify: boolean;
    canFinalize: boolean;
    canUnlock: boolean;
    canSignUkep: boolean;
    canRetrainML: boolean;
    canAdminOverride: boolean;
  };
}

export const ROLE_PROFILES: Record<UserRole, RoleProfile> = {
  INSPECTOR: {
    role: 'INSPECTOR',
    fullName: 'Иванов Александр Сергеевич',
    shortName: 'Иванов А.С.',
    title: 'Инспектор 1-й категории Мосгосстройнадзора',
    department: 'Управление по надзору за строительством (СВАО)',
    badge: 'Инспектор',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    certificateSerial: '00E17A8293DF4B1C90',
    validUntil: '31.12.2026',
    actionTitle: 'Действие инспектора (Верификация в 1–3 клика):',
    permissions: [
      'Верификация кандидатов (CONFIRMED_VIOLATION)',
      'Отклонение с кодированной причиной (NEGATIVE_VERIFIED)',
      'Запрос уточнений у застройщика (CLARIFICATION_REQUIRED)',
      'Разделение составных замечаний на атомарные',
      'Создание гипотез в свободном поиске'
    ],
    capabilities: {
      canVerify: true,
      canFinalize: false,
      canUnlock: false,
      canSignUkep: false,
      canRetrainML: false,
      canAdminOverride: false,
    },
  },
  SUPERVISOR: {
    role: 'SUPERVISOR',
    fullName: 'Смирнов Виктор Павлович',
    shortName: 'Смирнов В.П.',
    title: 'Начальник отдела контроля и согласований',
    department: 'Мосгосстройнадзор • Руководство надзора',
    badge: 'Супервизор',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    certificateSerial: '00E25B9110AE77C124',
    validUntil: '31.12.2026',
    actionTitle: 'Панель супервизора (Утверждение и контроль протокола):',
    permissions: [
      'Утверждение и финализация итогового протокола',
      'Подписание протокола усиленной КЭП (УКЭП)',
      'Отмена финализации (снятие блокировки WORM с обоснованием)',
      'Надзорная ревизия решений инспекторов',
      'Синхронизация предписаний в ИАИС «РиН»'
    ],
    capabilities: {
      canVerify: true,
      canFinalize: true,
      canUnlock: true,
      canSignUkep: true,
      canRetrainML: false,
      canAdminOverride: false,
    },
  },
  ML_ENGINEER: {
    role: 'ML_ENGINEER',
    fullName: 'Ковалева Елена Михайловна',
    shortName: 'Ковалева Е.М.',
    title: 'ML Lead / Ведущий специалист ИИ-лаборатории',
    department: 'Центр искусственного интеллекта ДИТ г. Москвы',
    badge: 'ML-инженер',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    certificateSerial: '00E44D3381BC99A501',
    validUntil: '31.12.2026',
    actionTitle: 'Панель ML-инженера (Анализ разметки, верификация GOLD и дообучение):',
    permissions: [
      'Дообучение модели на новых файлах объектов',
      'Формирование и аудит эталонного GOLD-датасета',
      'Контроль 10 метрик приемки по разделу 14 ТЗ',
      'Калибровка порога BBox IoU и character accuracy',
      'Экспорт весов и конфигураций модели в репозиторий'
    ],
    capabilities: {
      canVerify: true,
      canFinalize: false,
      canUnlock: false,
      canSignUkep: false,
      canRetrainML: true,
      canAdminOverride: false,
    },
  },
  ADMIN: {
    role: 'ADMIN',
    fullName: 'Соколов Дмитрий Николаевич',
    shortName: 'Соколов Д.Н.',
    title: 'Главный системный администратор АИС «Инспектор ИИ»',
    department: 'Департамент информационных технологий города Москвы',
    badge: 'Администратор',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    certificateSerial: '00E99F1288BB33A011',
    validUntil: '31.12.2026',
    actionTitle: 'Панель администратора (Полный системный доступ):',
    permissions: [
      'Полный неограниченный доступ ко всем контурам',
      'Принудительный оверрайд любых статусов замечаний',
      'Сброс блокировок протоколов без ограничений',
      'Экспорт WORM-журнала аудита и системных логов',
      'Управление нормативной базой 132 параметров и правами пользователей'
    ],
    capabilities: {
      canVerify: true,
      canFinalize: true,
      canUnlock: true,
      canSignUkep: true,
      canRetrainML: true,
      canAdminOverride: true,
    },
  },
};
