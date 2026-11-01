export type CreateAppointmentInput = {
  patientName: string;
  examId: number;
  doctorId: number;
  startAt: string;
};

export type Appointment = CreateAppointmentInput & {
  id: number;
  endAt: string;
  createdAt: string;
};

export class AppointmentRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, code?: string) {
    super(`Appointment request failed with status ${status}.`);

    this.name = 'AppointmentRequestError';
    this.status = status;
    this.code = code;
  }
}

// Give the server time to confirm a reservation while bounding the UI loading state.
export const APPOINTMENT_REQUEST_TIMEOUT_MS = 15_000;

export class AppointmentTimeoutError extends Error {
  constructor() {
    super('Appointment confirmation timed out.');
    this.name = 'AppointmentTimeoutError';
  }
}

function getErrorCode(body: unknown): string | undefined {
  if (
    typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    typeof body.code === 'string'
  ) {
    return body.code;
  }

  return undefined;
}

export async function createAppointment(
  input: CreateAppointmentInput,
  idempotencyKey: string,
): Promise<Appointment> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APPOINTMENT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody: unknown = await response.json().catch((error: unknown) => {
        if (controller.signal.aborted) {
          throw error;
        }

        return null;
      });

      throw new AppointmentRequestError(response.status, getErrorCode(errorBody));
    }

    return (await response.json()) as Appointment;
  } catch (error: unknown) {
    // The reservation might have been committed even if the response was lost.
    // Keep the idempotency key unchanged when the user tries again.
    if (controller.signal.aborted) {
      throw new AppointmentTimeoutError();
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
