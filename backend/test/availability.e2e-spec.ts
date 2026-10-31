import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { DateTime } from 'luxon';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { CLINIC_TIME_ZONE } from '../src/modules/availability/availability.constants.js';

type DoctorResponse = {
  id: number;
  name: string;
  crm: string;
};

describe('Availability API (e2e)', () => {
  let app: INestApplication;
  let helenaId: number;

  const futureMonday = DateTime.now()
    .setZone(CLINIC_TIME_ZONE)
    .plus({ weeks: 2 })
    .startOf('week');

  const monday = futureMonday.toISODate();
  const sunday = futureMonday.minus({ days: 1 }).toISODate();

  beforeAll(async () => {
    if (!monday || !sunday) {
      throw new Error('Could not determine test dates.');
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    configureApp(app);

    await app.init();

    const response = await request(app.getHttpServer())
      .get('/api/doctors')
      .expect(200);

    const doctors = response.body as DoctorResponse[];

    const helena = doctors.find(
      (doctor) => doctor.crm === 'CRM-MG 11111',
    );

    if (!helena) {
      throw new Error('Doctor seed must be executed before E2E tests.');
    }

    helenaId = helena.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should return slots for a 40-minute exam', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/doctors/${helenaId}/availability`)
      .query({ examId: 17, date: monday })
      .expect(200);

    expect(response.body).toEqual([
      '08:00',
      '08:40',
      '09:20',
      '10:00',
      '10:40',
      '11:20',
      '14:00',
      '14:40',
      '15:20',
      '16:00',
      '16:40',
      '17:20',
    ]);
  });

  it('should use the selected exam duration', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/doctors/${helenaId}/availability`)
      .query({ examId: 1, date: monday })
      .expect(200);

    const slots = response.body as string[];

    expect(slots).toHaveLength(24);
    expect(slots[0]).toBe('08:00');
    expect(slots[slots.length - 1]).toBe('17:40');
  });

  it('should return no slots when the doctor does not work', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/doctors/${helenaId}/availability`)
      .query({ examId: 17, date: sunday })
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('should reject a nonexistent doctor', async () => {
    await request(app.getHttpServer())
      .get('/api/doctors/2147483647/availability')
      .query({ examId: 17, date: monday })
      .expect(404);
  });

  it('should reject a nonexistent exam', async () => {
    await request(app.getHttpServer())
      .get(`/api/doctors/${helenaId}/availability`)
      .query({ examId: 999999, date: monday })
      .expect(404);
  });

  it('should reject invalid doctor IDs', async () => {
    await request(app.getHttpServer())
      .get('/api/doctors/abc/availability')
      .query({ examId: 17, date: monday })
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/doctors/0/availability')
      .query({ examId: 17, date: monday })
      .expect(400);
  });

  it('should reject an invalid exam ID', async () => {
    await request(app.getHttpServer())
      .get(`/api/doctors/${helenaId}/availability`)
      .query({ examId: 'invalid', date: monday })
      .expect(400);
  });

  it('should reject missing query parameters', async () => {
    await request(app.getHttpServer())
      .get(`/api/doctors/${helenaId}/availability`)
      .query({ date: monday })
      .expect(400);

    await request(app.getHttpServer())
      .get(`/api/doctors/${helenaId}/availability`)
      .query({ examId: 17 })
      .expect(400);
  });

  it('should reject an invalid calendar date', async () => {
    await request(app.getHttpServer())
      .get(`/api/doctors/${helenaId}/availability`)
      .query({ examId: 17, date: '2030-02-30' })
      .expect(400);
  });

  it('should reject unknown query parameters', async () => {
    await request(app.getHttpServer())
      .get(`/api/doctors/${helenaId}/availability`)
      .query({
        examId: 17,
        date: monday,
        unexpected: true,
      })
      .expect(400);
  });
});
