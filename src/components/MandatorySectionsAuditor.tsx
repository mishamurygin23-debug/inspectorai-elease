import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  Layers,
  ShieldCheck,
  Building,
  UploadCloud,
  FileCheck2,
  Info
} from 'lucide-react';
import {
  MANDATORY_SECTIONS_REGISTRY,
  evaluateSectionsCoverage,
  SectionDefinition
} from '../types/sectionsRegistry';
import { DocStage } from '../types';

interface MandatorySectionsAuditorProps {
  files: Array<{
    name: string;
    stage?: DocStage | string;
    doc_stage?: DocStage | string;
    discipline?: string;
  }>;
  onUploadForSection?: (stage: DocStage, disciplineHint?: string) => void;
  className?: string;
}

export const MandatorySectionsAuditor: React.FC<MandatorySectionsAuditorProps> = ({
  files,
  onUploadForSection,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'PD' | 'RD' | 'ID'>('ALL');

  const coverage = evaluateSectionsCoverage(files);

  const categories: Array<{ id: 'PD' | 'RD' | 'ID'; label: string; badgeColor: string }> = [
    { id: 'PD', label: 'ПД (Постановление № 87 + МГЭ)', badgeColor: 'bg-blue-600 text-white' },
    { id: 'RD', label: 'РД (ГОСТ Р 21.101-2020 + ВПР)', badgeColor: 'bg-purple-600 text-white' },
    { id: 'ID', label: 'ИД (РД-11-02-2006 + АОСР/ИГС)', badgeColor: 'bg-emerald-600 text-white' },
  ];

  const filteredEntries = Object.entries(MANDATORY_SECTIONS_REGISTRY).filter(([_, def]) => {
    if (filterCategory === 'ALL') return true;
    return def.category === filterCategory;
  });

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden ${className}`}>
      {/* Header with quick stats */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-5 py-3.5 bg-gradient-to-r from-slate-50 via-white to-purple-50/40 border-b border-slate-200 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/80 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                Контроль обязательного состава разделов (ПД • РД • ИД)
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  coverage.coveragePercent >= 100
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {coverage.presentSections} из {coverage.totalSections} разделов в наличии ({coverage.coveragePercent}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Автоматическая проверка комплектности по ПП РФ № 87, ГОСТ Р 21.101 и РД-11-02-2006
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {coverage.coveragePercent < 100 && (
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 hidden sm:inline-flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>Есть недостающие тома</span>
            </span>
          )}
          <button className="text-slate-400 hover:text-slate-600 p-1">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body content */}
      {isOpen && (
        <div className="p-4 space-y-3">
          {/* Quick filter tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-1.5 text-xs">
              <button
                onClick={() => setFilterCategory('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterCategory === 'ALL'
                    ? 'bg-purple-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Все разделы ({Object.keys(MANDATORY_SECTIONS_REGISTRY).length})
              </button>
              <button
                onClick={() => setFilterCategory('PD')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterCategory === 'PD'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                ПД: Проект (6)
              </button>
              <button
                onClick={() => setFilterCategory('RD')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterCategory === 'RD'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                РД: Чертежи (3)
              </button>
              <button
                onClick={() => setFilterCategory('ID')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterCategory === 'ID'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                ИД: Исполнительная (4)
              </button>
            </div>

            <div className="text-[11px] text-slate-500">
              По нормам Мосгосстройнадзора для вынесения Акта требуется 100% комплект
            </div>
          </div>

          {/* Grid of sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredEntries.map(([secKey, def]) => {
              const status = coverage.sections[secKey];
              const isPresent = status?.present;

              return (
                <div
                  key={secKey}
                  className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                    isPresent
                      ? 'bg-slate-50/70 border-emerald-200 hover:border-emerald-300'
                      : 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            def.category === 'PD'
                              ? 'bg-blue-100 text-blue-800'
                              : def.category === 'RD'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {def.category}
                        </span>
                        <span className="font-bold text-slate-900 leading-tight">
                          {def.shortName}
                        </span>
                      </div>

                      <span
                        className={`inline-flex items-center space-x-1 text-[10px] font-black px-1.5 py-0.5 rounded ${
                          isPresent
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isPresent ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>В наличии</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Отсутствует</span>
                          </>
                        )}
                      </span>
                    </div>

                    <p className="text-[11px] font-medium text-slate-700 mt-1 leading-snug">
                      {def.name}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                      {def.description}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                    {isPresent ? (
                      <span className="text-emerald-700 font-semibold truncate max-w-[170px]" title={status.matchedFiles.join(', ')}>
                        Файл: {status.matchedFiles[0]}
                      </span>
                    ) : (
                      <span className="text-amber-800 font-medium">
                        Требуется загрузка
                      </span>
                    )}

                    {onUploadForSection && !isPresent && (
                      <button
                        onClick={() => onUploadForSection(def.category, def.code)}
                        className="font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                      >
                        + Загрузить
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
