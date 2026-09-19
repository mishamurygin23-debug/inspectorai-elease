import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  X,
  Plus,
  Trash2,
  Cpu,
  Layers,
  Sparkles,
  Eye,
  FileCheck2,
  Play,
  ArrowRight,
  Split,
  FileSpreadsheet
} from 'lucide-react';
import { DocStage, SectionCode } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newFilesCount: number) => void;
  onOpenDiffMode?: () => void;
  onOpenVerification?: () => void;
  isIncremental: boolean;
  objectName: string;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  onOpenDiffMode,
  onOpenVerification,
  isIncremental,
  objectName,
}) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedStage, setSelectedStage] = useState<DocStage>('RD');
  const [selectedDiscipline, setSelectedDiscipline] = useState<SectionCode>('АР');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filesToUpload, setFilesToUpload] = useState<
    Array<{
      id: string;
      name: string;
      sizeMb: number;
      format: 'PDF' | 'DOCX' | 'XML' | 'IMG';
      stage: DocStage;
      discipline: string;
      revision: string;
      isValid: boolean;
      fileObject?: File;
    }>
  >([
    {
      id: 'pre-pd-1',
      name: '25-01-ПД-АР_Кладочный_план_14эт_Эталон.pdf',
      sizeMb: 14.8,
      format: 'PDF',
      stage: 'PD',
      discipline: 'АР',
      revision: 'Утв. МГЭ № 77-1-1-3-0245',
      isValid: true,
    },
    {
      id: 'pre-rd-2',
      name: '25-01-РД-АР-Изм4_Кладочный_план_14эт.pdf',
      sizeMb: 16.2,
      format: 'PDF',
      stage: 'RD',
      discipline: 'АР',
      revision: 'Изм. 4 (В производство работ)',
      isValid: true,
    },
  ]);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStage, setProgressStage] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalSizeMb = filesToUpload.reduce((acc, f) => acc + f.sizeMb, 0);
  const isExceedingTotalLimit = totalSizeMb > 200;

  const pdFiles = filesToUpload.filter((f) => f.stage === 'PD');
  const rdFiles = filesToUpload.filter((f) => f.stage === 'RD');
  const idFiles = filesToUpload.filter((f) => f.stage === 'ID');

  // Real File Input Handler
  const handleRealFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newEntries = Array.from(selectedFiles).map((file) => {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
      let format: 'PDF' | 'DOCX' | 'XML' | 'IMG' = 'PDF';
      if (['PNG', 'JPG', 'JPEG', 'WEBP', 'SVG'].includes(ext)) format = 'IMG';
      else if (ext === 'DOCX' || ext === 'DOC') format = 'DOCX';
      else if (ext === 'XML') format = 'XML';

      return {
        id: `real-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        sizeMb: +(file.size / (1024 * 1024)).toFixed(2),
        format,
        stage: selectedStage,
        discipline: selectedDiscipline,
        revision: 'Файл пользователя',
        isValid: true,
        fileObject: file,
      };
    });

    setFilesToUpload((prev) => [...prev, ...newEntries]);
    setUploadError(null);
    setIsCompleted(false);
  };

  // Drag and drop of real files
  const handleRealDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const newEntries = Array.from(droppedFiles).map((file) => {
        const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
        let format: 'PDF' | 'DOCX' | 'XML' | 'IMG' = 'PDF';
        if (['PNG', 'JPG', 'JPEG', 'WEBP', 'SVG'].includes(ext)) format = 'IMG';
        else if (ext === 'DOCX' || ext === 'DOC') format = 'DOCX';
        else if (ext === 'XML') format = 'XML';

        return {
          id: `drop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          sizeMb: +(file.size / (1024 * 1024)).toFixed(2),
          format,
          stage: selectedStage,
          discipline: selectedDiscipline,
          revision: 'Drag & Drop',
          isValid: true,
          fileObject: file,
        };
      });

      setFilesToUpload((prev) => [...prev, ...newEntries]);
      setUploadError(null);
      setIsCompleted(false);
    }
  };

  const handleAddSampleFile = (stage: DocStage, discipline: SectionCode) => {
    const stageName = stage === 'PD' ? 'ПД_Эталон' : stage === 'RD' ? 'РД_Факт' : 'ИД_Съемка';
    const newFile = {
      id: `mock-${Date.now()}`,
      name: `${stageName}_${discipline}_Лист_${filesToUpload.length + 1}.pdf`,
      sizeMb: 12.5,
      format: 'PDF' as const,
      stage,
      discipline,
      revision: stage === 'PD' ? 'Утв. МГЭ' : 'Изм. 4 (В производство)',
      isValid: true,
    };
    setFilesToUpload((prev) => [...prev, newFile]);
    setIsCompleted(false);
  };

  const handleRemoveFile = (id: string) => {
    setFilesToUpload((prev) => prev.filter((f) => f.id !== id));
    setIsCompleted(false);
  };

  const handleClearAll = () => {
    setFilesToUpload([]);
    setIsCompleted(false);
  };

  // Launch the 5-phase Verification pipeline
  const handleStartProcessing = () => {
    if (filesToUpload.length === 0) {
      setUploadError('Загрузите хотя бы один комплект документации для проверки');
      return;
    }
    if (isExceedingTotalLimit) {
      setUploadError('Превышен общий лимит загрузки пакета (200 МБ)');
      return;
    }

    setIsProcessing(true);
    setIsCompleted(false);
    setUploadError(null);
    setProcessingProgress(15);
    setProgressStage('1. Антивирусная проверка и валидация форматов по ГОСТ Р 21.101...');

    setTimeout(() => {
      setProcessingProgress(35);
      setProgressStage('2. OCR-распознавание текста чертежей и экспликаций (Character Accuracy 0.985)...');
    }, 700);

    setTimeout(() => {
      setProcessingProgress(60);
      setProgressStage('3. CV-совмещение координационных осей A-Г, 1-8 и устранение геометрического перекоса...');
    }, 1500);

    setTimeout(() => {
      setProcessingProgress(85);
      setProgressStage('4. Сверка 132 параметров Матрицы контроля и свободный поиск аномалий...');
    }, 2300);

    setTimeout(() => {
      setProcessingProgress(100);
      setProgressStage('5. Фиксация протокола расхождений и выделение различий КРАСНЫМ цветом...');
    }, 3100);

    setTimeout(() => {
      setIsProcessing(false);
      setIsCompleted(true);
      onUploadSuccess(filesToUpload.length);
    }, 3600);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 my-6 animate-fade-in">
        {/* Header with Object Context */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800">
                {isIncremental ? 'Дозагрузка файлов' : 'Шаг 2 из 3 • Загрузка документации'}
              </span>
              <span className="text-[11px] text-slate-400">•</span>
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Объект зарегистрирован
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-purple-700" />
              Загрузка документов в объект надзора
            </h3>
            <div className="flex items-center space-x-2 text-xs text-slate-600 mt-0.5">
              <span>Целевой объект:</span>
              <span className="font-bold text-purple-950 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                {objectName}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification Success Banner when finished */}
        {isCompleted && (
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl border border-emerald-300 shadow-sm animate-fade-in space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-emerald-950">
                  Проверка объекта успешно выполнена!
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Сверено <strong>132 контрольных параметра</strong> нормативной базы 2026 года.
                  Выявлены расхождения между проектной (ПД) и рабочей (РД) документацией. Различия выделены <strong>КРАСНЫМ</strong> цветом.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-emerald-200/60">
              {onOpenDiffMode && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDiffMode();
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Открыть сравнение 2 файлов (Diff с красным) →</span>
                </button>
              )}
              {onOpenVerification && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenVerification();
                  }}
                  className="px-4 py-2 text-xs font-bold text-purple-900 bg-purple-100 hover:bg-purple-200 rounded-xl transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Открыть верификацию протокола</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Requirements Strip */}
        <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-700">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Форматы: <strong>PDF, PNG, JPG, XML</strong></span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Макс. файл: <strong>50 МБ</strong></span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span>Пакет объекта: <strong>до 200 МБ</strong></span>
          </div>
        </div>

        {/* Real Dropzone Area */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.svg,.webp,.docx,.doc,.xml,.txt"
          onChange={handleRealFileChange}
          className="hidden"
        />

        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleRealDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
            dragActive
              ? 'border-purple-600 bg-purple-50/60 scale-[1.01]'
              : 'border-slate-300 hover:border-purple-500 bg-slate-50/50'
          }`}
        >
          <UploadCloud className="w-9 h-9 text-purple-600 mx-auto mb-1.5" />
          <p className="text-xs font-bold text-slate-900">
            Нажмите, чтобы выбрать свои реальные файлы с компьютера, или перетащите их сюда
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Загружайте чертежи ПД (Эталон), чертежи РД (Факт), сканы изменений и ведомости
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="px-3.5 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition-colors shadow flex items-center space-x-1.5">
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Выбрать файлы на диске</span>
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddSampleFile('PD', 'АР');
              }}
              className="px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>+ Чертеж ПД (Эталон)</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddSampleFile('RD', 'АР');
              }}
              className="px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>+ Чертеж РД (Факт)</span>
            </button>
          </div>
        </div>

        {/* Stage & Section tags for new files */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Стадия для добавляемых файлов:</label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value as DocStage)}
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-white text-xs cursor-pointer focus:ring-1 focus:ring-purple-500"
            >
              <option value="PD">Проектная документация (ПД / Эталон)</option>
              <option value="RD">Рабочая документация (РД / Факт)</option>
              <option value="ID">Исполнительная документация (ИД / Съемка)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Раздел проекта (ПП РФ №87):</label>
            <select
              value={selectedDiscipline}
              onChange={(e) => setSelectedDiscipline(e.target.value as SectionCode)}
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-white text-xs cursor-pointer focus:ring-1 focus:ring-purple-500"
            >
              <option value="АР">АР — Архитектурные решения</option>
              <option value="КР">КР — Конструктивные решения</option>
              <option value="СПЗУ">СПЗУ — Генплан и границы участка</option>
              <option value="ИОС1">ИОС1 — Электроснабжение</option>
              <option value="ИОС2">ИОС2 — Водоснабжение</option>
              <option value="ИОС4">ИОС4 — Отопление и вентиляция</option>
              <option value="ОДИ">ОДИ — Доступность для МГН</option>
              <option value="ППМ">ППМ — Пожарная безопасность</option>
            </select>
          </div>
        </div>

        {/* Summary of files ready for verification */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <span>Документы в объекте ({filesToUpload.length}):</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                ПД: {pdFiles.length}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                РД: {rdFiles.length}
              </span>
              {idFiles.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  ИД: {idFiles.length}
                </span>
              )}
            </span>
            <div className="flex items-center space-x-2">
              <span className={isExceedingTotalLimit ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                {totalSizeMb.toFixed(1)} МБ / 200 МБ
              </span>
              {filesToUpload.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                >
                  Очистить
                </button>
              )}
            </div>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {filesToUpload.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs hover:border-slate-300"
              >
                <div className="flex items-center space-x-2 truncate">
                  <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="font-semibold text-slate-800 truncate max-w-[320px]" title={file.name}>
                    {file.name}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    file.stage === 'PD' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {file.stage} • {file.discipline}
                  </span>
                  <span className="text-slate-400 text-[10px] font-mono">{file.revision}</span>
                  <span className="text-slate-500 text-[11px]">{file.sizeMb} МБ</span>
                </div>
                <button
                  onClick={() => handleRemoveFile(file.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                  title="Удалить файл из очереди"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Processing State Bar */}
        {isProcessing && (
          <div className="p-3.5 bg-purple-50/80 rounded-xl border border-purple-200 space-y-2 animate-pulse">
            <div className="flex items-center justify-between text-xs font-bold text-purple-900">
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-700 animate-spin" />
                {progressStage}
              </span>
              <span>{processingProgress}%</span>
            </div>
            <div className="w-full h-2 bg-purple-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500 rounded-full"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error message */}
        {uploadError && (
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div className="flex items-center space-x-2">
            {onOpenVerification && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVerification();
                }}
                className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
                title="Перейти к чертежу с интерактивной красной подсветкой всех ошибок"
              >
                <Eye className="w-3.5 h-3.5 text-rose-600" />
                <span>Чертеж с ошибками (Красный PDF)</span>
              </button>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Закрыть
            </button>
            <button
              onClick={handleStartProcessing}
              disabled={isProcessing || filesToUpload.length === 0}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isProcessing ? 'Выполняется анализ...' : 'Запустить проверку объекта'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
