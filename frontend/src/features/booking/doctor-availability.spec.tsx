import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import App from '../../App';
import { server } from '../../test/server';

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

function getAvailableCalendarDay(): HTMLButtonElement {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.booking-calendar .rdp-day_button'),
  );

  const button = buttons.find(
    (item) => !item.disabled && !item.closest('.rdp-disabled') && !item.closest('.rdp-outside'),
  );

  if (!button) {
    throw new Error('No selectable calendar day found.');
  }

  return button;
}

async function goToAvailability() {
  const user = userEvent.setup();

  renderApp();

  await user.click(
    await screen.findByRole('button', {
      name: /Ressonância magnética/i,
    }),
  );

  await user.click(
    screen.getByRole('button', {
      name: 'Escolher médico e horário',
    }),
  );

  await screen.findByRole('option', {
    name: 'Dra. Helena Marques',
  });

  return user;
}

beforeEach(() => {
  server.use(
    http.get('*/api/doctors', () =>
      HttpResponse.json([
        {
          id: 1,
          name: 'Dra. Helena Marques',
          crm: 'CRM-MG 11111',
        },
        {
          id: 2,
          name: 'Dr. Rafael Teixeira',
          crm: 'CRM-MG 22222',
        },
      ]),
    ),

    http.get('*/api/doctors/:doctorId/availability', () =>
      HttpResponse.json(['08:00', '08:40', '09:20']),
    ),
  );
});

describe('Doctor availability', () => {
  it('should require an exam before continuing', async () => {
    renderApp();

    expect(
      screen.getByRole('button', {
        name: 'Escolher médico e horário',
      }),
    ).toBeDisabled();
  });

  it('should select doctor, date and time', async () => {
    const user = await goToAvailability();

    await user.selectOptions(
      screen.getByRole('combobox', {
        name: 'Profissional',
      }),
      '1',
    );

    await user.click(getAvailableCalendarDay());

    await user.click(
      await screen.findByRole('button', {
        name: 'Selecionar horário 09:20',
      }),
    );

    const summary = screen.getByRole('complementary', {
      name: 'Seu agendamento',
    });

    expect(within(summary).getByText('Dra. Helena Marques')).toBeInTheDocument();

    expect(within(summary).getByText('09:20')).toBeInTheDocument();
  });

  it('should clear the selected time when the doctor changes', async () => {
    const user = await goToAvailability();

    const doctorSelect = screen.getByRole('combobox', {
      name: 'Profissional',
    });

    await user.selectOptions(doctorSelect, '1');
    await user.click(getAvailableCalendarDay());

    await user.click(
      await screen.findByRole('button', {
        name: 'Selecionar horário 09:20',
      }),
    );

    await user.selectOptions(doctorSelect, '2');

    const summary = screen.getByRole('complementary', {
      name: 'Seu agendamento',
    });

    expect(within(summary).getByText('Dr. Rafael Teixeira')).toBeInTheDocument();

    expect(within(summary).queryByText('09:20')).not.toBeInTheDocument();

    expect(screen.getByText('Escolha uma data para consultar os horários.')).toBeInTheDocument();
  });

  it('should clear the selected time when the date is cleared', async () => {
    const user = await goToAvailability();

    await user.selectOptions(
      screen.getByRole('combobox', {
        name: 'Profissional',
      }),
      '1',
    );

    await user.click(getAvailableCalendarDay());

    await user.click(
      await screen.findByRole('button', {
        name: 'Selecionar horário 09:20',
      }),
    );

    await user.click(getAvailableCalendarDay());

    const summary = screen.getByRole('complementary', {
      name: 'Seu agendamento',
    });

    expect(within(summary).queryByText('09:20')).not.toBeInTheDocument();
  });

  it('should reset dependent selections when the exam changes', async () => {
    const user = await goToAvailability();

    await user.selectOptions(
      screen.getByRole('combobox', {
        name: 'Profissional',
      }),
      '1',
    );

    await user.click(getAvailableCalendarDay());

    await user.click(
      await screen.findByRole('button', {
        name: 'Selecionar horário 09:20',
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Voltar para exames',
      }),
    );

    await user.click(
      await screen.findByRole('button', {
        name: /Raio-X de tórax/i,
      }),
    );

    const summary = screen.getByRole('complementary', {
      name: 'Seu agendamento',
    });

    expect(within(summary).getByText('Raio-X de tórax')).toBeInTheDocument();

    expect(within(summary).getAllByText('Não selecionado')).toHaveLength(1);

    expect(within(summary).getByText('Não selecionados')).toBeInTheDocument();
  });

  it('should show an empty state when no slots are available', async () => {
    server.use(http.get('*/api/doctors/:doctorId/availability', () => HttpResponse.json([])));

    const user = await goToAvailability();

    await user.selectOptions(
      screen.getByRole('combobox', {
        name: 'Profissional',
      }),
      '1',
    );

    await user.click(getAvailableCalendarDay());

    expect(await screen.findByText('Nenhum horário disponível nesta data.')).toBeInTheDocument();
  });

  it('should focus the heading when entering the availability step', async () => {
    await goToAvailability();

    expect(
      screen.getByRole('heading', {
        name: 'Escolha o médico, a data e o horário',
      }),
    ).toHaveFocus();
  });

  it('should restore focus to the exam heading when going back', async () => {
    const user = await goToAvailability();

    await user.click(
      screen.getByRole('button', {
        name: 'Voltar para exames',
      }),
    );

    expect(
      screen.getByRole('heading', {
        name: 'Qual exame você deseja agendar?',
      }),
    ).toHaveFocus();
  });
});
