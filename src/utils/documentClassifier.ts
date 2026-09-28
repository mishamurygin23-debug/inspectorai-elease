import { DocStage, SectionCode } from '../types';

export interface DocumentClassificationResult {
  stage: DocStage; // 'PD' | 'RD' | 'ID'
  stageCode: 'ПД' | 'РД' | 'ИД';
  stageName: string; // e.g. "ПД — Проектная документация (Эталон)"
  stageBadgeText: string;
  discipline: SectionCode;
  disciplineName: string;
  confidence: number; // 0.0 - 1.0 (e.g. 0.98)
  isBaseline: boolean; // true if PD (reference/benchmark)
  matchedMarkers: string[]; // human-readable explanation of markers
  primaryReason: string; // one-sentence explanation
  suggestedObjectName?: string;
  suggestedDocTitle?: string;
  sheetInfo?: string;
  gostStandardRef: string;
}

/**
 * Maps stage code to Russian representation and standard
 */
export const STAGE_CONFIG: Record<
  DocStage,
  {
    code: 'ПД' | 'РД' | 'ИД';
    title: string;
    badgeColor: string;
    textColor: string;
    bgColor: string;
    borderColor: string;
    standard: string;
    isBaseline: boolean;
    description: string;
  }
> = {
  PD: {
    code: 'ПД',
    title: 'Проектная документация (Эталон)',
    badgeColor: 'bg-blue-600 text-white',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    standard: 'Постановление Правительства РФ № 87',
    isBaseline: true,
    description: 'Утвержденная проектная документация, прошедшая экспертизу. Является эталоном для сверки.',
  },
  RD: {
    code: 'РД',
    title: 'Рабочая документация (РД)',
    badgeColor: 'bg-purple-600 text-white',
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    standard: 'ГОСТ Р 21.101-2020 (СПДС)',
    isBaseline: false,
    description: 'Комплекты рабочих чертежей со штампом «В производство работ». Проверяется на соответствие эталону ПД.',
  },
  ID: {
    code: 'ИД',
    title: 'Исполнительная документация (ИД)',
    badgeColor: 'bg-emerald-600 text-white',
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    standard: 'РД-11-02-2006 / Приказ Минстроя № 1026/пр',
    isBaseline: false,
    description: 'Акты освидетельствования скрытых работ (АОСР), исполнительные схемы и геодезические съемки факта строительства.',
  },
};

/**
 * Disciplines dictionary
 */
export const DISCIPLINE_NAMES: Partial<Record<SectionCode, string>> & Record<string, string> = {
  'АР': 'Архитектурные решения',
  'КР': 'Конструктивные и объемно-планировочные решения',
  'ИОС1': 'Отопление, вентиляция и кондиционирование (ОВ)',
  'ИОС2': 'Водоснабжение и водоотведение (ВК)',
  'ИОС3': 'Электроснабжение и освещение (ЭОМ)',
  'ИОС4': 'Сети связи и автоматизация (СС)',
  'ИОС5': 'Газоснабжение (ГС)',
  'ППМ': 'Мероприятия пожарной безопасности (ПБ)',
  'СПЗУ': 'Схема планировочной организации земельного участка (ПЗУ)',
  'ТХ': 'Технологические решения (ТХ)',
  'ПЗ': 'Пояснительная записка',
  'ПОС': 'Проект организации строительства',
  'ПОД': 'Проект организации работ по сносу (ПОД)',
  'ООС': 'Охрана окружающей среды (ООС)',
  'ОДИ': 'Доступность для маломобильных групп (ОДИ)',
  'ЗУ': 'Земельный участок',
  'СМ': 'Сметная документация',
  'ИН': 'Инженерные изыскания',
};

/**
 * Fast synchronous classification by file name and optional text excerpt
 */
export function classifyDocument(
  fileName: string,
  textContent?: string
): DocumentClassificationResult {
  const fLower = (fileName || '').toLowerCase();
  const tLower = (textContent || '').toLowerCase();
  const combined = `${fLower} ${tLower}`;

  const markers: string[] = [];
  let pdScore = 0;
  let rdScore = 0;
  let idScore = 0;

  // -------------------------------------------------------------
  // 1. ИД (Исполнительная документация) Detection
  // -------------------------------------------------------------
  if (
    combined.includes('аоср') ||
    combined.includes('аоок') ||
    combined.includes('акт освидетельствования') ||
    combined.includes('скрытых работ')
  ) {
    idScore += 80;
    markers.push('Обнаружен Акт освидетельствования скрытых работ (АОСР)');
  }
  if (
    combined.includes('исполнительн') ||
    combined.includes('исполнит_схема') ||
    combined.includes('геодезическ') ||
    combined.includes('съемка') ||
    combined.includes('игс')
  ) {
    idScore += 60;
    markers.push('Обнаружена исполнительная схема / геодезическая съемка факта');
  }
  if (
    combined.includes('выполнено в натуре') ||
    combined.includes('соответствует проекту') ||
    combined.includes('фактическое положение')
  ) {
    idScore += 50;
    markers.push('Штамп исполнительной надписи «Выполнено в натуре по проекту»');
  }
  if (
    combined.includes('общий журнал работ') ||
    combined.includes('ожр') ||
    combined.includes('журнал бетон') ||
    combined.includes('рд-11-02') ||
    combined.includes('1026/пр')
  ) {
    idScore += 55;
    markers.push('Журнал работ / ссылка на норматив ИД РД-11-02-2006');
  }
  if (
    fLower.startsWith('ид') ||
    fLower.includes('_ид_') ||
    fLower.includes('-ид-') ||
    fLower.includes('ид.') ||
    fLower.includes('ид_')
  ) {
    idScore += 50;
    markers.push('В шифре файла указан индекс исполнительной документации «ИД»');
  }

  // -------------------------------------------------------------
  // 2. ПД (Проектная документация / Эталон) Detection
  // -------------------------------------------------------------
  if (
    combined.includes('стадия «п»') ||
    combined.includes('стадия п') ||
    combined.includes('стадия_п') ||
    combined.includes('стадия-п')
  ) {
    pdScore += 70;
    markers.push('Штамп основной надписи: «Стадия П»');
  }
  if (
    combined.includes('проектная документация') ||
    combined.includes('пп рф 87') ||
    combined.includes('постановление 87') ||
    combined.includes('постановление правительства № 87')
  ) {
    pdScore += 65;
    markers.push('Указание состава по Постановлению Правительства РФ № 87 (ПД)');
  }
  if (
    combined.includes('мосгосэкспертиз') ||
    combined.includes('мгэ') ||
    combined.includes('положительное заключение') ||
    combined.includes('госэкспертиз') ||
    combined.includes('ггэ')
  ) {
    pdScore += 60;
    markers.push('Отметка экспертизы проектной документации (МГЭ / ГГЭ)');
  }
  if (
    combined.includes('эталон') ||
    combined.includes('baseline') ||
    combined.includes('утв. мка') ||
    combined.includes('агр') ||
    combined.includes('буклет мка') ||
    combined.includes('гпзу')
  ) {
    pdScore += 50;
    markers.push('Обозначение утвержденного эталона проекта');
  }
  if (
    fLower.includes('-пд-') ||
    fLower.includes('_пд_') ||
    fLower.includes('пд_') ||
    fLower.includes('-п-') ||
    fLower.includes('_п_') ||
    fLower.startsWith('пд')
  ) {
    pdScore += 45;
    markers.push('В имени файла указан шифр стадии «ПД»');
  }
  if (
    combined.includes('том 1') ||
    combined.includes('том 2') ||
    combined.includes('том 3') ||
    combined.includes('том 4') ||
    combined.includes('том 5') ||
    combined.includes('том 6') ||
    combined.includes('раздел 1.') ||
    combined.includes('раздел 2.') ||
    combined.includes('раздел 3.') ||
    combined.includes('раздел 4.') ||
    combined.includes('раздел 5.')
  ) {
    pdScore += 35;
    markers.push('Структура томов проектной документации по ПП РФ № 87');
  }

  // -------------------------------------------------------------
  // 3. РД (Рабочая документация) Detection
  // -------------------------------------------------------------
  if (
    combined.includes('стадия «р»') ||
    combined.includes('стадия р') ||
    combined.includes('стадия_р') ||
    combined.includes('стадия-р')
  ) {
    rdScore += 70;
    markers.push('Штамп основной надписи: «Стадия Р» по ГОСТ Р 21.101-2020');
  }
  if (
    combined.includes('в производство работ') ||
    combined.includes('производство работ') ||
    combined.includes('к производству работ')
  ) {
    rdScore += 75;
    markers.push('Официальный штамп заказчика: «В производство работ»');
  }
  if (
    combined.includes('рабочая документация') ||
    combined.includes('гост р 21.101') ||
    combined.includes('ведомость рабочих чертежей') ||
    combined.includes('основной комплект рабочих чертежей')
  ) {
    rdScore += 60;
    markers.push('Стандарт рабочей документации СПДС (ГОСТ Р 21.101-2020)');
  }
  if (
    combined.includes('изм.') ||
    combined.includes('изм ') ||
    combined.includes('изменение') ||
    combined.includes('лист регистрации изменений')
  ) {
    rdScore += 40;
    markers.push('Штамп внесения изменений (Изм.) в рабочий комплект');
  }
  if (
    fLower.includes('-рд-') ||
    fLower.includes('_рд_') ||
    fLower.includes('рд_') ||
    fLower.includes('-р-') ||
    fLower.includes('_р_') ||
    fLower.startsWith('рд') ||
    fLower.includes('ар1') ||
    fLower.includes('ар2') ||
    fLower.includes('кж0') ||
    fLower.includes('кж1') ||
    fLower.includes('кладочный') ||
    fLower.includes('фасад')
  ) {
    rdScore += 45;
    markers.push('В имени файла указан шифр рабочей документации «РД» / марка листа');
  }

  // Determine winning stage
  let stage: DocStage = 'RD';
  let confidence = 0.85;

  if (idScore > pdScore && idScore > rdScore && idScore >= 40) {
    stage = 'ID';
    confidence = Math.min(0.99, 0.75 + idScore / 250);
  } else if (pdScore > rdScore && pdScore >= 35) {
    stage = 'PD';
    confidence = Math.min(0.99, 0.75 + pdScore / 250);
  } else if (rdScore >= 35) {
    stage = 'RD';
    confidence = Math.min(0.99, 0.75 + rdScore / 250);
  } else {
    // Default heuristics if zero markers found
    if (fLower.includes('пд') || fLower.includes('эталон') || fLower.includes('проект')) {
      stage = 'PD';
      confidence = 0.82;
      markers.push('Определено по наличию ключевого слова «ПД / Проект» в имени файла');
    } else if (fLower.includes('ид') || fLower.includes('акт') || fLower.includes('схема')) {
      stage = 'ID';
      confidence = 0.82;
      markers.push('Определено по наличию ключевого слова «ИД / Акт / Схема» в имени файла');
    } else {
      stage = 'RD';
      confidence = 0.8;
      markers.push('Принято по умолчанию: Рабочая документация (РД) для стройплощадки');
    }
  }

  // -------------------------------------------------------------
  // 4. Discipline Detection (АР, КР, ОВ, ВК, ЭОМ, etc.)
  // -------------------------------------------------------------
  let discipline: SectionCode = 'АР';
  if (
    combined.includes('архитектур') ||
    combined.includes('ар1') ||
    combined.includes('ар2') ||
    combined.includes('-ар') ||
    combined.includes('_ар') ||
    combined.includes('кладочн') ||
    combined.includes('фасад') ||
    combined.includes('витраж') ||
    combined.includes('перегород') ||
    combined.includes('полы')
  ) {
    discipline = 'АР';
  } else if (
    combined.includes('конструк') ||
    combined.includes('кж') ||
    combined.includes('км') ||
    combined.includes('кд') ||
    combined.includes('сваи') ||
    combined.includes('ростверк') ||
    combined.includes('арматур') ||
    combined.includes('железобетон') ||
    combined.includes('опалуб')
  ) {
    discipline = 'КР';
  } else if (
    combined.includes('отоплен') ||
    combined.includes('вентиляц') ||
    combined.includes(' ов') ||
    combined.includes('-ов') ||
    combined.includes('_ов') ||
    combined.includes('климат') ||
    combined.includes('теплоснабж') ||
    combined.includes('радиатор') ||
    combined.includes('воздуховод')
  ) {
    discipline = 'ИОС1';
  } else if (
    combined.includes('водопровод') ||
    combined.includes('канализац') ||
    combined.includes(' вк') ||
    combined.includes('-вк') ||
    combined.includes('_вк') ||
    combined.includes('водоснабж') ||
    combined.includes('ливнев')
  ) {
    discipline = 'ИОС2';
  } else if (
    combined.includes('электр') ||
    combined.includes('эом') ||
    combined.includes('освещен') ||
    combined.includes('щит') ||
    combined.includes('кабель') ||
    combined.includes('трансформатор')
  ) {
    discipline = 'ИОС3';
  } else if (
    combined.includes('связ') ||
    combined.includes(' сс') ||
    combined.includes('-сс') ||
    combined.includes('автоматизац') ||
    combined.includes('скуд') ||
    combined.includes('видеонаблюден')
  ) {
    discipline = 'ИОС4';
  } else if (
    combined.includes('пожарн') ||
    combined.includes('ппм') ||
    combined.includes(' спз') ||
    combined.includes('пб') ||
    combined.includes('огнестойк') ||
    combined.includes('дымоудал')
  ) {
    discipline = 'ППМ';
  } else if (
    combined.includes('пзу') ||
    combined.includes('спзу') ||
    combined.includes('генплан') ||
    combined.includes('земельн') ||
    combined.includes('благоустройств')
  ) {
    discipline = 'СПЗУ';
  } else if (combined.includes('технолог') || combined.includes(' тх') || combined.includes('-тх')) {
    discipline = 'ТХ';
  } else if (combined.includes('пос') || combined.includes('организац строительств')) {
    discipline = 'ПОС';
  } else if (combined.includes('пояснительн') || combined.includes(' пз') || combined.includes('опз')) {
    discipline = 'ПЗ';
  }

  const stageCfg = STAGE_CONFIG[stage];
  const disciplineName = DISCIPLINE_NAMES[discipline] || 'Общие решения';

  const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ');
  const primaryReason =
    markers.length > 0
      ? `Определено автоматически: ${markers[0]}`
      : `Распознан как документ стадии «${stageCfg.code}»`;

  return {
    stage,
    stageCode: stageCfg.code,
    stageName: stageCfg.title,
    stageBadgeText: `${stageCfg.code} • ${stageCfg.title}`,
    discipline,
    disciplineName,
    confidence: +confidence.toFixed(2),
    isBaseline: stageCfg.isBaseline,
    matchedMarkers: markers,
    primaryReason,
    suggestedObjectName: cleanName.length > 5 ? cleanName : undefined,
    suggestedDocTitle: cleanName,
    gostStandardRef: stageCfg.standard,
  };
}

/**
 * Inspects a real File object by slicing the beginning and scanning for strings
 */
export async function classifyFileObject(file: File): Promise<DocumentClassificationResult> {
  let extractedSnippet = '';

  try {
    // Read first 64 KB of file to search for title block / штамп / stamp strings
    const slice = file.slice(0, 65536);
    const buffer = await slice.arrayBuffer();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    extractedSnippet = decoder.decode(buffer);
  } catch (err) {
    console.warn('Fast text slice failed, relying on filename:', err);
  }

  return classifyDocument(file.name, extractedSnippet);
}
