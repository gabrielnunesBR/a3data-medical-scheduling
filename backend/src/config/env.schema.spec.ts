import { describe, expect, it } from 'vitest';

import { envSchema } from './env.schema.js';

describe('Environment configuration', () => {
  const validEnv = {
    POSTGRES_DB: 'medical_scheduling',
    POSTGRES_USER: 'medical_app',
    POSTGRES_PASSWORD: 'test-password',
    POSTGRES_PORT: '5433',
  };

  it('should validate valid environment variables', () => {
    const result = envSchema.safeParse(validEnv);

    expect(result.success).toBe(true);
  });

  it('should convert the database port to a number', () => {
    const result = envSchema.parse(validEnv);

    expect(result.POSTGRES_PORT).toBe(5433);
  });

  it('should reject a missing database password', () => {
    const result = envSchema.safeParse({
      POSTGRES_DB: 'medical_scheduling',
      POSTGRES_USER: 'medical_app',
      POSTGRES_PORT: '5433',
    });

    expect(result.success).toBe(false);
  });

  it('should reject an invalid database port', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      POSTGRES_PORT: 'invalid',
    });

    expect(result.success).toBe(false);
  });

  it('should apply default configuration values', () => {
    const result = envSchema.parse({
      POSTGRES_DB: 'medical_scheduling',
      POSTGRES_USER: 'medical_app',
      POSTGRES_PASSWORD: 'test-password',
    });

    expect(result.POSTGRES_HOST).toBe('127.0.0.1');
    expect(result.POSTGRES_PORT).toBe(5433);
    expect(result.NODE_ENV).toBe('development');
    expect(result.TRUST_PROXY_HOPS).toBe('0');
  });

  it('should accept one trusted proxy hop', () => {
    const result = envSchema.parse({ ...validEnv, TRUST_PROXY_HOPS: '1' });

    expect(result.TRUST_PROXY_HOPS).toBe('1');
  });

  it('should reject unsupported proxy configurations', () => {
    const result = envSchema.safeParse({ ...validEnv, TRUST_PROXY_HOPS: '2' });

    expect(result.success).toBe(false);
  });

  it('should reject a development database in test environment', () => {
    const result = envSchema.safeParse({
      POSTGRES_HOST: '127.0.0.1',
      POSTGRES_PORT: '5433',
      POSTGRES_DB: 'medical_scheduling',
      POSTGRES_USER: 'medical_app',
      POSTGRES_PASSWORD: 'test-password',
      NODE_ENV: 'test',
    });

    expect(result.success).toBe(false);
  });
});
