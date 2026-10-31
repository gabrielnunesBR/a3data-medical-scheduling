import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    POSTGRES_HOST: z.string().trim().min(1).default('127.0.0.1'),

    POSTGRES_PORT: z.coerce.number().int().min(1).max(65535).default(5433),

    POSTGRES_DB: z.string().trim().min(1),

    POSTGRES_USER: z.string().trim().min(1),

    POSTGRES_PASSWORD: z.string().min(1),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'test' && !env.POSTGRES_DB.endsWith('_test')) {
      ctx.addIssue({
        code: 'custom',
        path: ['POSTGRES_DB'],
        message: 'Test environment requires a test database.',
      });
    }
  });
