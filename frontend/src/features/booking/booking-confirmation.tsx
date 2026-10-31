import { ChevronLeft } from 'lucide-react';

import type { Exam } from '../exams/exams.api';

import type { Doctor } from './availability.api';
import { AppointmentRequestError, type Appointment } from './appointments.api';
import { formatClinicDate } from './booking-dates';
import { useBookingSubmission } from './use-booking-submission';

type BookingConfirmationProps = {
  exam: Exam;
  doctor: Doctor;
  date: string;
  time: string;
  onBack: () => void;
  onBooked: (appointment: Appointment) => void;
  onConflict: () => void;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof AppointmentRequestError) {
    if (error.status === 409 && error.code === 'IDEMPOTENCY_KEY_REUSED') {
      return 'Esta confirmação não pode ser reutilizada com dados diferentes. Volte e revise o agendamento.';
    }

    switch (error.status) {
      case 400:
        return 'Os dados informados são inválidos. Confira as informações e tente novamente.';

      case 404:
        return 'Não foi possível localizar o exame ou o profissional selecionado. Volte e revise o agendamento.';

      case 409:
        return 'Esse horário acabou de ser reservado. Escolha outro horário disponível.';

      case 422:
        return 'Esse horário não pode mais ser agendado. Volte e escolha outro horário.';

      case 429:
        return 'Muitas tentativas de agendamento em pouco tempo. Aguarde alguns instantes antes de tentar novamente.';

      default:
        return 'Não foi possível confirmar o resultado do agendamento. Você pode tentar novamente sem criar uma reserva duplicada.';
    }
  }

  return 'Não foi possível confirmar o resultado do agendamento. Você pode tentar novamente sem criar uma reserva duplicada.';
}

export function BookingConfirmation({
  exam,
  doctor,
  date,
  time,
  onBack,
  onBooked,
  onConflict,
}: BookingConfirmationProps) {
  const { register, handleSubmit, errors, mutation, onSubmit } = useBookingSubmission({
    exam,
    doctor,
    date,
    time,
    onBooked,
    onConflict,
  });

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        disabled={mutation.isPending}
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-strong hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft size={18} aria-hidden="true" />
        Voltar para horários
      </button>

      <div>
        <h2
          id="booking-step-heading"
          tabIndex={-1}
          className="text-xl font-semibold tracking-tight text-ink sm:text-2xl"
        >
          Revise e confirme seu agendamento
        </h2>

        <p className="mt-3 text-sm leading-6 text-muted-ink">
          Confira as informações selecionadas e informe o nome completo do paciente para finalizar.
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-line bg-canvas p-5 sm:p-6">
        <h3 className="text-base font-semibold text-ink">Resumo do atendimento</h3>

        <dl className="mt-4 divide-y divide-line">
          <div className="py-3">
            <dt className="text-sm text-muted-ink">Exame</dt>

            <dd className="mt-1 font-medium text-ink">
              {exam.name}

              <span className="mt-1 block text-sm font-normal text-muted-ink">
                Duração: {exam.durationMinutes} minutos
              </span>
            </dd>
          </div>

          <div className="py-3">
            <dt className="text-sm text-muted-ink">Profissional</dt>

            <dd className="mt-1 font-medium text-ink">{doctor.name}</dd>
          </div>

          <div className="py-3">
            <dt className="text-sm text-muted-ink">Data</dt>

            <dd className="mt-1 font-medium text-ink">{formatClinicDate(date)}</dd>
          </div>

          <div className="py-3">
            <dt className="text-sm text-muted-ink">Horário</dt>

            <dd className="mt-1 font-semibold text-brand-strong">{time}</dd>
          </div>
        </dl>

        <p className="mt-4 text-xs leading-5 text-muted-ink">
          Os horários são apresentados no horário de Brasília.
        </p>
      </div>

      <form
        noValidate
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        className="mt-8"
      >
        <div>
          <label htmlFor="patient-name" className="block text-sm font-semibold text-ink">
            Nome completo do paciente
          </label>

          <input
            id="patient-name"
            type="text"
            autoComplete="name"
            maxLength={160}
            placeholder="Digite o nome completo"
            disabled={mutation.isPending}
            aria-invalid={Boolean(errors.patientName)}
            aria-describedby={errors.patientName ? 'patient-name-error' : undefined}
            className="mt-3 min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted-ink disabled:cursor-not-allowed disabled:opacity-60"
            {...register('patientName', {
              onChange: () => {
                mutation.reset();
              },
            })}
          />

          {errors.patientName && (
            <p id="patient-name-error" role="alert" className="mt-2 text-sm text-red-700">
              {errors.patientName.message}
            </p>
          )}
        </div>

        {mutation.isError && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
          >
            {getErrorMessage(mutation.error)}
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onBack}
            disabled={mutation.isPending}
            className="min-h-12 rounded-xl border border-line px-6 text-sm font-semibold text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
          >
            Voltar
          </button>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="min-h-12 rounded-xl bg-brand px-6 text-sm font-semibold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? 'Confirmando agendamento...' : 'Confirmar agendamento'}
          </button>
        </div>
      </form>
    </div>
  );
}
