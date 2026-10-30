import 'reflect-metadata';

import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';

import { envSchema } from '../config/env.schema.js';
import { InitialSchema1793400000000 } from './migrations/1793400000000-InitialSchema.js';

loadEnv({
  path: resolve(process.cwd(), '../.env'),
});

const env = envSchema.parse(process.env);

export const migrationDataSource = new DataSource({
  type: 'postgres',
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,

  migrations: [InitialSchema1793400000000],
  migrationsTableName: 'migrations',

  synchronize: false,
  migrationsRun: false,

  logging: ['error'],
});