import React, { useState } from 'react';
import {
  FileText,
  Download,
  X,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  Printer,
  ShieldCheck,
  Check
} from 'lucide-react';
import { ConstructionObject, InspectionProtocol, Suspicion } from '../types';
import { downloadFullDocumentReport, downloadStructuredTextReport, triggerFileDownload } from '../utils/reportGenerator';
import { INITIAL_SUSPICIONS } from '../data/mockData';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  object: ConstructionObject;
  protocol: InspectionProtocol;
  suspicions?: Suspicion[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  object,
  protocol,
  suspicions = INITIAL_SUSPICIONS,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'PDF' | 'DOCX' | 'XML' | 'JSON'>('PDF');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    setIsExporting(true);

    try {
      if (selectedFormat === 'PDF') {
        // Downloads complete standalone HTML dossier report with highlighted text, printable to PDF
        downloadFullDocumentReport({ object, protocol, suspicions });
      } else if (selectedFormat === 'DOCX') {
        downloadStructuredTextReport({ object, protocol, suspicions });
      } else if (selectedFormat === 'JSON') {
        const jsonContent = JSON.stringify(
          {
            object,
            protocol,
            suspicions,
            exported_at: new Date().toISOString(),
            engine_version: '2.4.2-altufievo',
          },
          null,
          2
        );
        triggerFileDownload(jsonContent, `Protocol_${protocol.id}_${object.permit_number}.json`, 'application/json');
      } else if (selectedFormat === 'XML') {
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<InspectionProtocol id="${protocol.id}" version="${protocol.version}" objectId="${object.id}">
  <ObjectInfo>
    <Name>${object.name}</Name>
    <Address>${object.address}</Address>
    <Permit>${object.permit_number}</Permit>
  </ObjectInfo>
  <Findings count="${protocol.findings.length}">
    ${protocol.findings
      .map(
        (f) => `
    <Finding code="${f.param_code}" status="${f.finding_status}">
      <ParamName>${f.param_name}</ParamName>
      <Section>${f.section}</Section>
      <Expected>${f.expected_value}</Expected>
      <Actual>${f.actual_value}</Actual>
      <Delta>${f.delta}</Delta>
      <Norm>${f.normative_reference || ''}</Norm>
    </Finding>`
      )
      .join('')}
  </Findings>
  <Suspicions count="${suspicions.length}">
    ${suspicions
      .map(
        (s) => `
    <Suspicion id="${s.suspicion_id}" method="${s.discovery_method}" priority="${s.review_priority}">
      <Description>${s.description}</Description>
      <NormativeBase>${s.normative_base}</NormativeBase>
    </Suspicion>`
      )
      .join('')}
  </Suspicions>
</InspectionProtocol>`;
        triggerFileDownload(xmlContent, `Protocol_${protocol.id}_IAIS_RIN.xml`, 'application/xml');
      }

      setIsExporting(false);
      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
        onClose();
      }, 2000);
    } catch (e) {
      console.error(e);
      setIsExporting(false);
    }
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

        {/* Highlighted text feature notice */}
        <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-purple-800">
            <span>🖍️</span>
            <span>В отчет включается подробный анализ текста:</span>
          </div>
          <ul className="text-[11px] text-purple-700 list-disc list-inside space-y-0.5">
            <li>Точный фрагмент текста из чертежа с маркером выделения;</li>
            <li>Разъяснение, что это за текст и где он расположен на листе;</li>
            <li>Детальный разбор, что именно неправильно (ПД vs РД, дельта, нарушенные СП).</li>
          </ul>
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

        {/* Direct link for Full Word Project Documentation */}
        <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-base">📘</span>
            <div>
              <div className="font-bold text-blue-950">Техническая документация проекта (Word)</div>
              <div className="text-[11px] text-blue-700">Полное руководство и описание архитектуры для жюри ЛЦТ 2026</div>
            </div>
          </div>
          <a
            href="/documentation.docx"
            download="Документация_Инспектор_ИИ_Мосгосстройнадзор.docx"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition-all text-[11px] shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Скачать .docx</span>
          </a>
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
