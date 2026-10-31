import { useState } from 'react';

import {
  CalendarCheck2,
  CalendarPlus,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Printer,
} from 'lucide-react';

import type { Exam } from '../exams/exams.api';
import type { Doctor } from './availability.api';
import type { Appointment } from './appointments.api';
import { CLINIC_TIME_ZONE } from './booking-dates';
import { buildGoogleCalendarUrl, buildICalendarFile } from './calendar-export';

type BookingSuccessProps = {
  appointment: Appointment;
  exam: Exam;
  doctor: Doctor;
  onNewBooking: () => void;
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: CLINIC_TIME_ZONE,
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: CLINIC_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function BookingSuccess({ appointment, exam, doctor, onNewBooking }: BookingSuccessProps) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const googleCalendarUrl = buildGoogleCalendarUrl(appointment);

  const startAt = new Date(appointment.startAt);
  const endAt = new Date(appointment.endAt);
  const formattedStartDate = dateFormatter.format(startAt);
  const formattedEndDate = dateFormatter.format(endAt);
  const formattedStartTime = timeFormatter.format(startAt);
  const formattedEndTime = timeFormatter.format(endAt);

  const formattedEnd =
    formattedStartDate === formattedEndDate
      ? formattedEndTime
      : `${formattedEndDate}, às ${formattedEndTime}`;

  async function handleCopyAppointmentNumber() {
    try {
      await navigator.clipboard.writeText(String(appointment.id));
      setCopyFeedback('Número do agendamento copiado.');
    } catch {
      setCopyFeedback('Não foi possível copiar. Selecione o número e copie manualmente.');
    }
  }

  function handleDownloadCalendar() {
    const calendar = buildICalendarFile(appointment);
    const blob = new Blob([calendar], { type: 'text/calendar;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = blobUrl;
    link.download = `agendamento-${appointment.id}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Keep the object URL available long enough for the browser to start downloading.
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1_000);
  }

  return (
    <div className="py-5 text-center sm:py-8">
      <div
        className={[
          'mx-auto flex size-16 items-center',
          'justify-center rounded-full bg-green-50 text-success',
        ].join(' ')}
      >
        <CheckCircle2 size={36} aria-hidden="true" />
      </div>

      <h2
        id="booking-step-heading"
        tabIndex={-1}
        className={[
          'mt-5 text-2xl font-bold text-ink',
          'focus-visible:rounded-sm focus-visible:outline-2',
          'focus-visible:outline-offset-4 focus-visible:outline-brand',
        ].join(' ')}
      >
        Agendamento confirmado!
      </h2>

      <p className="mt-3 text-base text-muted-ink">Seu exame foi agendado com sucesso.</p>

      <div
        className={[
          'booking-receipt mt-7 rounded-xl border border-line',
          'bg-canvas p-5 text-left sm:p-6',
        ].join(' ')}
      >
        <div className="booking-receipt-print-heading" aria-hidden="true">
          <div className="booking-receipt-print-masthead">
            <div className="booking-receipt-print-brand">
              <span className="booking-receipt-print-mark">
                <CalendarCheck2 size={22} />
              </span>
              <div>
                <strong>Agendamento de exames</strong>
                <span>Exames de imagem</span>
              </div>
            </div>

            <span className="booking-receipt-print-state">Confirmado</span>
          </div>

          <div className="booking-receipt-print-intro">
            <h3>Comprovante de agendamento</h3>
            <p>Confira os dados do seu exame agendado.</p>
          </div>
        </div>

        <div className="booking-receipt-print-summary" aria-hidden="true">
          <p className="booking-receipt-print-eyebrow">Data do exame</p>
          <p className="booking-receipt-print-date">{formattedStartDate}</p>

          <div className="booking-receipt-print-times">
            <div>
              <span>Início</span>
              <strong>{formattedStartTime}</strong>
            </div>
            <div>
              <span>Término previsto</span>
              <strong>{formattedEnd}</strong>
            </div>
          </div>

          <p className="booking-receipt-print-zone">Horário de Brasília</p>
        </div>

        <div className="booking-receipt-details-heading flex items-center gap-2">
          <CalendarCheck2 size={20} className="text-brand-strong" aria-hidden="true" />

          <h3 className="font-semibold text-ink">Dados da confirmação</h3>
        </div>

        <dl className="mt-4 divide-y divide-line">
          <div className="py-3">
            <dt className="text-sm text-muted-ink">Número do agendamento</dt>

            <dd className="mt-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold text-ink">#{appointment.id}</span>

                <button
                  type="button"
                  onClick={handleCopyAppointmentNumber}
                  className={[
                    'booking-receipt-copy inline-flex min-h-11 items-center gap-2',
                    'rounded-lg px-3 text-sm font-semibold text-brand-strong',
                    'hover:bg-brand-subtle',
                  ].join(' ')}
                >
                  <Copy size={16} aria-hidden="true" />
                  Copiar número
                </button>
              </div>

              {copyFeedback && (
                <p role="status" className="mt-2 text-sm text-muted-ink">
                  {copyFeedback}
                </p>
              )}
            </dd>
          </div>

          <div className="py-3">
            <dt className="text-sm text-muted-ink">Paciente</dt>

            <dd className="mt-1 font-medium text-ink">{appointment.patientName}</dd>
          </div>

          <div className="py-3">
            <dt className="text-sm text-muted-ink">Exame</dt>

            <dd className="mt-1 font-medium text-ink">{exam.name}</dd>
          </div>

          <div className="py-3">
            <dt className="text-sm text-muted-ink">Profissional</dt>

            <dd className="mt-1 font-medium text-ink">{doctor.name}</dd>
          </div>

          <div className="booking-receipt-date-row py-3">
            <dt className="text-sm text-muted-ink">Data e horário</dt>

            <dd className="mt-1 font-semibold text-ink">
              {formattedStartDate}, às {formattedStartTime}
            </dd>
          </div>

          <div className="booking-receipt-end-row pt-3">
            <dt className="text-sm text-muted-ink">Término previsto</dt>

            <dd className="mt-1 font-semibold text-ink">
              {formattedEnd}
              <span className="mt-1 block text-xs font-normal text-muted-ink">
                Horário de Brasília
              </span>
            </dd>
          </div>
        </dl>

        <div className="booking-receipt-print-footer" aria-hidden="true">
          <span>Agendamento #{appointment.id}</span>
          <p>Guarde este comprovante para consultar os dados da sua reserva.</p>
        </div>
      </div>

      <section
        className="mt-6 rounded-xl border border-line bg-white p-5 text-left sm:p-6"
        aria-labelledby="add-to-calendar-heading"
      >
        <div className="flex items-center gap-2">
          <CalendarPlus size={20} className="text-brand-strong" aria-hidden="true" />
          <h3 id="add-to-calendar-heading" className="font-semibold text-ink">
            Adicione à sua agenda
          </h3>
        </div>

        <p className="mt-2 text-sm text-muted-ink">
          Abra o evento no Google Calendar para salvar ou baixe o arquivo para importar em outro
          aplicativo de calendário.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={[
              'inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl',
              'bg-brand px-4 text-center text-sm font-semibold text-white',
              'hover:bg-brand-strong',
            ].join(' ')}
          >
            <CalendarPlus size={18} aria-hidden="true" />
            Google Calendar
            <ExternalLink size={15} aria-hidden="true" />
            <span className="sr-only"> (abre em uma nova guia)</span>
          </a>

          <button
            type="button"
            onClick={handleDownloadCalendar}
            className={[
              'inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl',
              'border border-brand px-4 text-sm font-semibold text-brand-strong',
              'hover:bg-brand-subtle',
            ].join(' ')}
          >
            <Download size={18} aria-hidden="true" />
            Baixar arquivo .ics
          </button>
        </div>

        <p className="mt-3 text-xs text-muted-ink">
          Para proteger sua privacidade, o evento não inclui o nome do paciente nem o tipo de exame.
        </p>
      </section>

      <div
        className={[
          'mt-7 flex flex-col items-stretch justify-center gap-3',
          'sm:flex-row sm:items-center',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={() => window.print()}
          className={[
            'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl',
            'border border-brand px-6 font-semibold text-brand-strong',
            'hover:bg-brand-subtle',
          ].join(' ')}
        >
          <Printer size={18} aria-hidden="true" />
          Imprimir comprovante
        </button>

        <button
          type="button"
          onClick={onNewBooking}
          className={[
            'min-h-12 rounded-xl',
            'bg-brand px-7 font-semibold text-white hover:bg-brand-strong',
          ].join(' ')}
        >
          Agendar outro exame
        </button>
      </div>
    </div>
  );
}
