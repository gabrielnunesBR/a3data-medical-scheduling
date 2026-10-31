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

  constructor(status: number) {
    super('Appointment request failed.');

    this.name = 'AppointmentRequestError';
    this.status = status;
  }
}

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const response = await fetch('/api/appointments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new AppointmentRequestError(response.status);
  }

  return response.json() as Promise<Appointment>;
}
