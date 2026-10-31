export type Exam = {
  id: number;
  name: string;
  durationMinutes: number;
};

export async function fetchExams(
  search: string,
  signal?: AbortSignal,
): Promise<Exam[]> {
  const url = new URL('/api/exams', window.location.origin);

  if (search) {
    url.searchParams.set('search', search);
  }

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error('Failed to fetch exams.');
  }

  return response.json() as Promise<Exam[]>;
}
