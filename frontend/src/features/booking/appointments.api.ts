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
  const response = await fetch('/api/appointments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => null);

    throw new AppointmentRequestError(response.status, getErrorCode(errorBody));
  }

  return response.json() as Promise<Appointment>;
}
