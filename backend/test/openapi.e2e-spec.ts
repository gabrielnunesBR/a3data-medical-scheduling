import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { OpenAPIObject, OperationObject } from '@nestjs/swagger';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { configureSwagger } from '../src/config/configure-swagger.js';
import { createAppointmentSchema } from '../src/modules/appointments/dto/create-appointment.dto.js';

describe('OpenAPI contract (e2e)', () => {
  let app: INestApplication | undefined;
  let document: OpenAPIObject;

  function getOperation(method: 'get' | 'post', path: string): OperationObject {
    const operation = document.paths[path]?.[method];

    if (!operation) {
      throw new Error(`OpenAPI operation missing: ${method.toUpperCase()} ${path}`);
    }

    return operation;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const testApp = moduleRef.createNestApplication({ logger: false });
    app = testApp;

    configureApp(testApp);
    configureSwagger(testApp);
    await testApp.init();

    const response = await request(testApp.getHttpServer()).get('/api/openapi.json').expect(200);

    document = response.body as OpenAPIObject;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should expose all five endpoints with documented success responses', () => {
    const endpoints = [
      { method: 'get', path: '/api/exams', status: 200 },
      { method: 'get', path: '/api/doctors', status: 200 },
      { method: 'get', path: '/api/doctors/{id}/availability', status: 200 },
      { method: 'post', path: '/api/appointments', status: 201 },
      { method: 'get', path: '/api/health', status: 200 },
    ] as const;

    for (const { method, path, status } of endpoints) {
      const operation = getOperation(method, path);

      expect(operation.summary, `${method.toUpperCase()} ${path}`).toEqual(expect.any(String));
      expect(operation.responses[status]).toHaveProperty('content.application/json.schema');
    }
  });

  it('should document working weekdays in the doctors response', () => {
    const doctors = getOperation('get', '/api/doctors');
    const response = doctors.responses[200];

    if (!response || !('content' in response)) {
      throw new Error('GET /api/doctors must document a JSON response.');
    }

    expect(response.content?.['application/json']?.schema).toMatchObject({
      type: 'array',
      items: {
        type: 'object',
        required: expect.arrayContaining(['id', 'name', 'crm', 'workingWeekdays']),
        properties: {
          workingWeekdays: {
            type: 'array',
            uniqueItems: true,
            items: { type: 'integer', minimum: 1, maximum: 7 },
          },
        },
      },
    });
  });

  it('should document the Zod query and path parameters', () => {
    const exams = getOperation('get', '/api/exams');

    expect(exams.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'search',
          in: 'query',
          required: false,
          schema: expect.objectContaining({ type: 'string', maxLength: 100 }),
        }),
      ]),
    );

    const availability = getOperation('get', '/api/doctors/{id}/availability');

    expect(availability.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'id',
          in: 'path',
          required: true,
          schema: expect.objectContaining({ type: 'integer' }),
        }),
        expect.objectContaining({
          name: 'examId',
          in: 'query',
          required: true,
          schema: expect.objectContaining({ type: 'integer' }),
        }),
        expect.objectContaining({
          name: 'date',
          in: 'query',
          required: true,
          schema: expect.objectContaining({
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          }),
        }),
      ]),
    );
  });

  it('should document a valid appointment body and an optional idempotency header', () => {
    const appointment = getOperation('post', '/api/appointments');

    const headers = (appointment.parameters ?? []).filter(
      (parameter) =>
        'name' in parameter &&
        parameter.in === 'header' &&
        parameter.name.toLowerCase() === 'idempotency-key',
    );

    expect(headers).toHaveLength(1);
    expect(headers[0]).toMatchObject({
      name: 'idempotency-key',
      in: 'header',
      required: false,
      schema: { type: 'string', format: 'uuid' },
    });

    const requestBody = appointment.requestBody;

    if (!requestBody || !('content' in requestBody)) {
      throw new Error('POST /api/appointments is missing its JSON request body');
    }

    const jsonContent = requestBody.content['application/json'];

    if (!jsonContent) {
      throw new Error('POST /api/appointments must accept application/json');
    }

    expect(jsonContent.schema).toMatchObject({
      type: 'object',
      additionalProperties: false,
      required: expect.arrayContaining(['patientName', 'examId', 'doctorId', 'startAt']),
      properties: {
        patientName: { type: 'string', minLength: 1, maxLength: 160 },
        examId: { type: 'integer', maximum: 2147483647 },
        doctorId: { type: 'integer', maximum: 2147483647 },
        startAt: { type: 'string', format: 'date-time' },
      },
    });

    expect(jsonContent.example).toMatchObject({
      patientName: 'Paciente Teste',
      examId: 17,
      doctorId: 1,
      startAt: expect.any(String),
    });

    expect(createAppointmentSchema.safeParse(jsonContent.example).success).toBe(true);

    const example = jsonContent.example as { startAt: string };
    expect(example.startAt).toMatch(/T\d{2}:\d{2}:00(?:Z|[+-]\d{2}:\d{2})$/);
  });

  it('should document appointment errors and health check unavailability', () => {
    const appointment = getOperation('post', '/api/appointments');

    for (const status of [201, 400, 404, 409, 422, 429, 503]) {
      expect(appointment.responses[status], `Missing HTTP ${status}`).toBeDefined();
    }

    const health = getOperation('get', '/api/health');
    expect(health.responses[503]).toBeDefined();
  });
});
