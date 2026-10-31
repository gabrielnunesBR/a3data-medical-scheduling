import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';

describe('Appointment rate limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('E2E tests require NODE_ENV=test.');
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

  it('should return HTTP 429 after 20 POST requests', async () => {
    for (let index = 0; index < 20; index++) {
      await request(app.getHttpServer()).post('/api/appointments').send({}).expect(400);
    }

    const response = await request(app.getHttpServer())
      .post('/api/appointments')
      .send({})
      .expect(429);

    expect(response.body.statusCode).toBe(429);

    await request(app.getHttpServer()).get('/api/doctors').expect(200);
  });
});
