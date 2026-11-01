export type Doctor = {
  id: number;
  name: string;
  crm: string;
  /** ISO weekdays: Monday = 1, Sunday = 7. */
  workingWeekdays: number[];
};

type AvailabilityParams = {
  doctorId: number;
  examId: number;
  date: string;
  signal?: AbortSignal;
};

export async function fetchDoctors(signal?: AbortSignal): Promise<Doctor[]> {
  const response = await fetch('/api/doctors', { signal });

  if (!response.ok) {
    throw new Error('Failed to fetch doctors.');
  }

  return response.json() as Promise<Doctor[]>;
}

export async function fetchAvailability({
  doctorId,
  examId,
  date,
  signal,
}: AvailabilityParams): Promise<string[]> {
  const params = new URLSearchParams({
    examId: String(examId),
    date,
  });

  const response = await fetch(`/api/doctors/${doctorId}/availability?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch availability.');
  }

  return response.json() as Promise<string[]>;
}
