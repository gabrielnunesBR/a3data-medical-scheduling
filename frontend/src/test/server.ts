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

export const server = setupServer(
  http.get('*/api/exams', ({ request }) => {
    const search =
      new URL(request.url).searchParams.get('search')?.trim().toLocaleLowerCase('pt-BR') ?? '';

    const result = exams.filter((exam) => exam.name.toLocaleLowerCase('pt-BR').includes(search));

    return HttpResponse.json(result);
  }),
);
