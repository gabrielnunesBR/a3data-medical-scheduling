import { z } from 'zod';

export const listExamsQuerySchema = z.strictObject({
  search: z.string().trim().max(100).optional(),
});

export type ListExamsQuery = z.infer<typeof listExamsQuerySchema>;
