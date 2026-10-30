import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module.js';

describe('Database connection (integration)', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    dataSource = moduleRef.get(DataSource);
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  it('should connect to PostgreSQL', () => {
    expect(dataSource.isInitialized).toBe(true);
  });

  it('should execute a SQL query', async () => {
    const result: Array<{ connected: number }> = await dataSource.query('SELECT 1 AS connected');

    expect(result[0]?.connected).toBe(1);
  });
});
