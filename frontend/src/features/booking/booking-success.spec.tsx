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
    expect(details.getByText('10:00')).toBeInTheDocument();
    expect(details.getByText('Horário de Brasília')).toBeInTheDocument();
  });

  it('should include the end date when the appointment crosses midnight', () => {
    renderSuccess({
      startAt: '2026-11-03T02:40:00.000Z',
      endAt: '2026-11-03T03:20:00.000Z',
    });

    expect(screen.getByText(/02 de novembro de 2026, às 23:40/i)).toBeInTheDocument();
    expect(screen.getByText(/03 de novembro de 2026, às 00:20/i)).toBeInTheDocument();
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

  it('should allow starting a new booking', async () => {
    const user = userEvent.setup();
    const { onNewBooking } = renderSuccess();

    await user.click(screen.getByRole('button', { name: 'Agendar outro exame' }));

    expect(onNewBooking).toHaveBeenCalledOnce();
  });
});
