import React, { useState } from 'react';
import {
  X,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Scan,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  SplitSquareHorizontal,
  Compass,
  FileCheck2,
  FileText,
  Sliders,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Suspicion } from '../types';

interface DrawingCollisionVisualizerModalProps {
  suspicion: Suspicion;
  onClose: () => void;
  onPromoteToCandidate?: (id: number) => void;
  onNavigateToParserTab?: () => void;
}

export const DrawingCollisionVisualizerModal: React.FC<DrawingCollisionVisualizerModalProps> = ({
  suspicion,
  onClose,
  onPromoteToCandidate,
  onNavigateToParserTab,
}) => {
  // Visualizer Mode: 'SIDE_BY_SIDE' (Сравнение кропов) | 'OVERLAY' (Наложение кальки)
  const [viewMode, setViewMode] = useState<'SIDE_BY_SIDE' | 'OVERLAY'>('SIDE_BY_SIDE');
  
  // Overlay slider value (0 = 100% PD, 100 = 100% RD)
  const [overlaySlider, setOverlaySlider] = useState<number>(50);

  // Active CV Layers
  const [activeLayers, setActiveLayers] = useState<{
    bbox: boolean;
    elevations: boolean;
    dimensions: boolean;
    stamp: boolean;
  }>({
    bbox: true,
    elevations: true,
    dimensions: true,
    stamp: true,
  });

  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const toggleLayer = (layerKey: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Extract simulated coordinates and sheet info based on suspicion discipline & references
  const sheetMeta = {
    pdSheet: suspicion.pd_reference.includes('л.') ? suspicion.pd_reference.split('(')[0] : 'ПД: Раздел 2, Лист 4',
    rdSheet: suspicion.rd_reference.includes('л.') ? suspicion.rd_reference.split('(')[0] : 'РД: АР2-04, Лист 8',
    gridAxes: suspicion.discipline === 'КР' ? 'Оси 3-5 / В-Е' : suspicion.discipline === 'ОВ' ? 'Оси 2-3 / Б' : 'Оси 1-4 / А-Д',
    elevationMarkPd: suspicion.description.includes('отметк') ? '▼ +3.600' : 'Узел С-1 (EI 150)',
    elevationMarkRd: suspicion.description.includes('отметк') ? '▼ +3.450' : 'Узел С-3 (EI 90)',
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/30 text-purple-400 border border-purple-500/40 flex items-center justify-center">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {suspicion.discipline || 'АР'} • Computer Vision BBox
                </span>
                <span className="text-xs text-slate-400">• Точность распознавания: {Math.round(suspicion.confidence * 100)}%</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white mt-0.5 line-clamp-1">
                {suspicion.description}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View mode toggle */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700 text-xs">
              <button
                onClick={() => setViewMode('SIDE_BY_SIDE')}
                className={`px-3 py-1 rounded-lg font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  viewMode === 'SIDE_BY_SIDE'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5" />
                <span>Сплит (ПД vs РД)</span>
              </button>
              <button
                onClick={() => setViewMode('OVERLAY')}
                className={`px-3 py-1 rounded-lg font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  viewMode === 'OVERLAY'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Калька (Наложение)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar: CV Layer Toggles & Zoom */}
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-bold mr-1">CV-слои чертежа:</span>
            
            <button
              onClick={() => toggleLayer('bbox')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeLayers.bbox
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Зона коллизии (BBox)</span>
            </button>

            <button
              onClick={() => toggleLayer('elevations')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeLayers.elevations
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Высотные отметки (▼)</span>
            </button>

            <button
              onClick={() => toggleLayer('dimensions')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeLayers.dimensions
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              <span>Размерные цепочки</span>
            </button>

            <button
              onClick={() => toggleLayer('stamp')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeLayers.stamp
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Штамп ГОСТ Р 21.101</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Оси: <strong className="text-slate-200">{sheetMeta.gridAxes}</strong></span>
            <div className="h-4 w-px bg-slate-700 mx-1"></div>
            <button
              onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title="Уменьшить"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-slate-300 w-10 text-center">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title="Увеличить"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Visualizer Canvas Area */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 flex flex-col justify-center items-center min-h-[360px]">
          {viewMode === 'SIDE_BY_SIDE' ? (
            /* SIDE BY SIDE VIEW: PD vs RD */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full max-w-4xl" style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center', transition: 'transform 0.15s ease' }}>
              
              {/* Left: PD Frame (Blue/Emerald accent) */}
              <div className="bg-slate-900 border-2 border-blue-500/40 rounded-xl overflow-hidden flex flex-col shadow-lg">
                <div className="bg-blue-950/80 px-3 py-2 border-b border-blue-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                    <span className="font-black text-blue-300 uppercase tracking-wide">Эталон экспертизы (Стадия ПД)</span>
                  </div>
                  <span className="text-blue-200/70 font-mono text-[11px] truncate max-w-[180px]">{sheetMeta.pdSheet}</span>
                </div>

                <div className="flex-1 relative bg-slate-900/90 p-6 flex flex-col justify-center items-center min-h-[260px] select-none">
                  {/* Drawing Background Grid Lines */}
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  
                  {/* Blueprint geometry simulation */}
                  <svg className="w-full h-48 stroke-slate-600" viewBox="0 0 300 160" fill="none">
                    <line x1="20" y1="30" x2="280" y2="30" strokeDasharray="4 4" stroke="#64748b" strokeWidth="1" />
                    <line x1="20" y1="130" x2="280" y2="130" strokeDasharray="4 4" stroke="#64748b" strokeWidth="1" />
                    <line x1="60" y1="10" x2="60" y2="150" strokeDasharray="4 4" stroke="#64748b" strokeWidth="1" />
                    <line x1="240" y1="10" x2="240" y2="150" strokeDasharray="4 4" stroke="#64748b" strokeWidth="1" />
                    
                    {/* Axis bubbles */}
                    <circle cx="60" cy="15" r="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                    <text x="60" y="19" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">1</text>
                    <circle cx="240" cy="15" r="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                    <text x="240" y="19" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">2</text>

                    {/* Structural Wall / Slab in PD */}
                    <rect x="60" y="30" width="180" height="24" fill="#0284c7" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="2" />
                    <text x="150" y="46" fill="#e0f2fe" fontSize="11" textAnchor="middle" fontWeight="bold">
                      {suspicion.discipline === 'КР' ? 'Плита h=300 мм' : 'Сэндвич-панель EI 150'}
                    </text>

                    {/* Dimension Line in PD */}
                    {activeLayers.dimensions && (
                      <g stroke="#06b6d4" strokeWidth="1.5">
                        <line x1="60" y1="75" x2="240" y2="75" />
                        <line x1="60" y1="70" x2="60" y2="80" />
                        <line x1="240" y1="70" x2="240" y2="80" />
                        <text x="150" y="70" fill="#22d3ee" fontSize="10" textAnchor="middle" stroke="none" fontWeight="bold">
                          6 000 мм (по проекту)
                        </text>
                      </g>
                    )}

                    {/* Elevation marker */}
                    {activeLayers.elevations && (
                      <g>
                        <polygon points="60,30 55,20 65,20" fill="#f59e0b" />
                        <text x="75" y="24" fill="#fbbf24" fontSize="10" fontWeight="bold">
                          {sheetMeta.elevationMarkPd}
                        </text>
                      </g>
                    )}
                  </svg>

                  {/* Stamp indicator */}
                  {activeLayers.stamp && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-blue-950/80 border border-blue-500/40 rounded text-[10px] text-blue-300 font-mono">
                      [Штамп Мосгорэкспертизы: Положительное заключение]
                    </div>
                  )}

                  <div className="mt-2 text-center text-xs text-blue-300 font-medium px-4">
                    {suspicion.pd_reference}
                  </div>
                </div>
              </div>

              {/* Right: RD Frame (Rose/Violation accent) */}
              <div className="bg-slate-900 border-2 border-rose-500/60 rounded-xl overflow-hidden flex flex-col shadow-lg">
                <div className="bg-rose-950/80 px-3 py-2 border-b border-rose-500/40 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    <span className="font-black text-rose-300 uppercase tracking-wide">Рабочий чертеж (Факт в РД)</span>
                  </div>
                  <span className="text-rose-200/70 font-mono text-[11px] truncate max-w-[180px]">{sheetMeta.rdSheet}</span>
                </div>

                <div className="flex-1 relative bg-slate-900/90 p-6 flex flex-col justify-center items-center min-h-[260px] select-none">
                  {/* Drawing Background Grid Lines */}
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f43f5e_1px,transparent_1px)] [background-size:16px_16px]"></div>

                  {/* Blueprint geometry simulation in RD */}
                  <svg className="w-full h-48 stroke-slate-600" viewBox="0 0 300 160" fill="none">
                    <line x1="20" y1="30" x2="280" y2="30" strokeDasharray="4 4" stroke="#64748b" strokeWidth="1" />
                    <line x1="20" y1="130" x2="280" y2="130" strokeDasharray="4 4" stroke="#64748b" strokeWidth="1" />
                    <line x1="60" y1="10" x2="60" y2="150" strokeDasharray="4 4" stroke="#64748b" strokeWidth="1" />
                    <line x1="240" y1="10" x2="240" y2="150" strokeDasharray="4 4" stroke="#64748b" strokeWidth="1" />
                    
                    {/* Axis bubbles */}
                    <circle cx="60" cy="15" r="8" fill="#1e293b" stroke="#f43f5e" strokeWidth="1.5" />
                    <text x="60" y="19" fill="#f43f5e" fontSize="10" textAnchor="middle" fontWeight="bold">1</text>
                    <circle cx="240" cy="15" r="8" fill="#1e293b" stroke="#f43f5e" strokeWidth="1.5" />
                    <text x="240" y="19" fill="#f43f5e" fontSize="10" textAnchor="middle" fontWeight="bold">2</text>

                    {/* Structural Wall / Slab in RD with discrepancy */}
                    <rect x="60" y="30" width="180" height="18" fill="#e11d48" fillOpacity="0.3" stroke="#f43f5e" strokeWidth="2" />
                    <text x="150" y="44" fill="#ffe4e6" fontSize="11" textAnchor="middle" fontWeight="bold">
                      {suspicion.discipline === 'КР' ? 'Плита h=250 мм (Занижено)' : 'Панель Венталл EI 90 (Занижено)'}
                    </text>

                    {/* Dimension Line in RD */}
                    {activeLayers.dimensions && (
                      <g stroke="#f43f5e" strokeWidth="1.5">
                        <line x1="60" y1="75" x2="240" y2="75" />
                        <line x1="60" y1="70" x2="60" y2="80" />
                        <line x1="240" y1="70" x2="240" y2="80" />
                        <text x="150" y="70" fill="#fb7185" fontSize="10" textAnchor="middle" stroke="none" fontWeight="bold">
                          {suspicion.discipline === 'КР' ? 'Расход стали +28%' : 'Занижение предела огнестойкости'}
                        </text>
                      </g>
                    )}

                    {/* Elevation marker in RD */}
                    {activeLayers.elevations && (
                      <g>
                        <polygon points="60,30 55,20 65,20" fill="#ef4444" />
                        <text x="75" y="24" fill="#f87171" fontSize="10" fontWeight="bold">
                          {sheetMeta.elevationMarkRd}
                        </text>
                      </g>
                    )}

                    {/* Bounding Box Highlight */}
                    {activeLayers.bbox && (
                      <g>
                        <rect x="52" y="22" width="196" height="34" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="6 3" />
                        <rect x="52" y="6" width="110" height="16" fill="#ef4444" rx="3" />
                        <text x="56" y="18" fill="#ffffff" fontSize="9" fontWeight="black">
                          ИИ КОЛЛИЗИЯ (94%)
                        </text>
                      </g>
                    )}
                  </svg>

                  {/* Stamp indicator */}
                  {activeLayers.stamp && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-rose-950/80 border border-rose-500/40 rounded text-[10px] text-rose-300 font-mono">
                      [Штамп подрядчика: «В производство работ» от 28.11]
                    </div>
                  )}

                  <div className="mt-2 text-center text-xs text-rose-300 font-medium px-4">
                    {suspicion.rd_reference}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* OVERLAY VIEW (Калька: ПД и РД на одном чертеже со свайпом) */
            <div className="w-full max-w-3xl bg-slate-900 border-2 border-purple-500/50 rounded-xl overflow-hidden flex flex-col shadow-xl" style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center', transition: 'transform 0.15s ease' }}>
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-slate-200">Режим кальки: Сравнение совмещенных контуров (ПД vs РД)</span>
                </div>
                <span className="text-slate-400">Сдвиг геометрии / Расхождение толщин выделены красным</span>
              </div>

              <div className="relative p-6 bg-slate-950 min-h-[300px] flex items-center justify-center select-none overflow-hidden">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px]"></div>

                <svg className="w-full h-56" viewBox="0 0 340 180" fill="none">
                  {/* Reference Grid */}
                  <line x1="30" y1="40" x2="310" y2="40" strokeDasharray="4 4" stroke="#475569" strokeWidth="1" />
                  <line x1="80" y1="20" x2="80" y2="160" strokeDasharray="4 4" stroke="#475569" strokeWidth="1" />
                  <line x1="260" y1="20" x2="260" y2="160" strokeDasharray="4 4" stroke="#475569" strokeWidth="1" />

                  {/* Layer 1: PD (Blue) - Opacity controlled by 1 - overlaySlider */}
                  <g opacity={1 - overlaySlider / 120}>
                    <rect x="80" y="40" width="180" height="30" fill="#0284c7" fillOpacity="0.4" stroke="#38bdf8" strokeWidth="2" />
                    <text x="170" y="58" fill="#38bdf8" fontSize="11" textAnchor="middle" fontWeight="bold">
                      Контур ПД (Эталон): h=300 мм
                    </text>
                  </g>

                  {/* Layer 2: RD (Red) - Opacity controlled by overlaySlider */}
                  <g opacity={overlaySlider / 100}>
                    <rect x="80" y="40" width="180" height="20" fill="#e11d48" fillOpacity="0.5" stroke="#f43f5e" strokeWidth="2.5" />
                    <text x="170" y="54" fill="#fecdd3" fontSize="11" textAnchor="middle" fontWeight="bold">
                      Контур РД (Факт): h=250 мм
                    </text>
                  </g>

                  {/* Visual Clash Hatching / Delta */}
                  {activeLayers.bbox && (
                    <g>
                      <rect x="80" y="60" width="180" height="10" fill="#ef4444" fillOpacity="0.6" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" />
                      <text x="170" y="68" fill="#ffffff" fontSize="9" textAnchor="middle" fontWeight="bold">
                        ▲ ДЕЛЬТА НЕСООТВЕТСТВИЯ: -50 мм (Коллизия)
                      </text>
                    </g>
                  )}

                  {/* Axis labels */}
                  <circle cx="80" cy="20" r="9" fill="#1e293b" stroke="#a855f7" strokeWidth="1.5" />
                  <text x="80" y="24" fill="#c084fc" fontSize="10" textAnchor="middle" fontWeight="bold">A</text>
                  <circle cx="260" cy="20" r="9" fill="#1e293b" stroke="#a855f7" strokeWidth="1.5" />
                  <text x="260" y="24" fill="#c084fc" fontSize="10" textAnchor="middle" fontWeight="bold">Б</text>
                </svg>
              </div>

              {/* Slider for overlay transparency */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center space-x-4">
                <span className="text-xs font-bold text-blue-400">100% ПД (Проект)</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={overlaySlider}
                  onChange={(e) => setOverlaySlider(Number(e.target.value))}
                  className="flex-1 accent-purple-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
                <span className="text-xs font-bold text-rose-400">100% РД (Рабочка)</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer: Legal reference and actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <span className="font-bold text-purple-400">Нормативное основание:</span>
            <span className="bg-slate-800 px-2 py-1 rounded text-slate-200 border border-slate-700">{suspicion.normative_base}</span>
          </div>

          <div className="flex items-center space-x-2">
            {onPromoteToCandidate && suspicion.inspector_status !== 'PROMOTED_TO_CANDIDATE' && (
              <button
                onClick={() => {
                  onPromoteToCandidate(suspicion.suspicion_id);
                  onClose();
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Внести коллизию в предписание</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
