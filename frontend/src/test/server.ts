import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const exams = [
  {
    id: 17,
    name: 'Ressonância magnética',
    durationMinutes: 40,
  },
  {
    id: 1,
    name: 'Raio-X de tórax',
    durationMinutes: 20,
  },
  {
    id: 2,
    name: 'Ultrassonografia abdominal',
    durationMinutes: 30,
  },
];

function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
}

export const server = setupServer(
  http.get('*/api/exams', ({ request }) => {
    const search = new URL(request.url).searchParams.get('search')?.trim() ?? '';
    const term = normalizeSearchText(search);

    const result = exams.filter((exam) => normalizeSearchText(exam.name).includes(term));

    return HttpResponse.json(result);
  }),
);
