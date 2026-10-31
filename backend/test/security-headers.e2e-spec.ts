import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';

describe('HTTP security headers (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'Security E2E tests require NODE_ENV=test.',
      );
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    configureApp(app);

    await app.init();

    const dataSource = app.get(DataSource);

    if (
      dataSource.options.database !==
      'medical_scheduling_test'
    ) {
      throw new Error(
        'Refusing to use a non-test database.',
      );
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('adds security headers to successful responses', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/doctors')
      .expect(200);

    expect(
      response.headers['x-content-type-options'],
    ).toBe('nosniff');

    expect(
      response.headers['x-frame-options'],
    ).toBe('SAMEORIGIN');

    expect(
      response.headers['referrer-policy'],
    ).toBe('no-referrer');

    expect(
      response.headers['content-security-policy'],
    ).toContain("default-src 'self'");

    expect(
      response.headers['x-powered-by'],
    ).toBeUndefined();
  });

  it('preserves security headers on HTTP 404', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/nonexistent-route')
      .expect(404);

    expect(
      response.headers['x-content-type-options'],
    ).toBe('nosniff');

    expect(
      response.headers['x-powered-by'],
    ).toBeUndefined();
  });

  it('preserves security headers on validation errors', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/appointments')
      .send({})
      .expect(400);

    expect(
      response.headers['x-content-type-options'],
    ).toBe('nosniff');

    expect(
      response.headers['x-powered-by'],
    ).toBeUndefined();
  });
});
