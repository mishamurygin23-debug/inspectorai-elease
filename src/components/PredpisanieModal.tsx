import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Copy,
  Check,
  X,
  ShieldCheck,
  Download,
  AlertOctagon,
  Building,
  Calendar,
  UserCheck
} from 'lucide-react';
import { CheckFinding, ConstructionObject, InspectionProtocol } from '../types';

interface PredpisanieModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentObject: ConstructionObject;
  protocol: InspectionProtocol;
  findings: CheckFinding[];
}

export const PredpisanieModal: React.FC<PredpisanieModalProps> = ({
  isOpen,
  onClose,
  currentObject,
  protocol,
  findings,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const confirmedFindings = findings.filter(
    (f) => f.finding_status === 'CONFIRMED_VIOLATION'
  );

  const displayFindings = confirmedFindings.length > 0 ? confirmedFindings : findings;

  const todayStr = new Date().toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const deadlineDate = new Date();
  deadlineDate.setDate(deadlineDate.getDate() + 30);
  const deadlineStr = deadlineDate.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const handleCopyText = () => {
    const textToCopy = `КОМИТЕТ ГОСУДАРСТВЕННОГО СТРОИТЕЛЬНОГО НАДЗОРА ГОРОДА МОСКВЫ (МОСГОССТРОЙНАДЗОР)
ПРЕДПИСАНИЕ № 77-02-2026/ПР-01
Дата выдачи: ${todayStr}
Объект: ${currentObject.name} (${currentObject.address})
Разрешение на строительство: ${currentObject.permit_number}
Кому выдано: Генеральному подрядчику ${currentObject.contractor}, Застройщику ${currentObject.customer}

ПЕРЕЧЕНЬ ВЫЯВЛЕННЫХ НАРУШЕНИЙ:
${displayFindings
  .map(
    (f, idx) =>
      `${idx + 1}. [${f.param_code}] ${f.param_name}
Нормативная ссылка: ${f.normative_reference}
Эталон (ПД): ${f.expected_value}
Факт (РД): ${f.actual_value}
Дельта: ${f.delta}
Обоснование: ${f.justification}`
  )
  .join('\n\n')}

ТРЕБОВАНИЯ МОСГОССТРОЙНАДЗОРА:
1. Устранить выявленные нарушения рабочей документации в срок до ${deadlineStr}.
2. Представить в Комитет скорректированные комплекты документации со штампом ГАУ «Мосгосэкспертиза».
3. Об исполнении предписания уведомить Комитет в установленный законом срок.

Инспектор 1-й категории: Иванов А.С.
УКЭП: ${currentObject.iais_rin_sync?.ukep_signature?.certificate_serial || 'ГОСТ Р 34.10-2012 / Сертификат 00E17A8293DF4B1C90'}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Top bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Официальное Предписание Мосгосстройнадзора
              </h3>
              <p className="text-xs text-slate-400">
                Сформировано автоматически на основании верифицированного протокола № {protocol.id}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Копировать текст</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Печать / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body (Printable Official Document Form) */}
        <div className="p-8 overflow-y-auto font-serif text-slate-900 text-sm leading-relaxed bg-white space-y-6">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4">
            <div className="font-sans font-bold text-xs uppercase tracking-widest text-slate-500 mb-1">
              Правительство Москвы
            </div>
            <h1 className="text-lg font-bold uppercase tracking-tight text-slate-900">
              Комитет государственного строительного надзора города Москвы
            </h1>
            <div className="text-xs text-slate-600 font-sans mt-0.5">
              (МОСГОССТРОЙНАДЗОР) • 121059, г. Москва, ул. Брянская, д. 9 • Тел: +7 (499) 240-03-12
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black uppercase text-slate-900 tracking-wide">
              ПРЕДПИСАНИЕ № 77-02-2026/ПР-01
            </h2>
            <div className="text-xs text-slate-600 font-sans italic">
              об устранении нарушений при строительстве (реконструкции) объекта капитального строительства
            </div>
            <div className="text-xs font-sans font-bold text-slate-700 pt-1">
              г. Москва • {todayStr}
            </div>
          </div>

          {/* Recipient & Object metadata */}
          <div className="font-sans bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 font-semibold block">Объект капитального строительства:</span>
                <strong className="text-slate-900">{currentObject.name}</strong>
                <div className="text-slate-600">{currentObject.address}</div>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Разрешение на строительство:</span>
                <strong className="text-slate-900">{currentObject.permit_number}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Лицо, осуществляющее строительство (Генподрядчик):</span>
                <strong className="text-slate-900">{currentObject.contractor}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Технический заказчик / Застройщик:</span>
                <strong className="text-slate-900">{currentObject.customer}</strong>
              </div>
            </div>
          </div>

          {/* Statement */}
          <p className="text-justify indent-6">
            В ходе осуществления регионального государственного строительного надзора и автоматизированной верификации рабочей документации (протокол № {protocol.id}) с использованием ИИ-модели <strong>{protocol.model_version}</strong> установлены несоответствия рабочей документации (РД) утвержденной проектной документации (ПД) и требованиям технических регламентов:
          </p>

          {/* Violations Table */}
          <div className="font-sans overflow-x-auto border border-slate-300 rounded-lg">
            <table className="min-w-full divide-y divide-slate-300 text-xs">
              <thead className="bg-slate-100 text-slate-800 font-bold">
                <tr>
                  <th className="py-2.5 px-3 text-left w-12">№</th>
                  <th className="py-2.5 px-3 text-left w-24">Шифр</th>
                  <th className="py-2.5 px-3 text-left">Наименование нарушения</th>
                  <th className="py-2.5 px-3 text-left w-48">Нормативный документ</th>
                  <th className="py-2.5 px-3 text-left w-36">Дельта расхождения</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {displayFindings.map((f, i) => (
                  <tr key={f.id} className="hover:bg-rose-50/50">
                    <td className="py-2 px-3 font-mono font-bold text-slate-500">{i + 1}</td>
                    <td className="py-2 px-3 font-mono font-bold text-rose-700">{f.param_code}</td>
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900">{f.param_name}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">{f.justification}</div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        ПД: {f.expected_value} | РД: {f.actual_value}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-700 font-semibold">{f.normative_reference}</td>
                    <td className="py-2 px-3 font-mono text-rose-800 font-bold">{f.delta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Orders */}
          <div className="space-y-2">
            <h4 className="font-sans font-bold text-sm text-slate-900 uppercase">
              На основании изложенного, руководствуясь ст. 52, 54 Градостроительного кодекса РФ, ПРЕДПИСЫВАЮ:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-justify pl-2">
              <li>
                <strong>Устранить указанные несоответствия</strong> в комплектах рабочей документации в срок до <strong>{deadlineStr}</strong>.
              </li>
              <li>
                При необходимости внесения изменений в утвержденную проектную документацию направить материалы на экспертное сопровождение в ГАУ «Мосгосэкспертиза» в порядке ст. 49 ГрК РФ.
              </li>
              <li>
                До устранения нарушений приостановить выполнение строительно-монтажных работ на участках с несоответствиями вертикальных отметок и несущих конструкций.
              </li>
              <li>
                Письменный отчет об устранении нарушений с приложением исполнительной документации представить в Мосгосстройнадзор через личный кабинет ИАИС «РиН».
              </li>
            </ol>
          </div>

          {/* Legal disclaimer */}
          <div className="text-[11px] font-sans text-slate-500 italic border-t border-slate-200 pt-3">
            * Настоящее предписание может быть обжаловано в досудебном порядке в соответствии с Федеральным законом № 248-ФЗ либо в Арбитражном суде г. Москвы в течение 3 месяцев со дня вручения. Невыполнение в установленный срок законного предписания влечет административную ответственность по ч. 6 ст. 19.5 КоАП РФ.
          </div>

          {/* Signature & UKEP Stamp */}
          <div className="font-sans pt-4 border-t-2 border-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="font-bold text-xs text-slate-900">
                Должностное лицо Мосгосстройнадзора:
              </div>
              <div className="text-sm font-bold text-slate-800">
                Инспектор 1-й категории Иванов А.С.
              </div>
              <div className="text-xs text-slate-500">
                Отдел строительного надзора по СВАО города Москвы
              </div>
            </div>

            {/* Official Electronic Signature Stamp */}
            <div className="p-3 bg-blue-50 border-2 border-blue-600 rounded-xl max-w-xs text-blue-900 text-[11px] shadow-sm">
              <div className="flex items-center space-x-1.5 font-bold mb-1 text-blue-800">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ</span>
              </div>
              <div className="font-mono text-[10px] space-y-0.5 text-blue-950">
                <div>Сертификат: 00E17A8293DF4B1C90</div>
                <div>Владелец: Иванов Александр Сергеевич</div>
                <div>Действителен: с 01.01.2026 по 31.12.2026</div>
                <div>УКЭП: ГОСТ Р 34.10-2012</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-sans">
            Статус передачи: <strong className="text-emerald-700">Готово к синхронизации с ИАИС «РиН»</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Закрыть окно
          </button>
        </div>
      </div>
    </div>
  );
};
