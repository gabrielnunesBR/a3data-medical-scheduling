import { CalendarCheck2, CheckCircle2 } from 'lucide-react';

import type { Exam } from '../exams/exams.api';
import type { Doctor } from './availability.api';
import type { Appointment } from './appointments.api';
import { CLINIC_TIME_ZONE } from './booking-dates';

type BookingSuccessProps = {
  appointment: Appointment;
  exam: Exam;
  doctor: Doctor;
  onNewBooking: () => void;
};

export function BookingSuccess({ appointment, exam, doctor, onNewBooking }: BookingSuccessProps) {
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    timeZone: CLINIC_TIME_ZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(appointment.startAt));

  const formattedTime = new Intl.DateTimeFormat('pt-BR', {
    timeZone: CLINIC_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(appointment.startAt));

  return (
    <div className="py-5 text-center sm:py-8">
      <div
        className="mx-auto flex size-16 items-center
          justify-center rounded-full bg-green-50
          text-success"
      >
        <CheckCircle2 size={36} aria-hidden="true" />
      </div>

      <h2
        id="booking-step-heading"
        tabIndex={-1}
        className="mt-5 text-2xl font-bold text-ink
          focus-visible:rounded-sm
          focus-visible:outline-2
          focus-visible:outline-offset-4
          focus-visible:outline-brand"
      >
        Agendamento confirmado!
      </h2>

      <p className="mt-3 text-base text-muted-ink">Seu exame foi agendado com sucesso.</p>

      <div
        className="mt-7 rounded-xl border border-line
          bg-canvas p-5 text-left sm:p-6"
      >
        <div className="flex items-center gap-2">
          <CalendarCheck2 size={20} className="text-brand-strong" aria-hidden="true" />

          <h3 className="font-semibold text-ink">Dados da confirmação</h3>
        </div>

        <dl className="mt-4 divide-y divide-line">
          <div className="py-3">
            <dt className="text-sm text-muted-ink">Número do agendamento</dt>

            <dd className="mt-1 font-semibold text-ink">#{appointment.id}</dd>
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

          <div className="pt-3">
            <dt className="text-sm text-muted-ink">Data e horário</dt>

            <dd className="mt-1 font-semibold text-ink">
              {formattedDate}, às {formattedTime}
            </dd>

            <dd className="mt-1 text-xs text-muted-ink">Horário de Brasília</dd>
          </div>
        </dl>
      </div>

      <button
        type="button"
        onClick={onNewBooking}
        className="mt-7 min-h-12 rounded-xl
          bg-brand px-7 font-semibold text-white
          hover:bg-brand-strong"
      >
        Agendar outro exame
      </button>
    </div>
  );
}
