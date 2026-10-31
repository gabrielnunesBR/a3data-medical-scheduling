import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import {
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import App from '../../App';
import { server } from '../../test/server';

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe('Exam search', () => {
  it('should list available exams', async () => {
    renderApp();

    expect(
      await screen.findByRole('button', {
        name: /Ressonância magnética/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: /Raio-X de tórax/i,
      }),
    ).toBeInTheDocument();
  });

  it('should search exams by name', async () => {
    const user = userEvent.setup();

    renderApp();

    await screen.findByRole('button', {
      name: /Raio-X de tórax/i,
    });

    await user.type(
      screen.getByRole('searchbox', {
        name: /Buscar exame pelo nome/i,
      }),
      'Ressonância',
    );

    expect(
      await screen.findByText('1 exame encontrado'),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: /Ressonância magnética/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('button', {
        name: /Raio-X de tórax/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('should update the appointment summary', async () => {
    const user = userEvent.setup();

    renderApp();

    await user.click(
      await screen.findByRole('button', {
        name: /Ressonância magnética/i,
      }),
    );

    const summary = screen.getByRole('complementary', {
      name: 'Seu agendamento',
    });

    expect(
      within(summary).getByText('Ressonância magnética'),
    ).toBeInTheDocument();

    expect(
      within(summary).getByText('Duração: 40 minutos'),
    ).toBeInTheDocument();
  });

  it('should show an empty state', async () => {
    const user = userEvent.setup();

    renderApp();

    await user.type(
      screen.getByRole('searchbox', {
        name: /Buscar exame pelo nome/i,
      }),
      'Exame inexistente',
    );

    expect(
      await screen.findByText('Nenhum exame encontrado'),
    ).toBeInTheDocument();
  });

  it('should show an error when the API fails', async () => {
    server.use(
      http.get('*/api/exams', () => {
        return new HttpResponse(null, {
          status: 503,
        });
      }),
    );

    renderApp();

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'Não foi possível carregar os exames.',
    );

    expect(
      screen.getByRole('button', {
        name: 'Tentar novamente',
      }),
    ).toBeInTheDocument();
  });
});
