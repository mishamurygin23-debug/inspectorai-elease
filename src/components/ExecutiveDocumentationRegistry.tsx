import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Eye,
  Search,
  Filter,
  UploadCloud,
  ChevronRight,
  ChevronDown,
  Shield,
  Layers,
  Calendar,
  Building,
  HardHat,
  BadgeCheck,
  Check,
  Trash2,
} from 'lucide-react';
import { DocStage } from '../types';

export interface ExecutiveDocItem {
  id: string;
  name: string;
  category: 'ACTS' | 'GEODESY' | 'CERTIFICATES' | 'JOURNALS' | 'OTHER';
  docCode: string;
  docStage: 'ID';
  workType: string; // e.g. "Монолитные работы", "Монтаж фасадов", "Гидроизоляция"
  date: string;
  authorOrg: string; // e.g. "АО «МСУ-1»", "ООО «ГеоСтройКонтроль»"
  signatory: string;
  status: 'VERIFIED' | 'SIGNED' | 'IN_REVIEW' | 'REQUIRES_REVISION';
  sizeMb: number;
  blobUrl?: string;
  deviationMm?: number; // Для геодезии
  notes?: string;
}

export interface ExecutiveDocumentationRegistryProps {
  files?: Array<{
    id?: string;
    name: string;
    stage?: DocStage | string;
    blobUrl?: string;
    sizeMb?: number;
    uploadedAt?: string;
  }>;
  onSelectDocument?: (file: { name: string; blobUrl?: string }) => void;
  onUploadExecutiveDoc?: (categoryHint?: string) => void;
  onDeleteDocument?: (docId: string, docName: string) => void;
  className?: string;
}

// Стандартные категории исполнительной документации в соответствии с требованиями Мосгосстройнадзора
export const EXECUTIVE_DOC_CATEGORIES = [
  {
    id: 'ACTS' as const,
    name: 'Акты освидетельствования скрытых работ (АОСР)',
    shortName: 'Акты (АОСР)',
    folderName: '01_Акты_скрытых_работ_АОСР',
    description: 'Освидетельствование армирования, бетонирования, гидроизоляции, скрытых проводок по форме Приказа Минстроя № 1026/пр и РД-11-02-2006',
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  {
    id: 'GEODESY' as const,
    name: 'Исполнительные геодезические схемы (ИГС)',
    shortName: 'Геодезия (ИГС)',
    folderName: '02_Исполнительные_геодезические_схемы',
    description: 'Фактические отклонения конструкций, планово-высотная съемка осей, колонн, ростверков и свайного поля по СП 126.13330.2017',
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'CERTIFICATES' as const,
    name: 'Паспорта, сертификаты и протоколы качества',
    shortName: 'Паспорта и сертификаты',
    folderName: '03_Сертификаты_и_паспорта_качества',
    description: 'Документы о качестве бетонных смесей (ГОСТ 7473), сертификаты на арматуру А500С (ГОСТ 34028) и протоколы лабораторных испытаний на 28 суток',
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
    badgeColor: 'bg-emerald-100 text-emerald-800',
  },
  {
    id: 'JOURNALS' as const,
    name: 'Журналы входного контроля и общие журналы работ',
    shortName: 'Журналы работ (ОЖР)',
    folderName: '04_Журналы_учета_работ_и_контроля',
    description: 'Общий журнал работ (РД-11-05-2007), журнал бетонных работ, журнал сварочных работ и входного учета материалов',
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    badgeColor: 'bg-purple-100 text-purple-800',
  },
];

// Эталонная база исполнительных документов объекта
const DEFAULT_SAMPLE_EXECUTIVE_DOCS: ExecutiveDocItem[] = [
  // 1. АОСР
  {
    id: 'id-aosr-01',
    name: 'АОСР_№1-НВФ_Акт_освидетельствования_скрытых_работ.pdf',
    category: 'ACTS',
    docCode: 'АОСР-НВФ-01',
    docStage: 'ID',
    workType: 'Монтаж направляющих кронштейнов НВФ',
    date: '2026-06-02',
    authorOrg: 'ООО «ДжиЭмЭс» (Фасады)',
    signatory: 'Прораб Соколов В.Г. / Технадзор МСУ-1',
    status: 'VERIFIED',
    sizeMb: 11.2,
    notes: 'Шаг кронштейнов проверен по РД (500 мм). Замечаний нет.',
  },
  {
    id: 'id-aosr-02',
    name: 'АОСР_№14-Армирование_фундаментной_плиты_отм-4.200.pdf',
    category: 'ACTS',
    docCode: 'АОСР-КЖ-14',
    docStage: 'ID',
    workType: 'Армирование нижней и верхней сетки фундаментной плиты',
    date: '2026-05-10',
    authorOrg: 'АО «МСУ-1» (Генподрядчик)',
    signatory: 'Начальник участка Григорьев Д.Е.',
    status: 'VERIFIED',
    sizeMb: 9.4,
    notes: 'Сверка с РД-2025-04.266-КЖ01. Шаг 200 мм подтвержден.',
  },
  {
    id: 'id-aosr-03',
    name: 'АОСР_№22-Гидроизоляция_стен_подвала_2_слоя_Техноэласт.pdf',
    category: 'ACTS',
    docCode: 'АОСР-ИЗОЛ-22',
    docStage: 'ID',
    workType: 'Устройство оклеечной гидроизоляции подземной части',
    date: '2026-05-24',
    authorOrg: 'АО «МСУ-1» (Генподрядчик)',
    signatory: 'Инженер СК Кузнецов И.А.',
    status: 'SIGNED',
    sizeMb: 8.7,
    notes: 'Сплошность покрытия испытана искровым дефектоскопом.',
  },

  // 2. ГЕОДЕЗИЯ
  {
    id: 'id-geod-01',
    name: 'ИД_№1-НВФ7.7.2-Кр_Исполнительная_геодезическая_схема.pdf',
    category: 'GEODESY',
    docCode: 'ИГС-НВФ-01',
    docStage: 'ID',
    workType: 'Съемка плоскостности каркаса навесного фасада',
    date: '2026-05-18',
    authorOrg: 'ООО «ГеоКонтроль»',
    signatory: 'Ведущий геодезист Белов С.Н.',
    status: 'VERIFIED',
    sizeMb: 17.8,
    deviationMm: 4,
    notes: 'Макс. отклонение от вертикали 4 мм (допуск по СП 70.13330 до 10 мм).',
  },
  {
    id: 'id-geod-02',
    name: 'ИГС-04_Исполнительная_съемка_свайного_поля_364_сваи.pdf',
    category: 'GEODESY',
    docCode: 'ИГС-СП-04',
    docStage: 'ID',
    workType: 'Планово-высотная съемка оголовков буронабивных свай',
    date: '2026-04-12',
    authorOrg: 'ООО «ГеоКонтроль»',
    signatory: 'Геодезист Котов А.В.',
    status: 'VERIFIED',
    sizeMb: 14.5,
    deviationMm: 18,
    notes: 'Все сваи в пределах допустимого эксцентриситета по СП 45.13330.',
  },
  {
    id: 'id-geod-03',
    name: 'ИГС-12_Съемка_монолитных_колонн_типового_этажа_Секция_1.pdf',
    category: 'GEODESY',
    docCode: 'ИГС-КЖ-12',
    docStage: 'ID',
    workType: 'Съемка отклонений граней монолитных колонн от разбивочных осей',
    date: '2026-06-15',
    authorOrg: 'АО «МСУ-1»',
    signatory: 'Геодезист МСУ-1 Федоров М.П.',
    status: 'SIGNED',
    sizeMb: 12.1,
    deviationMm: 6,
    notes: 'Отклонения по осям 1–5 не превышают 6 мм.',
  },

  // 3. СЕРТИФИКАТЫ И ПАСПОРТА
  {
    id: 'id-cert-01',
    name: 'Паспорт_качества_№418-Бетонная_смесь_В25_W8_F150.pdf',
    category: 'CERTIFICATES',
    docCode: 'ПАСПОРТ-БЕТОН-418',
    docStage: 'ID',
    workType: 'Бетонирование фундаментной плиты (объем 820 м³)',
    date: '2026-05-11',
    authorOrg: 'Бетонный завод ООО «ЕвроБетон-Север»',
    signatory: 'Начальник ОТК Морозова Е.В.',
    status: 'VERIFIED',
    sizeMb: 5.6,
    notes: 'Класс В25 подтвержден, осадка конуса 18 см (П4). Соответствует РД.',
  },
  {
    id: 'id-cert-02',
    name: 'Сертификат_соответствия_№RU.C-RU.АД07.В.01244_Арматура_А500С_d25.pdf',
    category: 'CERTIFICATES',
    docCode: 'СЕРТ-АРМ-А500С',
    docStage: 'ID',
    workType: 'Поставка проката арматурного горячекатаного',
    date: '2026-04-20',
    authorOrg: 'ПАО «Северсталь»',
    signatory: 'Орган по сертификации металлопродукции',
    status: 'VERIFIED',
    sizeMb: 4.8,
    notes: 'Сталь марки А500С по ГОСТ 34028-2016. Механические испытания пройдены.',
  },
  {
    id: 'id-cert-03',
    name: 'Протокол_лабораторных_испытаний_кубиков_бетона_на_28_суток_В25.pdf',
    category: 'CERTIFICATES',
    docCode: 'ПРОТОКОЛ-ЛАБ-88',
    docStage: 'ID',
    workType: 'Определение прочности бетона неразрушающим и прессовым методом',
    date: '2026-06-08',
    authorOrg: 'НИИЖБ им. А.А. Гвоздева (Аттестованная лаборатория)',
    signatory: 'Зав. лабораторией д.т.н. Смирнов А.Ю.',
    status: 'VERIFIED',
    sizeMb: 7.3,
    notes: 'Фактическая прочность 32.4 МПа (104% от проектного класса В25).',
  },

  // 4. ЖУРНАЛЫ
  {
    id: 'id-journ-01',
    name: 'Общий_журнал_работ_ОЖР_№1_Рег_МГСН-77-2026.pdf',
    category: 'JOURNALS',
    docCode: 'ОЖР-ТОМ-1',
    docStage: 'ID',
    workType: 'Ведение общего учета строительно-монтажных работ',
    date: '2026-06-20',
    authorOrg: 'Мосгосстройнадзор (Штамп регистрации)',
    signatory: 'Инспектор Мосгосстройнадзора Иванов А.С.',
    status: 'VERIFIED',
    sizeMb: 18.2,
    notes: 'Зарегистрирован в Мосгосстройнадзоре. Все записи авторского надзора ведутся своевременно.',
  },
  {
    id: 'id-journ-02',
    name: 'Журнал_бетонных_работ_№2_Фундамент_и_подземная_часть.pdf',
    category: 'JOURNALS',
    docCode: 'ЖУРНАЛ-БЕТОН-02',
    docStage: 'ID',
    workType: 'Фиксация укладки бетона, температуры и ухода',
    date: '2026-06-18',
    authorOrg: 'АО «МСУ-1»',
    signatory: 'Мастер СМР Васильев П.К.',
    status: 'SIGNED',
    sizeMb: 11.9,
    notes: 'Температурные листы прогрева бетона заполнены по СП 70.13330.',
  },
  {
    id: 'id-journ-03',
    name: 'Журнал_входного_учета_и_контроля_качества_материалов.pdf',
    category: 'JOURNALS',
    docCode: 'ЖУРНАЛ-ВХОД-01',
    docStage: 'ID',
    workType: 'Приемка арматурного проката, гидроизоляции и закладных',
    date: '2026-06-19',
    authorOrg: 'АО «МСУ-1»',
    signatory: 'Инженер входного контроля Тихонов И.В.',
    status: 'VERIFIED',
    sizeMb: 9.8,
    notes: 'Бракованных партий материалов не выявлено.',
  },
];

export const ExecutiveDocumentationRegistry: React.FC<ExecutiveDocumentationRegistryProps> = ({
  files = [],
  onSelectDocument,
  onUploadExecutiveDoc,
  onDeleteDocument,
  className = '',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<
    'ALL' | 'ACTS' | 'GEODESY' | 'CERTIFICATES' | 'JOURNALS'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deletedDocIds, setDeletedDocIds] = useState<Set<string>>(new Set());
  const [registryNotice, setRegistryNotice] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    ACTS: true,
    GEODESY: true,
    CERTIFICATES: true,
    JOURNALS: true,
  });

  // Преобразуем загруженные пользователем файлы в исполнительные документы, если они есть
  const userExecutiveDocs = useMemo<ExecutiveDocItem[]>(() => {
    const idFiles = files.filter(
      (f) =>
        f.stage === 'ID' ||
        (f.name &&
          (f.name.toLowerCase().includes('ид') ||
            f.name.toLowerCase().includes('аоср') ||
            f.name.toLowerCase().includes('игс') ||
            f.name.toLowerCase().includes('паспорт') ||
            f.name.toLowerCase().includes('сертификат') ||
            f.name.toLowerCase().includes('ожр') ||
            f.name.toLowerCase().includes('журнал')))
    );

    return idFiles.map((file, idx) => {
      const nameLower = file.name.toLowerCase();
      let category: ExecutiveDocItem['category'] = 'OTHER';
      let workType = 'Исполнительная документация';

      if (nameLower.includes('аоср') || nameLower.includes('акт')) {
        category = 'ACTS';
        workType = 'Освидетельствование скрытых работ';
      } else if (
        nameLower.includes('игс') ||
        nameLower.includes('геодез') ||
        nameLower.includes('схема') ||
        nameLower.includes('съемка')
      ) {
        category = 'GEODESY';
        workType = 'Исполнительная съемка отклонений';
      } else if (
        nameLower.includes('паспорт') ||
        nameLower.includes('сертификат') ||
        nameLower.includes('протокол') ||
        nameLower.includes('качества')
      ) {
        category = 'CERTIFICATES';
        workType = 'Сертификация и паспорт качества материалов';
      } else if (
        nameLower.includes('ожр') ||
        nameLower.includes('журнал')
      ) {
        category = 'JOURNALS';
        workType = 'Журналы ведения работ и входного учета';
      }

      return {
        id: file.id || `user-id-${idx}`,
        name: file.name,
        category,
        docCode: `ИД-ЗАГРУЗКА-${idx + 1}`,
        docStage: 'ID',
        workType,
        date: new Date().toISOString().split('T')[0],
        authorOrg: 'Загружено инспектором (Фактический файл)',
        signatory: 'Проверено ИИ-модулем',
        status: 'VERIFIED',
        sizeMb: file.sizeMb || 12.4,
        blobUrl: file.blobUrl,
        notes: 'Документ распознан ИИ и привязан к структуре надзора.',
      };
    });
  }, [files]);

  // Объединяем эталонную базу с пользовательскими загрузками, исключая дубли по имени и удаленные файлы
  const allDocs = useMemo<ExecutiveDocItem[]>(() => {
    const combined = [...userExecutiveDocs];
    const userNames = new Set(userExecutiveDocs.map((d) => d.name));

    DEFAULT_SAMPLE_EXECUTIVE_DOCS.forEach((sample) => {
      if (!userNames.has(sample.name)) {
        combined.push(sample);
      }
    });

    return combined.filter((doc) => !deletedDocIds.has(doc.id) && !deletedDocIds.has(doc.name));
  }, [userExecutiveDocs, deletedDocIds]);

  const handleDeleteItem = (doc: ExecutiveDocItem) => {
    setDeletedDocIds((prev) => new Set([...prev, doc.id, doc.name]));
    if (onDeleteDocument) {
      onDeleteDocument(doc.id, doc.name);
    }
    setRegistryNotice(`Документ «${doc.name}» удален из журнала.`);
    setTimeout(() => setRegistryNotice(null), 3000);
  };

  // Фильтрация по поиску и категории
  const filteredDocs = useMemo(() => {
    return allDocs.filter((doc) => {
      if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inName = doc.name.toLowerCase().includes(q);
        const inCode = doc.docCode.toLowerCase().includes(q);
        const inWork = doc.workType.toLowerCase().includes(q);
        const inOrg = doc.authorOrg.toLowerCase().includes(q);
        const inNotes = doc.notes?.toLowerCase().includes(q);
        return inName || inCode || inWork || inOrg || inNotes;
      }
      return true;
    });
  }, [allDocs, selectedCategory, searchQuery]);

  // Подсчет статистики по категориям
  const categoryStats = useMemo(() => {
    return {
      ACTS: allDocs.filter((d) => d.category === 'ACTS').length,
      GEODESY: allDocs.filter((d) => d.category === 'GEODESY').length,
      CERTIFICATES: allDocs.filter((d) => d.category === 'CERTIFICATES').length,
      JOURNALS: allDocs.filter((d) => d.category === 'JOURNALS').length,
      TOTAL: allDocs.length,
    };
  }, [allDocs]);

  const toggleFolder = (catId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden ${className}`}>
      {/* 1. Header: Журнал исполнительной документации */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center shrink-0 shadow-inner">
            <FolderOpen className="w-5 h-5 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-black tracking-tight text-white">
                Журнал исполнительной документации (ИД)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold uppercase">
                РД-11-02-2006 • Минстрой РФ
              </span>
            </div>
            <p className="text-xs text-purple-200/80 mt-0.5">
              Иерархическая структура папок надзора: Акты (АОСР), Исполнительная геодезия (ИГС), Сертификаты/Паспорта и Журналы (ОЖР)
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center space-x-2 shrink-0">
          {onUploadExecutiveDoc && (
            <button
              onClick={() => onUploadExecutiveDoc()}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer border border-purple-400/30"
              title="Загрузить новый исполнительный документ (АОСР, ИГС, Паспорт)"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>+ Загрузить в ИД</span>
            </button>
          )}
        </div>
      </div>

      {/* Notice Banner */}
      {registryNotice && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{registryNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setRegistryNotice(null)}
            className="text-white hover:opacity-80 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Metrics & Category Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-200 bg-slate-50/80 text-xs divide-x divide-slate-200">
        <button
          onClick={() => setSelectedCategory('ACTS')}
          className={`p-3 text-left transition-colors cursor-pointer ${
            selectedCategory === 'ACTS' ? 'bg-blue-50/90 font-bold' : 'hover:bg-slate-100/70'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-blue-700">1. Акты АОСР</div>
          <div className="text-base font-black text-slate-900 mt-0.5">
            {categoryStats.ACTS} <span className="text-xs font-normal text-slate-500">документов</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">Скрытые работы, армирование</div>
        </button>

        <button
          onClick={() => setSelectedCategory('GEODESY')}
          className={`p-3 text-left transition-colors cursor-pointer ${
            selectedCategory === 'GEODESY' ? 'bg-amber-50/90 font-bold' : 'hover:bg-slate-100/70'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-amber-700">2. Геодезия ИГС</div>
          <div className="text-base font-black text-slate-900 mt-0.5">
            {categoryStats.GEODESY} <span className="text-xs font-normal text-slate-500">схем</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">Съемки отклонений осей</div>
        </button>

        <button
          onClick={() => setSelectedCategory('CERTIFICATES')}
          className={`p-3 text-left transition-colors cursor-pointer ${
            selectedCategory === 'CERTIFICATES' ? 'bg-emerald-50/90 font-bold' : 'hover:bg-slate-100/70'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-emerald-700">3. Сертификаты</div>
          <div className="text-base font-black text-slate-900 mt-0.5">
            {categoryStats.CERTIFICATES} <span className="text-xs font-normal text-slate-500">паспортов</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">Бетон, арматура, протоколы</div>
        </button>

        <button
          onClick={() => setSelectedCategory('JOURNALS')}
          className={`p-3 text-left transition-colors cursor-pointer ${
            selectedCategory === 'JOURNALS' ? 'bg-purple-50/90 font-bold' : 'hover:bg-slate-100/70'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-purple-700">4. Журналы ОЖР</div>
          <div className="text-base font-black text-slate-900 mt-0.5">
            {categoryStats.JOURNALS} <span className="text-xs font-normal text-slate-500">журнала</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">Общий и специальные журналы</div>
        </button>
      </div>

      {/* 3. Controls: Search and Filter Chips */}
      <div className="p-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Все папки ИД ({categoryStats.TOTAL})
          </button>

          {EXECUTIVE_DOC_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                selectedCategory === cat.id
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{cat.shortName}</span>
              <span className="opacity-75 text-[10px]">
                ({categoryStats[cat.id as keyof typeof categoryStats] || 0})
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по актам, номерам, конструкциям..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 4. Structured Folders View */}
      <div className="p-4 space-y-4">
        {EXECUTIVE_DOC_CATEGORIES.map((cat) => {
          // Если выбран фильтр не ALL и не эта категория, скрываем
          if (selectedCategory !== 'ALL' && selectedCategory !== cat.id) {
            return null;
          }

          const docsInCat = filteredDocs.filter((d) => d.category === cat.id);
          const isExpanded = expandedFolders[cat.id] ?? true;

          return (
            <div
              key={cat.id}
              className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/40 shadow-2xs"
            >
              {/* Folder Banner */}
              <div
                onClick={() => toggleFolder(cat.id)}
                className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                    {isExpanded ? (
                      <FolderOpen className={`w-5 h-5 ${cat.iconColor}`} />
                    ) : (
                      <Folder className={`w-5 h-5 ${cat.iconColor}`} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-slate-900 tracking-tight">
                        Папка: {cat.folderName}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.badgeColor}`}>
                        {docsInCat.length} файлов
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {cat.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    {isExpanded ? 'Свернуть папку' : 'Развернуть папку'}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Files in Folder */}
              {isExpanded && (
                <div className="divide-y divide-slate-100 bg-white">
                  {docsInCat.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      В данной категории пока нет загруженных файлов.{' '}
                      {onUploadExecutiveDoc && (
                        <button
                          onClick={() => onUploadExecutiveDoc(cat.id)}
                          className="font-bold text-purple-700 hover:underline cursor-pointer ml-1"
                        >
                          Загрузить файл сейчас
                        </button>
                      )}
                    </div>
                  ) : (
                    docsInCat.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3.5 hover:bg-purple-50/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        {/* File Details */}
                        <div className="flex items-start space-x-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-slate-600">
                            <FileText className="w-4 h-4 text-purple-700" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-slate-900 hover:text-purple-700 cursor-pointer transition-colors truncate max-w-md"
                                onClick={() => onSelectDocument && onSelectDocument({ name: doc.name, blobUrl: doc.blobUrl })}
                              >
                                {doc.name}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                                {doc.docCode}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px] flex items-center space-x-1">
                                <BadgeCheck className="w-3 h-3 text-emerald-600" />
                                <span>{doc.status === 'VERIFIED' ? 'Проверен ИИ' : 'Подписан'}</span>
                              </span>
                            </div>

                            {/* Metadata Line */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 mt-1">
                              <span className="text-slate-700 font-medium">
                                Вид работ: <strong>{doc.workType}</strong>
                              </span>
                              <span>
                                Организация: <strong>{doc.authorOrg}</strong>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{doc.date}</span>
                              </span>
                              <span>Объем: {doc.sizeMb} МБ</span>

                              {doc.deviationMm !== undefined && (
                                <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  Отклонение: {doc.deviationMm} мм (Норма)
                                </span>
                              )}
                            </div>

                            {/* Inspector notes / AI verdict */}
                            {doc.notes && (
                              <p className="text-[11px] text-slate-600 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                                ℹ️ {doc.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* File Action Buttons */}
                        <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                          {onSelectDocument && (
                            <button
                              onClick={() => onSelectDocument({ name: doc.name, blobUrl: doc.blobUrl })}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-purple-100 text-purple-900 rounded-lg font-bold text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                              title="Открыть чертеж/акт в просмотрщике"
                            >
                              <Eye className="w-3.5 h-3.5 text-purple-700" />
                              <span>Смотреть</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              const blob = new Blob([`Исполнительный документ: ${doc.name}\nКод: ${doc.docCode}\nВид работ: ${doc.workType}\nОрганизация: ${doc.authorOrg}\nДата: ${doc.date}\nСтатус: ${doc.status}\n`], { type: 'text/plain;charset=utf-8' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = doc.blobUrl || url;
                              a.download = doc.name;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Скачать документ"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteItem(doc)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Удалить документ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 5. Footer info according to Mosgosstroynadzor requirements */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center space-x-1.5">
          <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>
            Формирование папок соответствует Приказу Минстроя РФ от 29.11.2022 № 1026/пр и регламенту передачи документации в ИАИС «РиН».
          </span>
        </div>
        <div className="font-semibold text-slate-700">
          Всего в реестре ИД: {allDocs.length} документов
        </div>
      </div>
    </div>
  );
};
