import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';

describe('HTTP security headers (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Security E2E tests require NODE_ENV=test.');
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    configureApp(app);

    await app.init();

    const dataSource = app.get(DataSource);

    if (dataSource.options.database !== 'medical_scheduling_test') {
      throw new Error('Refusing to use a non-test database.');
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('adds security headers to successful responses', async () => {
    const response = await request(app.getHttpServer()).get('/api/doctors').expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');

    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');

    expect(response.headers['referrer-policy']).toBe('no-referrer');

    expect(response.headers['content-security-policy']).toContain("default-src 'self'");

    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('preserves security headers on HTTP 404', async () => {
    const response = await request(app.getHttpServer()).get('/api/nonexistent-route').expect(404);

    expect(response.headers['x-content-type-options']).toBe('nosniff');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('preserves security headers on validation errors', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/appointments')
      .send({})
      .expect(400);

    expect(response.headers['x-content-type-options']).toBe('nosniff');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('should return unique request IDs for successful and failed HTTP requests', async () => {
    const success = await request(app.getHttpServer()).get('/api/doctors');

    const invalidRequest = await request(app.getHttpServer()).post('/api/appointments').send({});

    const notFound = await request(app.getHttpServer()).get('/api/rota-inexistente');

    expect(success.status).toBe(200);
    expect(invalidRequest.status).toBe(400);
    expect(notFound.status).toBe(404);

    const requestIds = [
      success.headers['x-request-id'],
      invalidRequest.headers['x-request-id'],
      notFound.headers['x-request-id'],
    ];

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    for (const requestId of requestIds) {
      expect(requestId).toMatch(uuidPattern);
    }

    expect(new Set(requestIds).size).toBe(3);
  });

  it('should not trust a request ID supplied by the client', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/doctors')
      .set('X-Request-ID', 'client-controlled-id');

    expect(response.status).toBe(200);

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    expect(response.headers['x-request-id']).not.toBe('client-controlled-id');
  });
});
