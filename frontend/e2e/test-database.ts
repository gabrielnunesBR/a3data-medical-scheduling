import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

import { Client } from 'pg';

export function createTestDatabaseClient(): Client {
  const env = parseEnv(
    readFileSync(
      new URL('../../.env.test', import.meta.url),
      'utf8',
    ),
  );

  if (
    env.POSTGRES_HOST !== '127.0.0.1' ||
    env.POSTGRES_PORT !== '5434' ||
    env.POSTGRES_DB !== 'medical_scheduling_test'
  ) {
    throw new Error(
      'Playwright requires the isolated PostgreSQL test database.',
    );
  }

  if (!env.POSTGRES_USER || !env.POSTGRES_PASSWORD) {
    throw new Error('Missing test database credentials.');
  }

  return new Client({
    host: '127.0.0.1',
    port: 5434,
    database: 'medical_scheduling_test',
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    connectionTimeoutMillis: 5_000,
  });
}
