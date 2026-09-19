import React, { useState, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Layers,
  FileText,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Building,
  Compass,
  FileCode,
  Hash
} from 'lucide-react';
import { CheckFinding, DocStage, EvidenceFragment } from '../types';

interface DocumentSheetViewerProps {
  activeFinding: CheckFinding;
  activeStageTab: DocStage;
  setActiveStageTab: (stage: DocStage) => void;
  currentEvidence?: EvidenceFragment;
}

export const DocumentSheetViewer: React.FC<DocumentSheetViewerProps> = ({
  activeFinding,
  activeStageTab,
  setActiveStageTab,
  currentEvidence,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showViolationOverlay, setShowViolationOverlay] = useState<boolean>(true);
  const [showTitleBlock, setShowTitleBlock] = useState<boolean>(true);

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.5, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.75, +(z - 0.25).toFixed(2)));
  const handleResetZoom = () => setZoomLevel(1);

  // Map finding parameter to drawing details
  const getSheetContext = () => {
    switch (activeFinding.param_code) {
      case 'AR-01':
        return {
          title: 'План на отм. 0.000. Высотная посадка здания',
          pdDoc: 'ЖС-РЛ-270121-АР, Лист 3',
          rdDoc: 'РД-2025-04.266-АР1, Лист 2',
          idDoc: 'Акт геодезической разбивки осей №ГР-01',
          pdVal: 'Абс. отметка 165.00 м (ПД)',
          rdVal: 'Абс. отметка 164.18 м (РД)',
          idVal: 'Факт отметка 164.20 м (ИД)',
          discrepancyText: 'Смещение вертикальной привязки чистого пола на -820 мм',
          targetLabel: 'Отм. 0.000 = 164.180 (в ПД 165.000)',
          sheetType: 'PLAN_LEVEL',
        };
      case 'AR-12':
        return {
          title: 'Фасад в осях 1*-14*. Раскладка сэндвич-панелей и витражей',
          pdDoc: 'ЖС-РЛ-270121-АР, Лист 8',
          rdDoc: 'РД-2025-04.266-АР2, Лист 11',
          idDoc: 'АОСР №1-НВФ, Паспорт на панели Венталл-С3',
          pdVal: 'Панели 120 мм (Rukki Rus)',
          rdVal: 'Панели 150 мм (Венталл-С3)',
          idVal: 'Монтаж 150 мм (подтверждено АОСР)',
          discrepancyText: 'Увеличение толщины панели со 120 мм до 150 мм (+25% к постоянной нагрузке на каркас)',
          targetLabel: 'Сэндвич-панель Венталл-С3 δ=150 мм (в ПД 120 мм)',
          sheetType: 'FACADE',
        };
      case 'AR-41':
        return {
          title: 'План 1-го этажа в осях 8-11 / В-Д. Дверные проемы',
          pdDoc: 'ЖС-РЛ-270121-АР, Лист 14',
          rdDoc: 'РД-2025-04.266-АР1, Лист 18',
          idDoc: 'ПАСП-ДВ-01, АОСР №41',
          pdVal: 'Проем 1000 мм (в свету >= 900 мм)',
          rdVal: 'Блок Д-12 800 мм (в свету 790 мм)',
          idVal: 'Факт 790 мм (замер инспектора)',
          discrepancyText: 'Заужение эвакуационного выхода на 200 мм (СП 1.13130.2020 п. 4.2.19)',
          targetLabel: 'Дверь Д-12: 800х2100 (в ПД 1000х2100)',
          sheetType: 'DOOR_PLAN',
        };
      case 'AR-18':
        return {
          title: 'Зона сервиса и погрузки в осях 11-14 / А-Г. Ворота Вр-1..Вр-4',
          pdDoc: 'ЖС-РЛ-270121-АР, Лист 14',
          rdDoc: 'РД-2025-04.266-АР1, Лист 18',
          idDoc: 'Акт установки ворот №АВ-03',
          pdVal: 'Ворота 3.0 х 3.0 м',
          rdVal: 'Ворота 3.3 х 3.6 м',
          idVal: 'Фактический размер 3.3 х 3.6 м',
          discrepancyText: 'Увеличение проемов ворот на 300 мм в ширину и 600 мм в высоту без перерасчета фахверка',
          targetLabel: 'Ворота Вр-1: 3300х3600 (в ПД 3000х3000)',
          sheetType: 'GATE_PLAN',
        };
      case 'OV-08':
        return {
          title: 'План систем отопления Т11/Т21. Серверная и кроссовая',
          pdDoc: 'ЖС-РЛ-270121-АР / ОВ, Лист 6',
          rdDoc: 'РД-2025-04.266-ОВ, Лист 7',
          idDoc: 'Паспорта конвекторов NOBO 2.0 кВт',
          pdVal: 'Водяное отопление от ИТП',
          rdVal: 'Электроконвекторы Q=2.0 кВт',
          idVal: 'Установлены конвекторы NOBO',
          discrepancyText: 'Замена водяного отопления на электроотопление без согласования ТУ Мосэнергосбыта',
          targetLabel: 'Электроконвектор Q=2.0 кВт (в ПД водяное отопление)',
          sheetType: 'HVAC_PLAN',
        };
      case 'KJ-02':
        return {
          title: 'Схема расположения свай свайного поля (364 свай С90.40-8)',
          pdDoc: 'ЖС-РД-270121-ПЗУ, Лист 5',
          rdDoc: 'П-2025-04-266-КЖ01, Лист 4',
          idDoc: 'Исполнительная схема свайного поля №ИС-СВ-01',
          pdVal: 'Отметка срубки голов свай -1.500 м',
          rdVal: 'Отметка срубки голов свай -1.830 м',
          idVal: 'Факт отметка -1.835 м',
          discrepancyText: 'Занижение отметки голов свай на 330 мм без согласования с проектировщиком ПД',
          targetLabel: 'Срубка свай: отм. -1.830 м (в ПД -1.500 м)',
          sheetType: 'FOUNDATION_PLAN',
        };
      case 'NVF-03':
        return {
          title: 'Исполнительная геодезическая схема навесного вентфасада (НВФ)',
          pdDoc: 'СП 58154-2018 (Норматив)',
          rdDoc: 'РД-2025-04.266-АР2, Лист 15',
          idDoc: 'ИД №1-НВФ7.7.2-Кр, Лист 1',
          pdVal: 'Допуск по ГОСТ: ±10 мм',
          rdVal: 'Проектная ось кронштейна',
          idVal: 'Фактическое смещение +18 мм',
          discrepancyText: 'Превышение допустимого отклонения направляющих кронштейнов НВФ (+18 мм > 10 мм)',
          targetLabel: 'Ось 3 / отм. +20.750: смещение +18 мм (допуск ±10 мм)',
          sheetType: 'FACADE_SURVEY',
        };
      default:
        return {
          title: `Чертеж раздела ${activeFinding.section}: ${activeFinding.param_name}`,
          pdDoc: 'ПД Том 3, Лист 12',
          rdDoc: 'РД-2025-04.266, Лист 8',
          idDoc: 'ИД Акт освидетельствования',
          pdVal: activeFinding.expected_value,
          rdVal: activeFinding.actual_value,
          idVal: activeFinding.actual_value,
          discrepancyText: activeFinding.delta,
          targetLabel: `${activeFinding.param_code}: ${activeFinding.actual_value}`,
          sheetType: 'PLAN_LEVEL',
        };
    }
  };

  const sheetCtx = getSheetContext();

  const activeDocName =
    activeStageTab === 'PD'
      ? sheetCtx.pdDoc
      : activeStageTab === 'RD'
      ? sheetCtx.rdDoc
      : sheetCtx.idDoc;

  const activeVal =
    activeStageTab === 'PD'
      ? sheetCtx.pdVal
      : activeStageTab === 'RD'
      ? sheetCtx.rdVal
      : sheetCtx.idVal;

  return (
    <div
      className={`flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-xl transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-32px)]' : 'h-[740px]'
      }`}
    >
      {/* Top Controls & Stage Switcher */}
      <div className="bg-slate-950/90 text-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-purple-950/80 px-2.5 py-1 rounded-lg border border-purple-800/60">
            <Building className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px] font-bold text-purple-200">
              Алтуфьевское ш., 79Б, стр. 1
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1 text-xs text-slate-300">
            <span className="font-semibold text-white">{activeDocName}</span>
          </div>
        </div>

        {/* Action toolbar */}
        <div className="flex items-center space-x-2">
          {/* Layer toggles dropdown or chips */}
          <div className="hidden sm:flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setShowAxes(!showAxes)}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                showAxes ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Сетка строительных осей"
            >
              Оси
            </button>
            <button
              onClick={() => setShowDimensions(!showDimensions)}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                showDimensions ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Размерные цепочки"
            >
              Размеры
            </button>
            <button
              onClick={() => setShowViolationOverlay(!showViolationOverlay)}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                showViolationOverlay ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Выделение нарушения"
            >
              Нарушение
            </button>
            <button
              onClick={() => setShowTitleBlock(!showTitleBlock)}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                showTitleBlock ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Штамп по ГОСТ Р 21.101"
            >
              Штамп
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center space-x-1 bg-slate-900 px-1.5 py-1 rounded-lg border border-slate-800">
            <button
              onClick={handleZoomOut}
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
              title="Уменьшить"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-300 w-9 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
              title="Увеличить"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
              title="Сброс масштаба 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
            title={isFullscreen ? 'Свернуть' : 'На весь экран'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stage Selector Bar: ПД, РД, ИД */}
      <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-medium">Стадия документации:</span>
          <div className="inline-flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveStageTab('PD')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeStageTab === 'PD'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ПД (Проект: ООО «Жилстрой»)
            </button>
            <button
              onClick={() => setActiveStageTab('RD')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeStageTab === 'RD'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              РД (Рабочая: ООО «Моспроекткомплекс»)
            </button>
            <button
              onClick={() => setActiveStageTab('ID')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeStageTab === 'ID'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ИД (Исполнительная: АО «МСУ-1»)
            </button>
          </div>
        </div>

        {/* Discrepancy indicator pill */}
        <div className="hidden lg:flex items-center space-x-2 bg-rose-950/60 border border-rose-800/80 px-3 py-1 rounded-xl text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span className="font-bold text-rose-300">
            {activeFinding.param_code}:
          </span>
          <span className="text-rose-200 line-clamp-1 max-w-sm">
            {sheetCtx.discrepancyText}
          </span>
        </div>
      </div>

      {/* Main Drawing Sheet Viewport */}
      <div className="relative flex-1 bg-[#0f172a] overflow-auto flex items-center justify-center p-4 select-none">
        {/* Engineering Blueprint Paper Container */}
        <div
          className="relative bg-[#1e293b] border-2 border-slate-600 shadow-2xl transition-transform duration-150 origin-center text-slate-300"
          style={{
            width: '940px',
            height: '560px',
            transform: `scale(${zoomLevel})`,
          }}
        >
          {/* Blueprint Grid Lines Pattern */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:20px_20px]"></div>

          {/* Blueprint Outer Frame per ГОСТ Р 21.101 (20 мм слева, по 5 мм с остальных сторон) */}
          <div className="absolute inset-[10px] border border-slate-500/70 pointer-events-none"></div>

          {/* Construction Drawing Content by Sheet Type */}
          <div className="absolute inset-[15px] p-4 flex flex-col justify-between overflow-hidden">
            {/* Top Sheet Header and Legend */}
            <div className="flex items-start justify-between text-[11px] text-slate-300 border-b border-slate-700/80 pb-2">
              <div>
                <span className="font-bold text-white uppercase tracking-wider text-xs">
                  {sheetCtx.title}
                </span>
                <div className="text-[10px] text-slate-400">
                  Объект: Торговое здание по адресу: г. Москва, Алтуфьевское шоссе, вл. 79Б, стр. 1 (ООО «ФИРМА РУСЬ ТРЕЙ»)
                </div>
              </div>
              <div className="text-right font-mono text-[10px]">
                <div className="text-purple-300 font-bold">
                  {activeStageTab === 'PD' ? 'СТАДИЯ «П»' : activeStageTab === 'RD' ? 'СТАДИЯ «Р»' : 'ИСПОЛНИТЕЛЬНЫЙ ЧЕРТЕЖ'}
                </div>
                <div className="text-slate-400">Масштаб 1:100 • Формат А1</div>
              </div>
            </div>

            {/* Middle: Architectural Vector Graphic */}
            <div className="relative flex-1 my-2 flex items-center justify-center">
              <svg
                className="w-full h-full text-slate-400 font-mono"
                viewBox="0 0 900 420"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* 1. Structural Axes (1 to 14, А to Ж) */}
                {showAxes && (
                  <g className="axes text-slate-500 stroke-slate-500/60 stroke-[1] stroke-dasharray-[4 2]">
                    {/* Vertical axes */}
                    <line x1="120" y1="40" x2="120" y2="350" strokeDasharray="6 3" />
                    <line x1="240" y1="40" x2="240" y2="350" strokeDasharray="6 3" />
                    <line x1="360" y1="40" x2="360" y2="350" strokeDasharray="6 3" />
                    <line x1="480" y1="40" x2="480" y2="350" strokeDasharray="6 3" />
                    <line x1="600" y1="40" x2="600" y2="350" strokeDasharray="6 3" />
                    <line x1="720" y1="40" x2="720" y2="350" strokeDasharray="6 3" />
                    <line x1="820" y1="40" x2="820" y2="350" strokeDasharray="6 3" />

                    {/* Horizontal axes */}
                    <line x1="90" y1="90" x2="850" y2="90" strokeDasharray="6 3" />
                    <line x1="90" y1="180" x2="850" y2="180" strokeDasharray="6 3" />
                    <line x1="90" y1="270" x2="850" y2="270" strokeDasharray="6 3" />

                    {/* Axis Labels in Circles */}
                    <g fill="#1e293b" stroke="#64748b" strokeWidth="1.5">
                      {/* Top circles (1 to 14) */}
                      <circle cx="120" cy="30" r="10" />
                      <circle cx="240" cy="30" r="10" />
                      <circle cx="360" cy="30" r="10" />
                      <circle cx="480" cy="30" r="10" />
                      <circle cx="600" cy="30" r="10" />
                      <circle cx="720" cy="30" r="10" />
                      <circle cx="820" cy="30" r="10" />

                      {/* Left circles (А, В, Д, Ж) */}
                      <circle cx="80" cy="90" r="10" />
                      <circle cx="80" cy="180" r="10" />
                      <circle cx="80" cy="270" r="10" />
                    </g>

                    <g fill="#cbd5e1" fontSize="10" textAnchor="middle" dominantBaseline="central">
                      <text x="120" y="30">1</text>
                      <text x="240" y="30">3</text>
                      <text x="360" y="30">6</text>
                      <text x="480" y="30">8</text>
                      <text x="600" y="30">11</text>
                      <text x="720" y="30">13</text>
                      <text x="820" y="30">14</text>

                      <text x="80" y="90">А</text>
                      <text x="80" y="180">В</text>
                      <text x="80" y="270">Ж</text>
                    </g>
                  </g>
                )}

                {/* 2. Outer building walls and contour */}
                <rect
                  x="120"
                  y="90"
                  width="700"
                  height="180"
                  fill="#0f172a"
                  fillOpacity="0.5"
                  stroke="#94a3b8"
                  strokeWidth="3"
                />

                {/* Internal partitions and rooms */}
                {/* Room 1: Торговый зал автозапчастей */}
                <rect x="120" y="90" width="360" height="180" fill="none" stroke="#64748b" strokeWidth="2" />
                {/* Room 2: Зона технического обслуживания */}
                <rect x="480" y="90" width="240" height="120" fill="none" stroke="#64748b" strokeWidth="2" />
                {/* Room 3: Склад автозапчастей */}
                <rect x="480" y="210" width="240" height="60" fill="none" stroke="#64748b" strokeWidth="2" />
                {/* Room 4: Серверная и ИТП */}
                <rect x="720" y="90" width="100" height="90" fill="none" stroke="#64748b" strokeWidth="2" />
                {/* Room 5: Мойка на 2 поста */}
                <rect x="720" y="180" width="100" height="90" fill="none" stroke="#64748b" strokeWidth="2" />

                {/* Room Labels and Area tags */}
                <g fill="#94a3b8" fontSize="10">
                  <text x="210" y="130" fontWeight="bold">101. Торговый зал</text>
                  <text x="210" y="145" fill="#64748b">S = 577.2 м²</text>

                  <text x="500" y="130" fontWeight="bold">102. Зона ТО и сервиса</text>
                  <text x="500" y="145" fill="#64748b">S = 1289.3 м²</text>

                  <text x="500" y="235" fontWeight="bold">103. Склад деталей</text>
                  <text x="500" y="250" fill="#64748b">S = 1012.4 м²</text>

                  <text x="730" y="120" fontWeight="bold">104. Серверная</text>
                  <text x="730" y="135" fill="#64748b">S = 11.4 м²</text>

                  <text x="730" y="215" fontWeight="bold">105. Мойка</text>
                  <text x="730" y="230" fill="#64748b">S = 165.9 м²</text>
                </g>

                {/* Columns (Ж/Б колонны 400х400 в узлах сетки) */}
                <g fill="#cbd5e1">
                  <rect x="115" y="85" width="10" height="10" />
                  <rect x="235" y="85" width="10" height="10" />
                  <rect x="355" y="85" width="10" height="10" />
                  <rect x="475" y="85" width="10" height="10" />
                  <rect x="595" y="85" width="10" height="10" />
                  <rect x="715" y="85" width="10" height="10" />
                  <rect x="815" y="85" width="10" height="10" />

                  <rect x="115" y="175" width="10" height="10" />
                  <rect x="235" y="175" width="10" height="10" />
                  <rect x="355" y="175" width="10" height="10" />
                  <rect x="475" y="175" width="10" height="10" />
                  <rect x="595" y="175" width="10" height="10" />
                  <rect x="715" y="175" width="10" height="10" />
                  <rect x="815" y="175" width="10" height="10" />

                  <rect x="115" y="265" width="10" height="10" />
                  <rect x="235" y="265" width="10" height="10" />
                  <rect x="355" y="265" width="10" height="10" />
                  <rect x="475" y="265" width="10" height="10" />
                  <rect x="595" y="265" width="10" height="10" />
                  <rect x="715" y="265" width="10" height="10" />
                  <rect x="815" y="265" width="10" height="10" />
                </g>

                {/* Gates and Doors */}
                {/* Gate 1 (Вр-1) in zone ТО */}
                <line x1="530" y1="270" x2="590" y2="270" stroke="#38bdf8" strokeWidth="4" />
                <text x="545" y="288" fill="#38bdf8" fontSize="9" fontWeight="bold">Вр-1</text>

                {/* Door 12 (Д-12) Exit from Торговый зал */}
                <line x1="390" y1="270" x2="430" y2="270" stroke="#f43f5e" strokeWidth="4" />
                <path d="M 390 270 A 40 40 0 0 1 430 310" stroke="#f43f5e" strokeWidth="1" strokeDasharray="2 2" fill="none" />
                <text x="400" y="288" fill="#f43f5e" fontSize="9" fontWeight="bold">Д-12</text>

                {/* Dimensions Chains */}
                {showDimensions && (
                  <g stroke="#94a3b8" strokeWidth="1" fill="#94a3b8" fontSize="9">
                    {/* Top dimension chain */}
                    <line x1="120" y1="65" x2="820" y2="65" />
                    <line x1="120" y1="60" x2="120" y2="70" />
                    <line x1="480" y1="60" x2="480" y2="70" />
                    <line x1="820" y1="60" x2="820" y2="70" />
                    <text x="290" y="60" textAnchor="middle">36 000</text>
                    <text x="640" y="60" textAnchor="middle">34 000</text>

                    {/* Left dimension chain */}
                    <line x1="105" y1="90" x2="105" y2="270" />
                    <line x1="100" y1="90" x2="110" y2="90" />
                    <line x1="100" y1="180" x2="110" y2="180" />
                    <line x1="100" y1="270" x2="110" y2="270" />
                    <text x="95" y="140" textAnchor="end">9 000</text>
                    <text x="95" y="230" textAnchor="end">9 000</text>
                  </g>
                )}

                {/* Level Elevation Mark for 0.000 */}
                <g transform="translate(140, 190)">
                  <path d="M 0 0 L 15 -15 L 45 -15 L 0 0 Z" fill="#38bdf8" />
                  <line x1="15" y1="-15" x2="110" y2="-15" stroke="#38bdf8" strokeWidth="1.5" />
                  <text x="20" y="-20" fill="#38bdf8" fontSize="10" fontWeight="bold">
                    ▼ 0.000 ({activeStageTab === 'PD' ? '165.000' : '164.180'})
                  </text>
                </g>

                {/* 3. DYNAMIC VIOLATION CALLOUT & RADAR HIGHLIGHT */}
                {showViolationOverlay && (
                  <g className="violation-overlay">
                    {/* Choose coordinates based on active finding */}
                    {activeFinding.param_code === 'AR-41' && (
                      /* Door D-12 highlight */
                      <g transform="translate(410, 270)">
                        <circle cx="0" cy="0" r="32" fill="#f43f5e" fillOpacity="0.25" stroke="#f43f5e" strokeWidth="2">
                          <animate attributeName="r" values="24;36;24" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="fill-opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <rect x="-25" y="-15" width="50" height="30" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeDasharray="4 2" />
                        {/* Leader line pointing to box */}
                        <line x1="0" y1="25" x2="60" y2="70" stroke="#f43f5e" strokeWidth="2" />
                        <line x1="60" y1="70" x2="280" y2="70" stroke="#f43f5e" strokeWidth="2" />
                      </g>
                    )}

                    {activeFinding.param_code === 'AR-01' && (
                      /* Elevation 0.000 mark highlight */
                      <g transform="translate(190, 175)">
                        <circle cx="0" cy="0" r="30" fill="#f43f5e" fillOpacity="0.25" stroke="#f43f5e" strokeWidth="2">
                          <animate attributeName="r" values="22;34;22" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <line x1="0" y1="20" x2="80" y2="70" stroke="#f43f5e" strokeWidth="2" />
                        <line x1="80" y1="70" x2="300" y2="70" stroke="#f43f5e" strokeWidth="2" />
                      </g>
                    )}

                    {activeFinding.param_code === 'AR-12' && (
                      /* Facade sandwich panels along axis 1-14 */
                      <g transform="translate(300, 90)">
                        <rect x="-40" y="-12" width="220" height="24" fill="#f43f5e" fillOpacity="0.25" stroke="#f43f5e" strokeWidth="2">
                          <animate attributeName="stroke-width" values="2;3.5;2" dur="1.5s" repeatCount="indefinite" />
                        </rect>
                        <line x1="70" y1="-12" x2="120" y2="-45" stroke="#f43f5e" strokeWidth="2" />
                        <line x1="120" y1="-45" x2="360" y2="-45" stroke="#f43f5e" strokeWidth="2" />
                      </g>
                    )}

                    {activeFinding.param_code === 'AR-18' && (
                      /* Gates Вр-1 highlight */
                      <g transform="translate(560, 270)">
                        <circle cx="0" cy="0" r="30" fill="#f43f5e" fillOpacity="0.25" stroke="#f43f5e" strokeWidth="2">
                          <animate attributeName="r" values="24;36;24" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <line x1="0" y1="20" x2="60" y2="65" stroke="#f43f5e" strokeWidth="2" />
                        <line x1="60" y1="65" x2="280" y2="65" stroke="#f43f5e" strokeWidth="2" />
                      </g>
                    )}

                    {activeFinding.param_code === 'OV-08' && (
                      /* Server room heating highlight */
                      <g transform="translate(760, 130)">
                        <circle cx="0" cy="0" r="28" fill="#f43f5e" fillOpacity="0.25" stroke="#f43f5e" strokeWidth="2">
                          <animate attributeName="r" values="20;32;20" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <line x1="-15" y1="15" x2="-80" y2="60" stroke="#f43f5e" strokeWidth="2" />
                        <line x1="-80" y1="60" x2="-300" y2="60" stroke="#f43f5e" strokeWidth="2" />
                      </g>
                    )}

                    {activeFinding.param_code === 'KJ-02' && (
                      /* Foundation piles level highlight */
                      <g transform="translate(360, 180)">
                        <circle cx="0" cy="0" r="30" fill="#f43f5e" fillOpacity="0.25" stroke="#f43f5e" strokeWidth="2">
                          <animate attributeName="r" values="22;35;22" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <line x1="0" y1="20" x2="70" y2="70" stroke="#f43f5e" strokeWidth="2" />
                        <line x1="70" y1="70" x2="300" y2="70" stroke="#f43f5e" strokeWidth="2" />
                      </g>
                    )}

                    {activeFinding.param_code === 'NVF-03' && (
                      /* Facade brackets survey highlight */
                      <g transform="translate(720, 90)">
                        <circle cx="0" cy="0" r="28" fill="#f43f5e" fillOpacity="0.25" stroke="#f43f5e" strokeWidth="2">
                          <animate attributeName="r" values="20;32;20" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <line x1="-15" y1="-10" x2="-70" y2="-45" stroke="#f43f5e" strokeWidth="2" />
                        <line x1="-70" y1="-45" x2="-300" y2="-45" stroke="#f43f5e" strokeWidth="2" />
                      </g>
                    )}
                  </g>
                )}
              </svg>

              {/* Floating HTML Annotation Card on top of the leader line */}
              {showViolationOverlay && (
                <div
                  className="absolute pointer-events-auto bg-slate-950/95 border-2 border-rose-500 text-white rounded-xl p-3 shadow-2xl backdrop-blur-md max-w-sm"
                  style={{
                    bottom: activeFinding.param_code === 'AR-12' ? 'auto' : '20px',
                    top: activeFinding.param_code === 'AR-12' ? '20px' : 'auto',
                    right: activeFinding.param_code === 'OV-08' || activeFinding.param_code === 'NVF-03' ? 'auto' : '30px',
                    left: activeFinding.param_code === 'OV-08' || activeFinding.param_code === 'NVF-03' ? '40px' : 'auto',
                  }}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <span className="bg-rose-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow">
                      {activeFinding.param_code} • {activeStageTab}
                    </span>
                    <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Нарушение в чертеже
                    </span>
                  </div>

                  <div className="pt-2 text-xs space-y-1">
                    <div className="font-bold text-white leading-snug">
                      {sheetCtx.targetLabel}
                    </div>
                    <div className="text-[11px] text-slate-300">
                      {sheetCtx.discrepancyText}
                    </div>

                    <div className="pt-1.5 flex items-center justify-between text-[10px] border-t border-slate-800/80">
                      <span className="text-slate-400">Текущий лист: <strong>{activeDocName}</strong></span>
                      <span className="text-emerald-400 font-mono">Штамп: В производство</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Title Block (Штамп ГОСТ Р 21.101-2020) */}
            {showTitleBlock && (
              <div className="bg-slate-950/95 border border-slate-600 rounded-md p-2 flex items-center justify-between text-[9px] font-mono text-slate-300 mt-1">
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">Разраб.:</span>
                    <span className="text-slate-200">Ряполов А.В.</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Пров.:</span>
                    <span className="text-slate-200">Новиков С.И.</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">ГИП:</span>
                    <span className="text-slate-200">Ширинов Р.М.</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Н. контр.:</span>
                    <span className="text-slate-200">Кононыхина О.</span>
                  </div>
                </div>

                <div className="border-l border-r border-slate-700 px-4 text-center">
                  <div className="font-bold text-slate-100 text-[10px]">
                    ООО «ФИРМА РУСЬ ТРЕЙ»
                  </div>
                  <div className="text-slate-400 text-[9px] line-clamp-1">
                    Алтуфьевское шоссе, вл. 79Б, стр. 1
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-purple-300">
                    {activeStageTab === 'PD' ? 'ООО «Жилстрой»' : 'ООО «Моспроекткомплекс»'}
                  </div>
                  <div className="text-slate-400">
                    {activeDocName} • Ред. 2026
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-slate-950 px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 text-xs">
        <div className="flex items-center space-x-2 text-slate-300">
          <FileText className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-slate-400">Привязка фрагмента:</span>
          <span className="font-semibold text-white">{activeDocName}</span>
          <span className="text-slate-600">•</span>
          <span className="font-mono text-[11px] text-purple-300">{activeVal}</span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Нормализация BBox: [0;1] CropBox
          </span>
          <span className="text-slate-600">•</span>
          <span>OCR Exact Match: 98.4%</span>
        </div>
      </div>
    </div>
  );
};
