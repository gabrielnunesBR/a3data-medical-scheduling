import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Exam } from '../exams/exams.api';
import type { Doctor } from './availability.api';
import type { Appointment } from './appointments.api';
import { BookingSuccess } from './booking-success';

const appointment: Appointment = {
  id: 123,
  patientName: 'Maria Oliveira',
  examId: 17,
  doctorId: 1,
  startAt: '2026-11-02T12:20:00.000Z',
  endAt: '2026-11-02T13:00:00.000Z',
  createdAt: '2026-10-31T12:00:00.000Z',
};

const exam: Exam = {
  id: 17,
  name: 'Ressonância magnética',
  durationMinutes: 40,
};

const doctor: Doctor = {
  id: 1,
  name: 'Dra. Helena Marques',
  crm: 'CRM-MG 11111',
  workingWeekdays: [1, 2, 3, 4, 5],
};

function renderSuccess(overrides?: Partial<Appointment>) {
  const onNewBooking = vi.fn();

  render(
    <BookingSuccess
      appointment={{ ...appointment, ...overrides }}
      exam={exam}
      doctor={doctor}
      onNewBooking={onNewBooking}
    />,
  );

  return { onNewBooking };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Booking receipt', () => {
  it('should show confirmed data and both appointment times in the clinic time zone', () => {
    renderSuccess();

    const receipt = document.querySelector('.booking-receipt');

    expect(receipt).not.toBeNull();

    const details = within(receipt as HTMLElement);

    expect(details.getByText('#123')).toBeInTheDocument();
    expect(details.getByText('Maria Oliveira')).toBeInTheDocument();
    expect(details.getByText('Ressonância magnética')).toBeInTheDocument();
    expect(details.getByText('Dra. Helena Marques')).toBeInTheDocument();
    expect(details.getByText(/02 de novembro de 2026, às 09:20/i)).toBeInTheDocument();
    expect(details.getAllByText('10:00')).toHaveLength(2);
    expect(details.getAllByText('Horário de Brasília')).toHaveLength(2);
  });

  it('should include the end date when the appointment crosses midnight', () => {
    renderSuccess({
      startAt: '2026-11-03T02:40:00.000Z',
      endAt: '2026-11-03T03:20:00.000Z',
    });

    expect(screen.getByText(/02 de novembro de 2026, às 23:40/i)).toBeInTheDocument();
    expect(screen.getAllByText(/03 de novembro de 2026, às 00:20/i)).toHaveLength(2);
  });

  it('should include an accessible on-screen summary and a print-only date highlight', () => {
    renderSuccess();

    const receipt = document.querySelector('.booking-receipt');
    expect(receipt).not.toBeNull();

    const details = within(receipt as HTMLElement);
    expect(details.getByText('Comprovante de agendamento')).toBeInTheDocument();
    expect(details.getByText('Agendamento de exames')).toBeInTheDocument();
    expect(details.getByText('Confirmado')).toBeInTheDocument();
    expect(details.getByText('09:20')).toBeInTheDocument();
    expect(details.getAllByText('10:00')).toHaveLength(2);
    expect(details.getByText('Agendamento #123')).toBeInTheDocument();
  });

  it('should invoke the browser print dialog', async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    renderSuccess();

    await user.click(screen.getByRole('button', { name: 'Imprimir comprovante' }));

    expect(print).toHaveBeenCalledOnce();
  });

  it('should copy the appointment number and announce success', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    renderSuccess();

    await user.click(screen.getByRole('button', { name: 'Copiar número' }));

    expect(writeText).toHaveBeenCalledWith('123');
    expect(await screen.findByRole('status')).toHaveTextContent('Número do agendamento copiado.');
  });

  it('should offer a manual alternative if clipboard access fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('Clipboard unavailable'),
    );

    renderSuccess();

    await user.click(screen.getByRole('button', { name: 'Copiar número' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Não foi possível copiar. Selecione o número e copie manualmente.',
    );
  });

  it('should offer a private calendar event and an ICS download after confirmation', () => {
    renderSuccess();

    const googleCalendar = screen.getByRole('link', { name: /Google Calendar/ });
    const url = new URL(googleCalendar.getAttribute('href') ?? '');

    expect(googleCalendar).toHaveAttribute('target', '_blank');
    expect(googleCalendar).toHaveAttribute('rel', 'noopener noreferrer');
    expect(url.searchParams.get('dates')).toBe('20261102T122000Z/20261102T130000Z');
    expect(screen.getByRole('button', { name: 'Baixar arquivo .ics' })).toBeInTheDocument();
    expect(
      screen.getByText(/não inclui o nome do paciente nem o tipo de exame/i),
    ).toBeInTheDocument();
  });

  it('should allow starting a new booking', async () => {
    const user = userEvent.setup();
    const { onNewBooking } = renderSuccess();

    await user.click(screen.getByRole('button', { name: 'Agendar outro exame' }));

    expect(onNewBooking).toHaveBeenCalledOnce();
  });
});
