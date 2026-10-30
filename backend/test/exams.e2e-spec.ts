import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';

describe('Exams API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);

    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should list all 30 exams', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/exams')
      .expect(200);

    expect(response.body).toHaveLength(30);
  });

  it('should filter exams by name', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/exams')
      .query({ search: 'TOMOGRAFIA' })
      .expect(200);

    const exams = response.body as Array<{ name: string }>;

    expect(exams.length).toBeGreaterThan(0);

    for (const exam of exams) {
      expect(exam.name.toLowerCase()).toContain('tomografia');
    }
  });

  it('should return an empty list when no exam matches', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/exams')
      .query({ search: 'exame-inexistente-xyz' })
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('should reject invalid search parameters', async () => {
    await request(app.getHttpServer())
      .get('/api/exams')
      .query({ search: 'a'.repeat(101) })
      .expect(400);
  });
});
