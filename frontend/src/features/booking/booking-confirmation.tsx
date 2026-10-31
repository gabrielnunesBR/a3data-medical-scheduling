import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Exam } from '../exams/exams.api';
import type { Doctor } from './availability.api';
import {
  AppointmentRequestError,
  createAppointment,
  type Appointment,
} from './appointments.api';
import {
  formatClinicDate,
  toAppointmentStartAt,
} from './booking-dates';

const patientSchema = z.object({
  patientName: z
    .string()
    .trim()
    .min(1, 'Informe o nome do paciente.')
    .max(160, 'O nome deve ter no máximo 160 caracteres.'),
});

type PatientForm = z.infer<typeof patientSchema>;

type BookingConfirmationProps = {
  exam: Exam;
  doctor: Doctor;
  date: string;
  time: string;
  onBack: () => void;
  onBooked: (appointment: Appointment) => void;
  onConflict: () => void;
};

function getErrorMessage(error: Error): string {
  if (error instanceof AppointmentRequestError) {
    switch (error.status) {
      case 400:
        return 'Verifique os dados informados e tente novamente.';

      case 404:
        return 'Não foi possível encontrar o exame ou profissional selecionado.';

      case 422:
        return 'Esse horário não pode mais ser agendado. Volte e escolha outro.';

      case 429:
        return 'Muitas tentativas de agendamento em pouco tempo. Aguarde alguns instantes antes de tentar novamente.';

      default:
        return 'Não foi possível verificar se o agendamento foi concluído. Evite repetir o envio imediatamente.';
    }
  }

  return 'Não foi possível verificar se o agendamento foi concluído. Confira sua conexão antes de tentar novamente.';
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
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientForm>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      patientName: '',
    },
  });

  const mutation = useMutation({
    mutationFn: createAppointment,

    onSuccess: async (appointment) => {
      await queryClient.invalidateQueries({
        queryKey: ['availability', doctor.id, exam.id, date],
        refetchType: 'none',
      });

      onBooked(appointment);
    },

    onError: async (error) => {
      if (
        error instanceof AppointmentRequestError &&
        error.status === 409
      ) {
        await queryClient.invalidateQueries({
          queryKey: ['availability', doctor.id, exam.id, date],
          refetchType: 'none',
        });

        onConflict();
      }
    },
  });

  const submit = handleSubmit((values) => {
    mutation.mutate({
      patientName: values.patientName,
      examId: exam.id,
      doctorId: doctor.id,
      startAt: toAppointmentStartAt(date, time),
    });
  });

  return (
    <div>
      <button
        type="button"
        disabled={mutation.isPending}
        onClick={onBack}
        className="mb-6 inline-flex min-h-11 items-center
          gap-2 text-sm font-semibold text-brand-strong
          hover:underline disabled:opacity-50"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Voltar para horários
      </button>

      <div className="flex items-start gap-3">
        <div
          className="flex size-11 shrink-0 items-center
            justify-center rounded-xl bg-brand-subtle
            text-brand-strong"
        >
          <ClipboardCheck size={22} aria-hidden="true" />
        </div>

        <div>
          <h2
            id="booking-step-heading"
            tabIndex={-1}
            className="text-xl font-semibold tracking-tight
              sm:text-2xl focus-visible:rounded-sm
              focus-visible:outline-2
              focus-visible:outline-offset-4
              focus-visible:outline-brand"
          >
            Revise e confirme seu agendamento
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-ink">
            Confira as informações e informe o nome
            do paciente para concluir.
          </p>
        </div>
      </div>

      <div
        className="mt-7 rounded-xl border border-line
          bg-canvas p-5"
      >
        <h3 className="font-semibold text-ink">
          Resumo do atendimento
        </h3>

        <dl className="mt-4 divide-y divide-line">
          <div className="py-3">
            <dt className="text-sm text-muted-ink">
              Exame
            </dt>

            <dd className="mt-1 font-medium text-ink">
              {exam.name}
            </dd>

            <dd className="text-sm text-muted-ink">
              Duração: {exam.durationMinutes} minutos
            </dd>
          </div>

          <div className="py-3">
            <dt className="text-sm text-muted-ink">
              Profissional
            </dt>

            <dd className="mt-1 font-medium text-ink">
              {doctor.name}
            </dd>
          </div>

          <div className="py-3">
            <dt className="text-sm text-muted-ink">
              Data
            </dt>

            <dd className="mt-1 font-medium text-ink">
              {formatClinicDate(date)}
            </dd>
          </div>

          <div className="pt-3">
            <dt className="text-sm text-muted-ink">
              Horário
            </dt>

            <dd className="mt-1 font-semibold text-brand-strong">
              {time} — horário de Brasília
            </dd>
          </div>
        </dl>
      </div>

      <form
        noValidate
        aria-busy={mutation.isPending}
        onSubmit={(event) => void submit(event)}
        className="mt-8"
      >
        <label
          htmlFor="patient-name"
          className="block text-sm font-semibold text-ink"
        >
          Nome completo do paciente
        </label>

        <input
          id="patient-name"
          type="text"
          autoComplete="name"
          placeholder="Digite o nome completo"
          maxLength={160}
          aria-invalid={Boolean(errors.patientName)}
          aria-describedby={
            errors.patientName
              ? 'patient-name-error'
              : 'patient-name-help'
          }
          {...register('patientName')}
          className="mt-2 min-h-12 w-full rounded-xl
            border border-line bg-white px-4
            text-base text-ink transition-colors
            aria-invalid:border-danger"
        />

        {errors.patientName ? (
          <p
            id="patient-name-error"
            role="alert"
            className="mt-2 text-sm text-danger"
          >
            {errors.patientName.message}
          </p>
        ) : (
          <p
            id="patient-name-help"
            className="mt-2 text-sm text-muted-ink"
          >
            Informe o nome como deseja que apareça
            na confirmação do agendamento.
          </p>
        )}

        {mutation.isError &&
          !(
            mutation.error instanceof AppointmentRequestError &&
            mutation.error.status === 409
          ) && (
            <div
              role="alert"
              className="mt-6 rounded-xl border
                border-red-200 bg-red-50
                p-4 text-sm text-danger"
            >
              {getErrorMessage(mutation.error)}
            </div>
          )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="mt-7 flex min-h-12 w-full
            items-center justify-center rounded-xl
            bg-brand px-6 font-semibold text-white
            transition-colors hover:bg-brand-strong
            disabled:cursor-not-allowed
            disabled:opacity-60"
        >
          {mutation.isPending
            ? 'Confirmando agendamento...'
            : 'Confirmar agendamento'}
        </button>

        <p
          className="mt-3 text-center text-xs
            leading-5 text-muted-ink"
        >
          A confirmação depende da disponibilidade
          do horário no momento do envio.
        </p>
      </form>
    </div>
  );
}
