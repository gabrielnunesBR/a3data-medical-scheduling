import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';

type DoctorResponse = {
  id: number;
  name: string;
  crm: string;
};

describe('Doctors API (e2e)', () => {
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

  it('should return the five registered doctors', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/doctors')
      .expect(200);

    const doctors = response.body as DoctorResponse[];

    expect(doctors).toHaveLength(5);

    expect(doctors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Dra. Helena Marques',
          crm: 'CRM-MG 11111',
        }),
        expect.objectContaining({
          name: 'Dr. Rafael Teixeira',
          crm: 'CRM-MG 22222',
        }),
      ]),
    );
  });

  it('should return only the expected doctor fields', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/doctors')
      .expect(200);

    const doctors = response.body as DoctorResponse[];

    for (const doctor of doctors) {
      expect(Object.keys(doctor).sort()).toEqual([
        'crm',
        'id',
        'name',
      ]);

      expect(doctor.id).toEqual(expect.any(Number));
      expect(doctor.name).toEqual(expect.any(String));
      expect(doctor.crm).toEqual(expect.any(String));
    }
  });
});
