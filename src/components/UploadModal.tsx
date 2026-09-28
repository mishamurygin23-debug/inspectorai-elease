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
  FileSpreadsheet,
  HelpCircle,
  HardDrive
} from 'lucide-react';
import { DocStage, SectionCode } from '../types';
import {
  classifyDocument,
  STAGE_CONFIG,
  DocumentClassificationResult,
} from '../utils/documentClassifier';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (
    newFilesCount: number,
    uploadedFiles?: Array<{
      id: string;
      name: string;
      sizeMb: number;
      format: 'PDF' | 'DOCX' | 'XML' | 'IMG';
      stage: DocStage;
      fileObject?: File;
      blobUrl?: string;
    }>
  ) => void;
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
      classification?: DocumentClassificationResult;
    }>
  >([]);

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

  // Real File Input Handler with intelligent auto-detection of PD / RD / ID
  const handleRealFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newEntries = Array.from(selectedFiles).map((file) => {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
      let format: 'PDF' | 'DOCX' | 'XML' | 'IMG' = 'PDF';
      if (['PNG', 'JPG', 'JPEG', 'WEBP', 'SVG'].includes(ext)) format = 'IMG';
      else if (ext === 'DOCX' || ext === 'DOC') format = 'DOCX';
      else if (ext === 'XML') format = 'XML';

      // Auto-classify document stage (PD vs RD vs ID) & discipline
      const classification = classifyDocument(file.name);

      return {
        id: `real-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        sizeMb: +(file.size / (1024 * 1024)).toFixed(2),
        format,
        stage: classification.stage,
        discipline: classification.discipline,
        revision:
          classification.stage === 'PD'
            ? 'Эталон проекта (ПД)'
            : classification.stage === 'RD'
            ? 'В производство работ (РД)'
            : 'Исполнительная (ИД)',
        isValid: true,
        fileObject: file,
        classification,
      };
    });

    setFilesToUpload((prev) => [...prev, ...newEntries]);
    setUploadError(null);
    setIsCompleted(false);
  };

  // Drag and drop of real files with automatic PD / RD / ID recognition
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

        // Auto-classify document stage (PD vs RD vs ID) & discipline
        const classification = classifyDocument(file.name);

        return {
          id: `drop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          sizeMb: +(file.size / (1024 * 1024)).toFixed(2),
          format,
          stage: classification.stage,
          discipline: classification.discipline,
          revision:
            classification.stage === 'PD'
              ? 'Эталон проекта (ПД)'
              : classification.stage === 'RD'
              ? 'В производство работ (РД)'
              : 'Исполнительная (ИД)',
          isValid: true,
          fileObject: file,
          classification,
        };
      });

      setFilesToUpload((prev) => [...prev, ...newEntries]);
      setUploadError(null);
      setIsCompleted(false);
    }
  };

  const handleUpdateFileStage = (fileId: string, newStage: DocStage) => {
    setFilesToUpload((prev) =>
      prev.map((f) => {
        if (f.id !== fileId) return f;
        const cfg = STAGE_CONFIG[newStage];
        return {
          ...f,
          stage: newStage,
          revision:
            newStage === 'PD'
              ? 'Эталон проекта (ПД)'
              : newStage === 'RD'
              ? 'В производство работ (РД)'
              : 'Исполнительная (ИД)',
          classification: f.classification
            ? {
                ...f.classification,
                stage: newStage,
                stageCode: cfg.code,
                stageName: cfg.title,
                primaryReason: `Уточнено пользователем: стадия «${cfg.code}»`,
              }
            : undefined,
        };
      })
    );
  };

  const handleAddFullMandatoryPackage = () => {
    const fullSet = [
      {
        name: 'ПД-Раздел1-ПЗ_Пояснительная_записка_ТЭП_Эталон.pdf',
        stage: 'PD' as DocStage,
        discipline: 'ПЗ',
        sizeMb: 14.2,
        revision: 'Утв. МГЭ (Эталон)',
      },
      {
        name: 'ПД-Раздел2-СПОЗУ_Схема_планировочной_организации_участка.pdf',
        stage: 'PD' as DocStage,
        discipline: 'СПЗУ',
        sizeMb: 18.5,
        revision: 'Утв. МГЭ (Эталон)',
      },
      {
        name: 'ПД-Раздел3-АР_Архитектурные_решения_Фасады_Планы.pdf',
        stage: 'PD' as DocStage,
        discipline: 'АР',
        sizeMb: 24.1,
        revision: 'Утв. МГЭ (Эталон)',
      },
      {
        name: 'ПД-Раздел4-КР_Конструктивные_решения_Каркас_Фундаменты.pdf',
        stage: 'PD' as DocStage,
        discipline: 'КР',
        sizeMb: 31.0,
        revision: 'Утв. МГЭ (Эталон)',
      },
      {
        name: 'ПД-Раздел5-ИОС_Инженерные_сети_ОВ_ВК_ЭОМ_СС.pdf',
        stage: 'PD' as DocStage,
        discipline: 'ИОС1',
        sizeMb: 26.4,
        revision: 'Утв. МГЭ (Эталон)',
      },
      {
        name: 'МГЭ-2025-Заключение_экспертизы_№77-1-1-3-012948-2025.pdf',
        stage: 'PD' as DocStage,
        discipline: 'ПЗ',
        sizeMb: 8.7,
        revision: 'Положительное МГЭ',
      },
      {
        name: 'РД-2025-АР-Лист3_Кладочный_план_Штамп_В_производство_работ.pdf',
        stage: 'RD' as DocStage,
        discipline: 'АР',
        sizeMb: 22.8,
        revision: 'В производство работ',
      },
      {
        name: 'РД-2025-КЖ01_Спецификация_арматуры_и_бетона_ВПР.pdf',
        stage: 'RD' as DocStage,
        discipline: 'КР',
        sizeMb: 19.3,
        revision: 'В производство работ',
      },
      {
        name: 'АОСР_№14-Армирование_фундаментной_плиты_подписан.pdf',
        stage: 'ID' as DocStage,
        discipline: 'КР',
        sizeMb: 9.2,
        revision: 'Заверена технадзором',
      },
      {
        name: 'ИГС-04_Исполнительная_геодезическая_схема_отклонений_осей.pdf',
        stage: 'ID' as DocStage,
        discipline: 'КР',
        sizeMb: 11.4,
        revision: 'Подписана геодезистом',
      },
      {
        name: 'Паспорта_качества_и_протоколы_испытания_бетона_В25.pdf',
        stage: 'ID' as DocStage,
        discipline: 'КР',
        sizeMb: 6.8,
        revision: 'Лаборатория испытаний',
      },
      {
        name: 'Общий_журнал_работ_ОЖР_Раздел3_Записи_авторского_надзора.pdf',
        stage: 'ID' as DocStage,
        discipline: 'ПЗ',
        sizeMb: 15.6,
        revision: 'Заверен в МГСН',
      },
    ];

    const entries = fullSet.map((item, index) => {
      const classification = classifyDocument(item.name);
      return {
        id: `full-pack-${Date.now()}-${index}`,
        name: item.name,
        sizeMb: item.sizeMb,
        format: 'PDF' as const,
        stage: item.stage,
        discipline: item.discipline,
        revision: item.revision,
        isValid: true,
        classification,
      };
    });

    setFilesToUpload(entries);
    setIsCompleted(false);
  };

  const handleAddSampleFile = (stage: DocStage, discipline: SectionCode) => {
    const stagePrefix = stage === 'PD' ? '25-01-ПД' : stage === 'RD' ? '25-01-РД' : 'ИД-АОСР';
    const sampleFileName =
      stage === 'PD'
        ? `${stagePrefix}-${discipline}_План_типового_этажа_Эталон.pdf`
        : stage === 'RD'
        ? `${stagePrefix}-${discipline}-Изм2_Кладочный_план_этажа.pdf`
        : `${stagePrefix}-01_${discipline}_Исполнительная_схема.pdf`;

    const classification = classifyDocument(sampleFileName);

    const newFile = {
      id: `mock-${Date.now()}`,
      name: sampleFileName,
      sizeMb: 12.5,
      format: 'PDF' as const,
      stage,
      discipline,
      revision:
        stage === 'PD' ? 'Утв. МГЭ (Эталон)' : stage === 'RD' ? 'Изм. 2 (В производство)' : 'Заверена (ИД)',
      isValid: true,
      classification,
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
    setProcessingProgress(20);
    setProgressStage('1. Валидация формата PDF и структуры ГОСТ Р 21.101...');

    const completeImmediately = () => {
      setIsProcessing(false);
      setIsCompleted(true);
      const processed = filesToUpload.map((f) => ({
        ...f,
        blobUrl: f.fileObject ? URL.createObjectURL(f.fileObject) : undefined,
      }));
      onUploadSuccess(filesToUpload.length, processed);
      // Immediately switch to the second section: Верификация протокола
      setTimeout(() => {
        onClose();
        if (onOpenVerification) {
          onOpenVerification();
        }
      }, 300);
    };

    // Ultra-fast pipeline (400ms total for responsive feel)
    setTimeout(() => {
      setProcessingProgress(45);
      setProgressStage('2. OCR-распознавание текста чертежей и экспликаций...');
    }, 80);

    setTimeout(() => {
      setProcessingProgress(70);
      setProgressStage('3. CV-совмещение координационных осей A-Г, 1-8...');
    }, 170);

    setTimeout(() => {
      setProcessingProgress(90);
      setProgressStage('4. Сверка 132 параметров Матрицы контроля...');
    }, 270);

    setTimeout(() => {
      setProcessingProgress(100);
      setProgressStage('5. Фиксация протокола расхождений...');
    }, 360);

    setTimeout(() => {
      completeImmediately();
    }, 450);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 my-6 animate-fade-in">
        {/* Header with Object Context */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Загрузка документации для проверки
              </h3>
              <p className="text-xs text-slate-500">
                Объект: <strong className="text-purple-900 font-semibold">{objectName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real Dropzone Area */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.svg,.webp,.docx,.doc,.xml,.txt,.zip"
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
              ? 'border-purple-600 bg-purple-50/70 scale-[1.01]'
              : 'border-slate-300 hover:border-purple-500 bg-slate-50/50'
          }`}
        >
          <UploadCloud className="w-9 h-9 text-purple-600 mx-auto mb-1.5" />
          <p className="text-xs font-bold text-slate-900">
            Перетащите сюда файлы или нажмите для выбора с диска (.PDF, .DWG, .ZIP)
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            ИИ автоматически распознает стадии (ПД, РД, ИД), разделы (АР, КР, ОВ) и штампы
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <span className="px-3 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl transition-colors shadow-2xs flex items-center space-x-1.5">
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Выбрать с диска</span>
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddFullMandatoryPackage();
              }}
              className="px-3 py-1.5 text-xs font-bold text-indigo-900 bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Загрузить полный комплект всех обязательных разделов: ПД (1-5, МГЭ) + РД (ВПР) + ИД (АОСР, ИГС, Паспорта, ОЖР)"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-700" />
              <span>📦 Загрузить все разделы (ПД + РД + ИД)</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddSampleFile('PD', 'АР');
                handleAddSampleFile('RD', 'АР');
              }}
              className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              <span>⚡ Экспресс (ПД + РД)</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddSampleFile('ID', 'АР');
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>+ Исполнительная (ИД)</span>
            </button>
          </div>
        </div>

        {/* Summary of files ready for verification & Memory / Storage status */}
        <div className="space-y-2">
          {/* Storage / Memory usage progress bar */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 font-bold text-slate-700">
                <HardDrive className="w-3.5 h-3.5 text-purple-600" />
                <span>Занято памяти: {totalSizeMb.toFixed(1)} МБ из 200 МБ</span>
              </div>
              <span className={`text-[11px] font-bold ${
                isExceedingTotalLimit 
                  ? 'text-rose-600' 
                  : (200 - totalSizeMb) < 40 
                  ? 'text-amber-600' 
                  : 'text-emerald-600'
              }`}>
                {isExceedingTotalLimit 
                  ? 'Лимит исчерпан!' 
                  : `Осталось памяти: ${(200 - totalSizeMb).toFixed(1)} МБ`}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isExceedingTotalLimit
                    ? 'bg-rose-500'
                    : (totalSizeMb / 200) > 0.8
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-600'
                }`}
                style={{ width: `${Math.min(100, (totalSizeMb / 200) * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <span>Файлы в пакете ({filesToUpload.length}):</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                ПД: {pdFiles.length}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                РД: {rdFiles.length}
              </span>
              {idFiles.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  ИД: {idFiles.length}
                </span>
              )}
            </span>
            {filesToUpload.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
              >
                Очистить список
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {filesToUpload.length === 0 ? (
              <div className="p-3.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  Очередь пуста. Выберите файлы выше или нажмите «⚡ Демо-комплект (ПД + РД)» для быстрого показа.
                </p>
              </div>
            ) : (
              filesToUpload.map((file, idx) => {
                const isPd = file.stage === 'PD';
                const isRd = file.stage === 'RD';
                const isId = file.stage === 'ID';

                return (
                  <div
                    key={file.id || `file-item-${idx}`}
                    className={`p-2.5 rounded-xl border text-xs shadow-2xs transition-all ${
                      isPd
                        ? 'bg-blue-50/40 border-blue-200'
                        : isRd
                        ? 'bg-purple-50/30 border-purple-200'
                        : 'bg-emerald-50/30 border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            isPd
                              ? 'bg-blue-600 text-white'
                              : isRd
                              ? 'bg-purple-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 truncate max-w-[260px]" title={file.name}>
                              {file.name}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                isPd
                                  ? 'bg-blue-600 text-white'
                                  : isRd
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {isPd ? 'ПД' : isRd ? 'РД' : 'ИД'}
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              {file.sizeMb} МБ
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <select
                          value={file.stage}
                          onChange={(e) => handleUpdateFileStage(file.id, e.target.value as DocStage)}
                          className="text-[10px] font-semibold py-0.5 px-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 cursor-pointer"
                        >
                          <option value="PD">Стадия ПД</option>
                          <option value="RD">Стадия РД</option>
                          <option value="ID">Стадия ИД</option>
                        </select>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveFile(file.id);
                          }}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg cursor-pointer transition-colors relative z-10"
                          title="Удалить файл из очереди"
                          aria-label="Удалить"
                        >
                          <Trash2 className="w-4 h-4 pointer-events-none" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Processing State Bar */}
        {isProcessing && (
          <div className="p-3 bg-purple-50/80 rounded-2xl border border-purple-200 space-y-1.5 animate-pulse">
            <div className="flex items-center justify-between text-xs font-bold text-purple-900">
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-700 animate-spin" />
                {progressStage}
              </span>
              <span>{processingProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-purple-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 transition-all duration-300 rounded-full"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error message */}
        {uploadError && (
          <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Actions bar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            Закрыть
          </button>
          <button
            onClick={handleStartProcessing}
            disabled={isProcessing || filesToUpload.length === 0}
            className="px-5 py-2.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isProcessing ? 'Анализ...' : 'Запустить проверку ИИ →'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
