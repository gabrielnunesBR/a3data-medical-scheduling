import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';

type ExamResponse = { id: number; name: string; durationMinutes: number };

function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
}

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
    const response = await request(app.getHttpServer()).get('/api/exams').expect(200);

    expect(response.body).toHaveLength(30);
  });

  it.each([
    ['RESSONÂNCIA', 'ressonancia'],
    ['ressonancia', 'ressonancia'],
    ['ReSsOnAnCiA', 'ressonancia'],
    ['cranio', 'cranio'],
    ['TORAX', 'torax'],
    ['ossea', 'ossea'],
    ['  cranio  ', 'cranio'],
  ])('should search the seeded catalog ignoring case and accents: %s', async (search, term) => {
    const response = await request(app.getHttpServer())
      .get('/api/exams')
      .query({ search })
      .expect(200);

    const exams = response.body as ExamResponse[];

    expect(exams.length).toBeGreaterThan(0);

    for (const exam of exams) {
      expect(normalizeSearchText(exam.name)).toContain(term);
    }

    // Filtering must preserve the same order and IDs returned by the unfiltered API.
    const unfiltered = await request(app.getHttpServer()).get('/api/exams').expect(200);
    const expected = (unfiltered.body as ExamResponse[]).filter((exam) =>
      normalizeSearchText(exam.name).includes(term),
    );

    expect(exams).toEqual(expected);
  });

  it('should treat % and _ as literal search terms, not SQL wildcards', async () => {
    await request(app.getHttpServer()).get('/api/exams').query({ search: '%' }).expect(200, []);
    await request(app.getHttpServer()).get('/api/exams').query({ search: '_' }).expect(200, []);
  });

  it('should return the whole catalog when the search term is blank', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/exams')
      .query({ search: '   ' })
      .expect(200);

    expect(response.body).toHaveLength(30);
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
