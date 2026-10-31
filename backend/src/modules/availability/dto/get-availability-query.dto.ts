import { z } from 'zod';

export const positiveIdSchema = z.coerce.number().int().positive().max(2147483647);

export const getAvailabilityQuerySchema = z.strictObject({
  examId: positiveIdSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type GetAvailabilityQuery = z.infer<typeof getAvailabilityQuerySchema>;
