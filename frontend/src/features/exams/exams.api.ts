export type Exam = {
  id: number;
  name: string;
  durationMinutes: number;
};

export async function fetchExams(search: string, signal?: AbortSignal): Promise<Exam[]> {
  const params = new URLSearchParams();

  if (search) {
    params.set('search', search);
  }

  const query = params.toString();

  const url = query ? `/api/exams?${query}` : '/api/exams';

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error('Failed to fetch exams.');
  }

  return response.json() as Promise<Exam[]>;
}
