import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import {
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import App from '../../App';
import { server } from '../../test/server';
import type { CreateAppointmentInput } from './appointments.api';

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

function getSelectableDay(): HTMLButtonElement {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      '.booking-calendar .rdp-day_button',
    ),
  );

  const day = buttons.find(
    (button) =>
      !button.disabled &&
      !button.closest('.rdp-disabled') &&
      !button.closest('.rdp-outside'),
  );

  if (!day) {
    throw new Error('No available calendar day found.');
  }

  return day;
}

async function goToConfirmation() {
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

  await user.selectOptions(
    screen.getByRole('combobox', {
      name: 'Profissional',
    }),
    '1',
  );

  await user.click(getSelectableDay());

  await user.click(
    await screen.findByRole('button', {
      name: 'Selecionar horário 09:20',
    }),
  );

  await user.click(
    screen.getByRole('button', {
      name: 'Revisar agendamento',
    }),
  );

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
      ]),
    ),

    http.get(
      '*/api/doctors/:doctorId/availability',
      () => HttpResponse.json(['09:20', '10:00']),
    ),
  );
});

describe('Booking confirmation', () => {
  it('should require the patient name', async () => {
    const user = await goToConfirmation();

    await user.click(
      screen.getByRole('button', {
        name: 'Confirmar agendamento',
      }),
    );

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Informe o nome do paciente.');
  });

  it('should submit the appointment and show confirmation', async () => {
    let submitted: CreateAppointmentInput | null = null;

    server.use(
      http.post('*/api/appointments', async ({ request }) => {
        const body =
          await request.json() as CreateAppointmentInput;

        submitted = body;

        return HttpResponse.json(
          {
            id: 71,
            ...body,
            endAt: new Date(
              new Date(body.startAt).getTime() + 40 * 60_000,
            ).toISOString(),
            createdAt: '2030-01-01T12:00:00.000Z',
          },
          { status: 201 },
        );
      }),
    );

    const user = await goToConfirmation();

    await user.type(
      screen.getByRole('textbox', {
        name: 'Nome completo do paciente',
      }),
      '  Maria Oliveira  ',
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Confirmar agendamento',
      }),
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Agendamento confirmado!',
      }),
    ).toBeInTheDocument();

    expect(submitted).toMatchObject({
      patientName: 'Maria Oliveira',
      examId: 17,
      doctorId: 1,
      startAt: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/,
      ),
    });

    expect(
      screen.getByText('#71'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Maria Oliveira'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Agendar outro exame',
      }),
    );

    expect(
      screen.getByRole('heading', {
        name: 'Qual exame você deseja agendar?',
      }),
    ).toBeInTheDocument();
  });

  it('should refresh availability after HTTP 409', async () => {
    let availableSlots = ['09:20', '10:00'];

    server.use(
      http.get(
        '*/api/doctors/:doctorId/availability',
        () => HttpResponse.json(availableSlots),
      ),

      http.post('*/api/appointments', () => {
        availableSlots = ['10:00'];

        return HttpResponse.json(
          { message: 'Conflict' },
          { status: 409 },
        );
      }),
    );

    const user = await goToConfirmation();

    await user.type(
      screen.getByRole('textbox', {
        name: 'Nome completo do paciente',
      }),
      'Maria Oliveira',
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Confirmar agendamento',
      }),
    );

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'Esse horário acabou de ser reservado.',
    );

    expect(
      await screen.findByRole('button', {
        name: 'Selecionar horário 10:00',
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.queryByRole('button', {
          name: 'Selecionar horário 09:20',
        }),
      ).not.toBeInTheDocument();
    });

    const summary = screen.getByRole('complementary', {
      name: 'Seu agendamento',
    });

    expect(
      within(summary).queryByText('09:20'),
    ).not.toBeInTheDocument();
  });

  it('should show a friendly message for HTTP 422', async () => {
    server.use(
      http.post('*/api/appointments', () =>
        HttpResponse.json(
          { message: 'Invalid appointment time' },
          { status: 422 },
        ),
      ),
    );

    const user = await goToConfirmation();

    await user.type(
      screen.getByRole('textbox', {
        name: 'Nome completo do paciente',
      }),
      'Maria Oliveira',
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Confirmar agendamento',
      }),
    );

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'Esse horário não pode mais ser agendado.',
    );
  });

  it('should not expose technical errors to the patient', async () => {
    server.use(
      http.post('*/api/appointments', () =>
        HttpResponse.json(
          { message: 'Internal database error' },
          { status: 500 },
        ),
      ),
    );

    const user = await goToConfirmation();

    await user.type(
      screen.getByRole('textbox', {
        name: 'Nome completo do paciente',
      }),
      'Maria Oliveira',
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Confirmar agendamento',
      }),
    );

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'Não foi possível confirmar o agendamento.',
    );

    expect(
      screen.queryByText('Internal database error'),
    ).not.toBeInTheDocument();
  });
});
