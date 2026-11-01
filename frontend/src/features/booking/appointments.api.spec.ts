import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  APPOINTMENT_REQUEST_TIMEOUT_MS,
  AppointmentTimeoutError,
  createAppointment,
  type CreateAppointmentInput,
} from './appointments.api';

const input: CreateAppointmentInput = {
  patientName: 'Maria Oliveira',
  examId: 17,
  doctorId: 1,
  startAt: '2030-01-07T12:20:00.000Z',
};

const idempotencyKey = '00000000-0000-4000-8000-000000000001';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('createAppointment timeout', () => {
  it('aborts an unanswered request and allows the caller to retry with the same key', async () => {
    vi.useFakeTimers();

    const keys: string[] = [];
    const fetchMock = vi.fn((_url: string, options: RequestInit) => {
      const headers = options.headers as Record<string, string>;
      keys.push(headers['Idempotency-Key']);

      return new Promise<Response>((_resolve, reject) => {
        options.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('The request was aborted.', 'AbortError')),
          { once: true },
        );
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const firstAttempt = expect(createAppointment(input, idempotencyKey)).rejects.toBeInstanceOf(
      AppointmentTimeoutError,
    );

    await vi.advanceTimersByTimeAsync(APPOINTMENT_REQUEST_TIMEOUT_MS);
    await firstAttempt;

    const secondAttempt = expect(createAppointment(input, idempotencyKey)).rejects.toBeInstanceOf(
      AppointmentTimeoutError,
    );

    await vi.advanceTimersByTimeAsync(APPOINTMENT_REQUEST_TIMEOUT_MS);
    await secondAttempt;

    expect(keys).toEqual([idempotencyKey, idempotencyKey]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the timeout when confirmation finishes successfully', async () => {
    vi.useFakeTimers();

    const appointment = {
      id: 42,
      ...input,
      endAt: '2030-01-07T13:00:00.000Z',
      createdAt: '2030-01-01T12:00:00.000Z',
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(appointment),
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(createAppointment(input, idempotencyKey)).resolves.toEqual(appointment);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/appointments',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Idempotency-Key': idempotencyKey }),
        signal: expect.any(AbortSignal),
      }),
    );
    expect(vi.getTimerCount()).toBe(0);
  });
});
