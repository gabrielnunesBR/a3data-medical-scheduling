import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureApp } from '../../config/configure-app.js';

import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const dataSource = {
    query: vi.fn(),
  };

  let app: INestApplication;

  beforeEach(async () => {
    vi.resetAllMocks();

    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: getDataSourceToken(),
          useValue: dataSource,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication({
      logger: false,
    });

    configureApp(app);

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return HTTP 200 when PostgreSQL is available', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(response.body).toEqual({
      status: 'ok',
    });

    expect(dataSource.query).toHaveBeenCalledOnce();
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('should return HTTP 503 when PostgreSQL is unavailable', async () => {
    dataSource.query.mockRejectedValue(
      new Error('Database connection failed: internal-host.example'),
    );

    const response = await request(app.getHttpServer()).get('/api/health').expect(503);

    expect(response.body).toMatchObject({
      statusCode: 503,
      message: 'Service temporarily unavailable.',
    });

    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('should not expose internal database errors in the response', async () => {
    dataSource.query.mockRejectedValue(
      new Error('password=internal-secret; host=private-database'),
    );

    const response = await request(app.getHttpServer()).get('/api/health').expect(503);

    const responseText = JSON.stringify(response.body);

    expect(responseText).not.toContain('internal-secret');
    expect(responseText).not.toContain('private-database');
    expect(responseText).not.toContain('password=');
  });
});
