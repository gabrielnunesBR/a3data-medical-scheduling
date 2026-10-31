import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DateTime } from 'luxon';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { CLINIC_TIME_ZONE } from '../src/modules/availability/availability.constants.js';
import { Appointment } from '../src/modules/appointments/entities/appointment.entity.js';
import { Doctor } from '../src/modules/doctors/entities/doctor.entity.js';

describe('Appointments API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let doctorId: number;
  let monday: string;

  const patientName = `E2E-${randomUUID()}`;

  function appointmentAt(time: string): string {
    const datetime = DateTime.fromISO(`${monday}T${time}`, {
      zone: CLINIC_TIME_ZONE,
    });

    const result = datetime.toISO({
      suppressMilliseconds: true,
    });

    if (!datetime.isValid || !result) {
      throw new Error('Invalid test appointment time.');
    }

    return result;
  }

  function validBody() {
    return {
      patientName,
      examId: 17,
      doctorId,
      startAt: appointmentAt('09:20'),
    };
  }

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

    dataSource = app.get(DataSource);

    if (dataSource.options.database !== 'medical_scheduling_test') {
      throw new Error('Refusing to modify a non-test database.');
    }

    const doctor = await dataSource.getRepository(Doctor).findOneBy({
      crm: 'CRM-MG 11111',
    });

    if (!doctor) {
      throw new Error('Doctor seed is missing.');
    }

    doctorId = doctor.id;

    const date = DateTime.now()
      .setZone(CLINIC_TIME_ZONE)
      .plus({ weeks: 4 })
      .startOf('week')
      .toISODate();

    if (!date) {
      throw new Error('Could not determine test date.');
    }

    monday = date;
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.getRepository(Appointment).delete({
        patientName,
      });
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should create and persist a valid appointment', async () => {
    const body = validBody();

    const response = await request(app.getHttpServer())
      .post('/api/appointments')
      .send(body)
      .expect(201);

    expect(response.body).toMatchObject({
      patientName,
      examId: 17,
      doctorId,
      startAt: new Date(body.startAt).toISOString(),
      endAt: DateTime.fromISO(body.startAt)
        .plus({ minutes: 40 })
        .toUTC()
        .toISO(),
    });

    expect(response.body.id).toEqual(expect.any(Number));
    expect(response.body.createdAt).toEqual(expect.any(String));

    const saved = await dataSource
      .getRepository(Appointment)
      .findOneBy({ id: response.body.id as number });

    expect(saved).not.toBeNull();
    expect(saved?.patientName).toBe(patientName);

    const availability = await request(app.getHttpServer())
      .get(`/api/doctors/${doctorId}/availability`)
      .query({ examId: 17, date: monday })
      .expect(200);

    expect(availability.body).not.toContain('09:20');
  });

  it('should reject an occupied time with HTTP 409', async () => {
    const body = validBody();

    await request(app.getHttpServer())
      .post('/api/appointments')
      .send(body)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/appointments')
      .send(body)
      .expect(409);
  });

  it('should reject overlapping exams with different durations', async () => {
    await request(app.getHttpServer())
      .post('/api/appointments')
      .send(validBody())
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/appointments')
      .send({
        ...validBody(),
        examId: 1,
        startAt: appointmentAt('09:40'),
      })
      .expect(409);
  });

  it('should reject times outside the exam grid', async () => {
    await request(app.getHttpServer())
      .post('/api/appointments')
      .send({
        ...validBody(),
        startAt: appointmentAt('08:10'),
      })
      .expect(422);
  });

  it('should reject dates without medical shifts', async () => {
    const sunday = DateTime.fromISO(monday)
      .minus({ days: 1 })
      .toISODate();

    await request(app.getHttpServer())
      .post('/api/appointments')
      .send({
        ...validBody(),
        startAt: `${sunday}T09:20:00-03:00`,
      })
      .expect(422);
  });

  it('should reject a nonexistent doctor', async () => {
    await request(app.getHttpServer())
      .post('/api/appointments')
      .send({
        ...validBody(),
        doctorId: 2147483647,
      })
      .expect(404);
  });

  it('should reject a nonexistent exam', async () => {
    await request(app.getHttpServer())
      .post('/api/appointments')
      .send({
        ...validBody(),
        examId: 999999,
      })
      .expect(404);
  });

  it('should reject invalid request bodies', async () => {
    await request(app.getHttpServer())
      .post('/api/appointments')
      .send({
        ...validBody(),
        endAt: appointmentAt('10:00'),
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/appointments')
      .send({
        ...validBody(),
        examId: '17',
      })
      .expect(400);
  });

  it('should reject appointments in the past', async () => {
    await request(app.getHttpServer())
      .post('/api/appointments')
      .send({
        ...validBody(),
        startAt: '2020-01-07T09:20:00-03:00',
      })
      .expect(422);
  });

  it('should return the same appointment for a repeated key', async () => {
    const key = randomUUID();
    const body = validBody();

    const first = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);

    const replay = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);

    expect(replay.body.id).toBe(first.body.id);
    expect(replay.body).toEqual(first.body);

    expect(
      await dataSource.getRepository(Appointment).countBy({
        patientName,
      }),
    ).toBe(1);

    expect(replay.body).not.toHaveProperty('idempotencyKey');
  });

  it('should handle concurrent requests with the same key', async () => {
    const key = randomUUID();
    const body = validBody();

    const responses = await Promise.all([
      request(app.getHttpServer())
        .post('/api/appointments')
        .set('Idempotency-Key', key)
        .send(body),

      request(app.getHttpServer())
        .post('/api/appointments')
        .set('Idempotency-Key', key)
        .send(body),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      201,
      201,
    ]);

    expect(responses[0].body.id).toBe(responses[1].body.id);

    expect(
      await dataSource.getRepository(Appointment).countBy({
        patientName,
      }),
    ).toBe(1);
  });

  it('should reject reusing a key with different data', async () => {
    const key = randomUUID();
    const body = validBody();

    await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Idempotency-Key', key)
      .send({
        ...body,
        patientName: 'Outro paciente',
      })
      .expect(409);

    expect(response.body.code).toBe('IDEMPOTENCY_KEY_REUSED');

    expect(
      await dataSource.getRepository(Appointment).countBy({
        patientName,
      }),
    ).toBe(1);
  });
});
