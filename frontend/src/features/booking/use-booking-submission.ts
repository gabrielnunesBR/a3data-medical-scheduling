import { useRef } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Exam } from '../exams/exams.api';

import type { Doctor } from './availability.api';
import {
  AppointmentRequestError,
  createAppointment,
  type Appointment,
  type CreateAppointmentInput,
} from './appointments.api';
import { toAppointmentStartAt } from './booking-dates';

const patientSchema = z.object({
  patientName: z
    .string()
    .trim()
    .min(1, 'Informe o nome do paciente.')
    .max(160, 'O nome deve ter no máximo 160 caracteres.'),
});

type PatientFormValues = z.infer<typeof patientSchema>;

type AppointmentSubmission = {
  input: CreateAppointmentInput;
  idempotencyKey: string;
};

type UseBookingSubmissionOptions = {
  exam: Exam;
  doctor: Doctor;
  date: string;
  time: string;
  onBooked: (appointment: Appointment) => void;
  onConflict: () => void;
};

export function useBookingSubmission({
  exam,
  doctor,
  date,
  time,
  onBooked,
  onConflict,
}: UseBookingSubmissionOptions) {
  const queryClient = useQueryClient();

  const idempotencyKeysRef = useRef(new Map<string, string>());

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      patientName: '',
    },
  });

  const mutation = useMutation<Appointment, Error, AppointmentSubmission>({
    mutationFn: ({ input, idempotencyKey }) => createAppointment(input, idempotencyKey),

    retry: false,

    onSuccess: async (appointment) => {
      idempotencyKeysRef.current.clear();

      await queryClient.invalidateQueries({
        queryKey: ['availability', doctor.id, exam.id, date],
      });

      onBooked(appointment);
    },

    onError: async (error) => {
      if (
        error instanceof AppointmentRequestError &&
        error.status === 409 &&
        error.code !== 'IDEMPOTENCY_KEY_REUSED'
      ) {
        await queryClient.invalidateQueries({
          queryKey: ['availability', doctor.id, exam.id, date],
        });

        onConflict();
      }
    },
  });

  function onSubmit(values: PatientFormValues) {
    if (mutation.isPending) {
      return;
    }

    const input: CreateAppointmentInput = {
      patientName: values.patientName.trim(),
      examId: exam.id,
      doctorId: doctor.id,
      startAt: toAppointmentStartAt(date, time),
    };

    const signature = JSON.stringify({
      patientName: input.patientName,
      examId: input.examId,
      doctorId: input.doctorId,
      startAt: input.startAt,
    });

    let idempotencyKey = idempotencyKeysRef.current.get(signature);

    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();

      idempotencyKeysRef.current.set(signature, idempotencyKey);
    }

    mutation.mutate({
      input,
      idempotencyKey,
    });
  }

  return {
    register,
    handleSubmit,
    errors,
    mutation,
    onSubmit,
  };
}
