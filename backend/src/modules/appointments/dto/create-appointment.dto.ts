import { z } from 'zod';

const positiveIdSchema = z
  .number()
  .int()
  .positive()
  .max(2147483647);

export const createAppointmentSchema = z.strictObject({
  patientName: z.string().trim().min(1).max(160),

  examId: positiveIdSchema,

  doctorId: positiveIdSchema,

  startAt: z.iso.datetime({ offset: true }),
});

export type CreateAppointmentDto = z.infer<
  typeof createAppointmentSchema
>;
