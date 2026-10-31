import { EventEmitter } from 'node:events';

import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { httpRequestLogger } from './http-request-logger.js';

type Request = Parameters<typeof httpRequestLogger>[0];
type Response = Parameters<typeof httpRequestLogger>[1];

function createRequest(route?: string): Request {
  return {
    method: 'POST',
    route: route ? { path: route } : undefined,
    originalUrl: '/api/appointments?patientName=Paciente%20Sigiloso',
    body: {
      patientName: 'Paciente Sigiloso',
    },
    headers: {
      'idempotency-key': 'secret-idempotency-key',
    },
  } as unknown as Request;
}

function createResponse(statusCode: number): Response {
  return Object.assign(new EventEmitter(), {
    statusCode,
  }) as unknown as Response;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HTTP request logger', () => {
  it('should log structured metadata after a successful response', () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const request = createRequest('/api/appointments');
    const response = createResponse(201);
    const next = vi.fn();

    httpRequestLogger(request, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(log).not.toHaveBeenCalled();

    response.emit('finish');

    expect(log).toHaveBeenCalledWith(
      'http_request_completed',
      expect.objectContaining({
        method: 'POST',
        route: '/api/appointments',
        statusCode: 201,
        durationMs: expect.any(Number),
      }),
    );

    expect(log).toHaveBeenCalledOnce();
  });

  it('should classify HTTP conflicts as warnings', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const response = createResponse(409);

    httpRequestLogger(createRequest('/api/appointments'), response, vi.fn());

    response.emit('finish');

    expect(warn).toHaveBeenCalledWith(
      'http_request_completed',
      expect.objectContaining({
        route: '/api/appointments',
        statusCode: 409,
      }),
    );
  });

  it('should classify server failures as errors', () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const response = createResponse(500);

    httpRequestLogger(createRequest('/api/appointments'), response, vi.fn());

    response.emit('finish');

    expect(error).toHaveBeenCalledWith(
      'http_request_completed',
      expect.objectContaining({
        statusCode: 500,
      }),
    );
  });

  it('should not include patient data, query strings or headers in logs', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const response = createResponse(404);

    httpRequestLogger(createRequest(), response, vi.fn());

    response.emit('finish');

    expect(warn).toHaveBeenCalledWith(
      'http_request_completed',
      expect.objectContaining({
        route: 'unmatched',
        statusCode: 404,
      }),
    );

    const loggedContent = JSON.stringify(warn.mock.calls);

    expect(loggedContent).not.toContain('Paciente Sigiloso');
    expect(loggedContent).not.toContain('patientName');
    expect(loggedContent).not.toContain('secret-idempotency-key');
  });
});
