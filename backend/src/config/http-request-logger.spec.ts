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

type MockResponse = Response & {
  setHeaderMock: ReturnType<typeof vi.fn>;
};

function createResponse(statusCode: number): MockResponse {
  const setHeaderMock = vi.fn();

  return Object.assign(new EventEmitter(), {
    statusCode,
    setHeader: setHeaderMock,
    setHeaderMock,
  }) as unknown as MockResponse;
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

  it('should generate a request ID and include it in the response and log', () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const response = createResponse(200);
    const next = vi.fn();

    httpRequestLogger(createRequest('/api/doctors'), response, next);

    expect(response.setHeaderMock).toHaveBeenCalledWith(
      'X-Request-ID',
      expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
    );

    // The header is set before the request reaches NestJS.
    expect(next).toHaveBeenCalledOnce();

    const requestId = response.setHeaderMock.mock.calls[0]?.[1];

    response.emit('finish');

    expect(log).toHaveBeenCalledWith(
      'http_request_completed',
      expect.objectContaining({
        requestId,
        method: 'POST',
        route: '/api/doctors',
        statusCode: 200,
      }),
    );
  });

  it('should generate a different request ID for each request', () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const firstResponse = createResponse(200);
    const secondResponse = createResponse(200);

    httpRequestLogger(createRequest(), firstResponse, vi.fn());
    httpRequestLogger(createRequest(), secondResponse, vi.fn());

    const firstId = firstResponse.setHeaderMock.mock.calls[0]?.[1];
    const secondId = secondResponse.setHeaderMock.mock.calls[0]?.[1];

    expect(firstId).toEqual(expect.any(String));
    expect(secondId).toEqual(expect.any(String));
    expect(firstId).not.toBe(secondId);

    firstResponse.emit('finish');
    secondResponse.emit('finish');
  });

  it('should log an aborted response without exposing patient data', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const response = createResponse(200);

    httpRequestLogger(createRequest('/api/appointments'), response, vi.fn());

    response.emit('close');

    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      'http_request_aborted',
      expect.objectContaining({
        method: 'POST',
        route: '/api/appointments',
        statusCode: null,
        durationMs: expect.any(Number),
        requestId: expect.any(String),
      }),
    );

    const loggedContent = JSON.stringify(warn.mock.calls);
    expect(loggedContent).not.toContain('Paciente Sigiloso');
    expect(loggedContent).not.toContain('secret-idempotency-key');

    response.emit('finish');
    expect(log).not.toHaveBeenCalled();
  });

  it('should not log an aborted response after a completed request', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const response = createResponse(200);

    httpRequestLogger(createRequest('/api/appointments'), response, vi.fn());
    response.emit('finish');
    response.emit('close');

    expect(log).toHaveBeenCalledOnce();
    expect(warn).not.toHaveBeenCalled();
  });
});
