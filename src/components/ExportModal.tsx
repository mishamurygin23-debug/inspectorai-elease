import React, { useState } from 'react';
import {
  FileText,
  Download,
  X,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  Printer,
  ShieldCheck
} from 'lucide-react';
import { ConstructionObject, InspectionProtocol } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  object: ConstructionObject;
  protocol: InspectionProtocol;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  object,
  protocol,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'PDF' | 'DOCX' | 'XML' | 'JSON'>('PDF');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
        onClose();
      }, 1400);
    }, 900);
  };

  const confirmedFindings = protocol.findings.filter((f) => f.finding_status === 'CONFIRMED_VIOLATION');
  const negativeFindings = protocol.findings.filter((f) => f.finding_status === 'NEGATIVE_VERIFIED');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Экспорт протокола проверки (ТЗ 2026)
              </h3>
              <p className="text-xs text-slate-600">
                Протокол № {protocol.id} (версия {protocol.version})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Protocol summary preview */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
          <div className="font-bold text-slate-900">{object.name}</div>
          <div className="text-slate-600">{object.address}</div>
          <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
            <div>Разрешение: <strong className="text-slate-800">{object.permit_number}</strong></div>
            <div>Статус: <strong className="text-purple-700">{protocol.status}</strong></div>
            <div>Подтвержденных нарушений: <strong className="text-rose-700">{confirmedFindings.length}</strong></div>
            <div>Отрицательных эталонов: <strong className="text-emerald-700">{negativeFindings.length}</strong></div>
          </div>
        </div>

        {/* Format Selector: PDF, DOCX, XML, JSON */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Выберите формат выгрузки:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <button
              onClick={() => setSelectedFormat('PDF')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedFormat === 'PDF'
                  ? 'border-purple-600 bg-purple-50/80 font-bold text-purple-900 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <FileText className="w-5 h-5 text-rose-600" />
              <span>PDF Отчет</span>
              <span className="text-[10px] text-slate-600">Печать / Архив</span>
            </button>

            <button
              onClick={() => setSelectedFormat('DOCX')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedFormat === 'DOCX'
                  ? 'border-purple-600 bg-purple-50/80 font-bold text-purple-900 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <span>DOCX</span>
              <span className="text-[10px] text-slate-600">MS Word</span>
            </button>

            <button
              onClick={() => setSelectedFormat('XML')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedFormat === 'XML'
                  ? 'border-purple-600 bg-purple-50/80 font-bold text-purple-900 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <FileCode className="w-5 h-5 text-amber-600" />
              <span>XML Схема</span>
              <span className="text-[10px] text-slate-600">ИАИС «РиН»</span>
            </button>

            <button
              onClick={() => setSelectedFormat('JSON')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedFormat === 'JSON'
                  ? 'border-purple-600 bg-purple-50/80 font-bold text-purple-900 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <FileCode className="w-5 h-5 text-purple-600" />
              <span>JSON REST</span>
              <span className="text-[10px] text-slate-600">OpenAPI 3.0</span>
            </button>
          </div>
        </div>

        {downloadSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-300 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Файл протокола успешно сформирован и скачан!</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-600 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Электронный штамп Мосгосстройнадзора</span>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Закрыть
            </button>
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="px-5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Формирование...' : `Скачать (${selectedFormat})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
