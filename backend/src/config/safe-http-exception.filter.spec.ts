import {
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  Logger,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureApp } from './configure-app.js';

@Controller('exception-test')
class ExceptionTestController {
  @Get('database')
  databaseError(): never {
    throw new QueryFailedError(
      'INSERT INTO appointments (patient_name) VALUES ($1)',
      ['Paciente Sigiloso'],
      new Error('database password=internal-secret'),
    );
  }

  @Get('unexpected')
  unexpectedError(): never {
    throw new Error('patientName=Paciente Sigiloso');
  }

  @Get('validation')
  validationError(): never {
    throw new BadRequestException('Invalid request.');
  }

  @Get('conflict')
  conflictError(): never {
    throw new ConflictException({
      code: 'IDEMPOTENCY_KEY_REUSED',
      message: 'Idempotency key was already used with different data.',
    });
  }
}

describe('SafeHttpExceptionFilter', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ExceptionTestController],
    }).compile();

    app = moduleRef.createNestApplication({
      logger: false,
    });

    configureApp(app);

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('should hide database error details from responses and logs', async () => {
    const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const response = await request(app.getHttpServer())
      .get('/api/exception-test/database')
      .expect(500);

    expect(response.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });

    const requestId = response.headers['x-request-id'];

    expect(requestId).toEqual(expect.any(String));

    expect(errorLog).toHaveBeenCalledWith(
      'unhandled_http_exception',
      expect.objectContaining({
        requestId,
        errorCategory: 'database_error',
      }),
    );

    const loggedContent = JSON.stringify(errorLog.mock.calls);

    expect(loggedContent).not.toContain('Paciente Sigiloso');
    expect(loggedContent).not.toContain('internal-secret');
    expect(loggedContent).not.toContain('INSERT INTO');
    expect(loggedContent).not.toContain('password=');
  });

  it('should sanitize unexpected application errors', async () => {
    const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const response = await request(app.getHttpServer())
      .get('/api/exception-test/unexpected')
      .expect(500);

    expect(response.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });

    expect(errorLog).toHaveBeenCalledWith(
      'unhandled_http_exception',
      expect.objectContaining({
        errorCategory: 'unexpected_error',
      }),
    );

    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('Paciente Sigiloso');
  });

  it('should preserve HTTP 400 validation errors', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/exception-test/validation')
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      message: 'Invalid request.',
    });

    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('should preserve HTTP 409 business errors', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/exception-test/conflict')
      .expect(409);

    expect(response.body).toMatchObject({
      code: 'IDEMPOTENCY_KEY_REUSED',
      message: 'Idempotency key was already used with different data.',
    });

    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });
});
