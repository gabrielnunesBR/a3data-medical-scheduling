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
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { CLINIC_TIME_ZONE } from '../src/modules/availability/availability.constants.js';
import { Appointment } from '../src/modules/appointments/entities/appointment.entity.js';
import { Doctor } from '../src/modules/doctors/entities/doctor.entity.js';

describe('Appointments concurrency (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let doctorId: number;
  let monday: string;
  let patientName: string;

  function appointmentAt(time: string): string {
    const datetime = DateTime.fromISO(`${monday}T${time}`, {
      zone: CLINIC_TIME_ZONE,
    });

    const result = datetime.toISO({
      suppressMilliseconds: true,
    });

    if (!datetime.isValid || !result) {
      throw new Error('Invalid test appointment date.');
    }

    return result;
  }

  function appointmentBody(
    time = '09:20',
    examId = 17,
  ) {
    return {
      patientName,
      examId,
      doctorId,
      startAt: appointmentAt(time),
    };
  }

  async function sendAppointment(
    body: ReturnType<typeof appointmentBody>,
  ) {
    return request(app.getHttpServer())
      .post('/api/appointments')
      .send(body)
      .expect((response) => {
        if (![201, 409].includes(response.status)) {
          throw new Error(
            `Unexpected HTTP ${response.status}: ${JSON.stringify(response.body)}`,
          );
        }
      });
  }

  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Tests require NODE_ENV=test.');
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

    const doctor = await dataSource
      .getRepository(Doctor)
      .findOneBy({
        crm: 'CRM-MG 11111',
      });

    if (!doctor) {
      throw new Error('Doctor seed is missing.');
    }

    doctorId = doctor.id;

    const date = DateTime.now()
      .setZone(CLINIC_TIME_ZONE)
      .plus({ weeks: 12 })
      .startOf('week')
      .toISODate();

    if (!date) {
      throw new Error('Could not determine test date.');
    }

    monday = date;
  });

  beforeEach(() => {
    patientName = `E2E-${randomUUID()}`;
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

  it('should allow exactly one of eight concurrent bookings', async () => {
    const body = appointmentBody();

    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        sendAppointment(body),
      ),
    );

    const statuses = responses
      .map((response) => response.status)
      .sort((a, b) => a - b);

    expect(statuses).toEqual([
      201,
      409,
      409,
      409,
      409,
      409,
      409,
      409,
    ]);

    const appointments = await dataSource
      .getRepository(Appointment)
      .findBy({ patientName });

    expect(appointments).toHaveLength(1);

    expect(appointments[0].startAt).toEqual(
      new Date(body.startAt),
    );

    expect(appointments[0].endAt).toEqual(
      new Date(appointmentAt('10:00')),
    );
  }, 20_000);

  it('should prevent concurrent partially overlapping bookings', async () => {
    const responses = await Promise.all([
      sendAppointment(appointmentBody('09:20', 17)),
      sendAppointment(appointmentBody('09:40', 1)),
    ]);

    const statuses = responses
      .map((response) => response.status)
      .sort((a, b) => a - b);

    expect(statuses).toEqual([201, 409]);

    const appointments = await dataSource
      .getRepository(Appointment)
      .findBy({ patientName });

    expect(appointments).toHaveLength(1);
  });

  it('should allow concurrent adjacent bookings', async () => {
    const responses = await Promise.all([
      sendAppointment(appointmentBody('08:00', 17)),
      sendAppointment(appointmentBody('08:40', 17)),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      201,
      201,
    ]);

    const appointments = await dataSource
      .getRepository(Appointment)
      .find({
        where: { patientName },
        order: { startAt: 'ASC' },
      });

    expect(appointments).toHaveLength(2);

    expect(appointments[0].endAt).toEqual(
      appointments[1].startAt,
    );
  });

  it('should enforce the exclusion constraint in PostgreSQL', async () => {
    const repository = dataSource.getRepository(Appointment);

    await repository.insert({
      patientName,
      examId: 17,
      doctorId,
      startAt: new Date(appointmentAt('09:20')),
      endAt: new Date(appointmentAt('10:00')),
    });

    await expect(
      repository.insert({
        patientName,
        examId: 1,
        doctorId,
        startAt: new Date(appointmentAt('09:40')),
        endAt: new Date(appointmentAt('10:00')),
      }),
    ).rejects.toMatchObject({
      driverError: {
        code: '23P01',
      },
    });

    expect(
      await repository.countBy({ patientName }),
    ).toBe(1);
  });
});
