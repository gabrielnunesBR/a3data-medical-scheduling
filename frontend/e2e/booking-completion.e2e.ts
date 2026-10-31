import { randomUUID } from 'node:crypto';

import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import type { Client } from 'pg';
import { TZDate } from 'react-day-picker';

import type { Doctor } from '../src/features/booking/availability.api.js';
import {
  CLINIC_TIME_ZONE,
  toAppointmentStartAt,
  toClinicDate,
} from '../src/features/booking/booking-dates.js';
import type { Exam } from '../src/features/exams/exams.api.js';
import { createTestDatabaseClient } from './test-database.js';

type BookingFixture = {
  exam: Exam;
  doctor: Doctor;
  date: string;
  time: string;
};

let database: Client;

const patientsToCleanup = new Set<string>();

test.beforeAll(async () => {
  database = createTestDatabaseClient();

  await database.connect();

  const result = await database.query<{
    database_name: string;
  }>('SELECT current_database() AS database_name');

  if (result.rows[0]?.database_name !== 'medical_scheduling_test') {
    throw new Error('Connected to an unexpected database.');
  }
});

test.afterEach(async () => {
  if (patientsToCleanup.size === 0) {
    return;
  }

  const names = [...patientsToCleanup];

  await database.query(
    `DELETE FROM appointments
     WHERE patient_name = ANY($1::text[])`,
    [names],
  );

  patientsToCleanup.clear();
});

test.afterAll(async () => {
  if (database) {
    await database.end();
  }
});

function newTestPatient(): string {
  const name = `Teste E2E ${randomUUID()}`;

  patientsToCleanup.add(name);

  return name;
}

function futureMonday(): string {
  const date = TZDate.tz(CLINIC_TIME_ZONE);

  date.setDate(date.getDate() + 35);

  const daysUntilMonday = (8 - date.getDay()) % 7;

  date.setDate(date.getDate() + daysUntilMonday);

  return toClinicDate(date);
}

async function getBookingFixture(request: APIRequestContext): Promise<BookingFixture> {
  const [examsResponse, doctorsResponse] = await Promise.all([
    request.get('/api/exams'),
    request.get('/api/doctors'),
  ]);

  expect(examsResponse.ok()).toBe(true);
  expect(doctorsResponse.ok()).toBe(true);

  const exams = (await examsResponse.json()) as Exam[];
  const doctors = (await doctorsResponse.json()) as Doctor[];

  const exam = exams.find((item) => item.id === 17);

  const doctor = doctors.find((item) => item.crm === 'CRM-MG 11111');

  if (!exam || !doctor) {
    throw new Error('Required exam or doctor seed is missing.');
  }

  expect(exam.durationMinutes).toBe(40);

  const date = futureMonday();

  const availabilityResponse = await request.get(
    `/api/doctors/${doctor.id}/availability` + `?examId=${exam.id}&date=${date}`,
  );

  expect(availabilityResponse.ok()).toBe(true);

  const slots = (await availabilityResponse.json()) as string[];

  const time = slots[0];

  if (!time) {
    throw new Error(`No available test slots for doctor ${doctor.id} on ${date}.`);
  }

  return { exam, doctor, date, time };
}

async function selectCalendarDate(page: Page, date: string): Promise<void> {
  const day = page.locator(
    `.booking-calendar .rdp-day[data-day="${date}"]` + ':not(.rdp-outside) .rdp-day_button',
  );

  for (let attempt = 0; attempt < 8; attempt++) {
    if (await day.isVisible()) {
      await day.click();
      return;
    }

    await page.locator('.booking-calendar .rdp-button_next').click();
  }

  throw new Error(`Could not select calendar date: ${date}`);
}

async function goToConfirmation(page: Page, fixture: BookingFixture): Promise<void> {
  const { exam, doctor, date, time } = fixture;

  await page.goto('/');

  await page.getByRole('button').filter({ hasText: exam.name }).first().click();

  await page
    .getByRole('button', {
      name: 'Escolher médico e horário',
    })
    .click();

  await page
    .getByRole('combobox', {
      name: 'Profissional',
    })
    .selectOption(String(doctor.id));

  await selectCalendarDate(page, date);

  const timeButton = page.getByRole('button', {
    name: `Selecionar horário ${time}`,
  });

  await expect(timeButton).toBeVisible();

  await timeButton.click();

  await page
    .getByRole('button', {
      name: 'Revisar agendamento',
    })
    .click();

  await expect(
    page.getByRole('heading', {
      name: 'Revise e confirme seu agendamento',
    }),
  ).toBeVisible();
}

test('creates an appointment and persists it in PostgreSQL', async ({ page, request }) => {
  const fixture = await getBookingFixture(request);

  const patientName = newTestPatient();

  await goToConfirmation(page, fixture);

  await page
    .getByRole('textbox', {
      name: 'Nome completo do paciente',
    })
    .fill(patientName);

  await page
    .getByRole('button', {
      name: 'Confirmar agendamento',
    })
    .click();

  await expect(
    page.getByRole('heading', {
      name: 'Agendamento confirmado!',
    }),
  ).toBeVisible();

  await expect(page.getByText(patientName)).toBeVisible();

  const confirmationText = await page.getByText(/^#\d+$/).innerText();

  const appointmentId = Number(confirmationText.slice(1));

  expect(Number.isSafeInteger(appointmentId)).toBe(true);
  expect(appointmentId).toBeGreaterThan(0);

  const result = await database.query(
    `SELECT
       id,
       patient_name,
       exam_id,
       doctor_id,
       start_at,
       end_at
     FROM appointments
     WHERE id = $1 AND patient_name = $2`,
    [appointmentId, patientName],
  );

  expect(result.rows).toHaveLength(1);

  const appointment = result.rows[0];

  const startAt = toAppointmentStartAt(fixture.date, fixture.time);

  const endAt = new Date(new Date(startAt).getTime() + fixture.exam.durationMinutes * 60_000);

  expect(appointment).toMatchObject({
    id: appointmentId,
    patient_name: patientName,
    exam_id: fixture.exam.id,
    doctor_id: fixture.doctor.id,
  });

  expect(appointment.start_at).toEqual(new Date(startAt));
  expect(appointment.end_at).toEqual(endAt);

  const availabilityResponse = await request.get(
    `/api/doctors/${fixture.doctor.id}/availability` +
      `?examId=${fixture.exam.id}&date=${fixture.date}`,
  );

  expect(availabilityResponse.ok()).toBe(true);

  const availableSlots = (await availabilityResponse.json()) as string[];

  expect(availableSlots).not.toContain(fixture.time);
});

test('handles a real HTTP 409 and refreshes available slots', async ({ page, request }) => {
  const fixture = await getBookingFixture(request);

  const firstPatient = newTestPatient();
  const secondPatient = newTestPatient();

  await goToConfirmation(page, fixture);

  // Outra requisição reserva o horário depois que
  // o paciente já chegou à tela de confirmação.
  const blockingResponse = await request.post('/api/appointments', {
    data: {
      patientName: firstPatient,
      examId: fixture.exam.id,
      doctorId: fixture.doctor.id,
      startAt: toAppointmentStartAt(fixture.date, fixture.time),
    },
  });

  expect(blockingResponse.status()).toBe(201);

  await page
    .getByRole('textbox', {
      name: 'Nome completo do paciente',
    })
    .fill(secondPatient);

  await page
    .getByRole('button', {
      name: 'Confirmar agendamento',
    })
    .click();

  await expect(page.getByRole('alert')).toContainText('Esse horário acabou de ser reservado.');

  await expect(
    page.getByRole('heading', {
      name: 'Escolha o médico, a data e o horário',
    }),
  ).toBeVisible();

  await expect(
    page.getByRole('button', {
      name: `Selecionar horário ${fixture.time}`,
    }),
  ).toHaveCount(0);

  const result = await database.query(
    `SELECT patient_name
     FROM appointments
     WHERE patient_name = ANY($1::text[])`,
    [[firstPatient, secondPatient]],
  );

  expect(result.rows).toEqual([{ patient_name: firstPatient }]);
});

test('recovers a lost response without duplicating the appointment', async ({ page, request }) => {
  const fixture = await getBookingFixture(request);
  const patientName = newTestPatient();

  const submittedKeys: string[] = [];

  page.on('request', (req) => {
    const pathname = new URL(req.url()).pathname;

    if (req.method() === 'POST' && pathname === '/api/appointments') {
      submittedKeys.push(req.headers()['idempotency-key'] ?? '');
    }
  });

  await goToConfirmation(page, fixture);

  // A API processa normalmente a primeira requisição,
  // mas a resposta não chega ao navegador.
  await page.route(
    '**/api/appointments',
    async (route) => {
      const response = await route.fetch();

      if (response.status() !== 201) {
        throw new Error(`Expected HTTP 201, got ${response.status()}.`);
      }

      await route.abort('failed');
    },
    { times: 1 },
  );

  await page
    .getByRole('textbox', {
      name: 'Nome completo do paciente',
    })
    .fill(patientName);

  const submitButton = page.getByRole('button', {
    name: 'Confirmar agendamento',
  });

  await submitButton.click();

  await expect(page.getByRole('alert')).toContainText('Não foi possível confirmar o resultado');

  // A gravação aconteceu apesar da resposta perdida.
  const firstResult = await database.query<{
    id: number;
  }>(
    `SELECT id
     FROM appointments
     WHERE patient_name = $1`,
    [patientName],
  );

  expect(firstResult.rows).toHaveLength(1);

  const originalId = firstResult.rows[0].id;

  // Segunda tentativa: deve retornar o registro original.
  await submitButton.click();

  await expect(
    page.getByRole('heading', {
      name: 'Agendamento confirmado!',
    }),
  ).toBeVisible();

  const finalResult = await database.query<{
    id: number;
  }>(
    `SELECT id
     FROM appointments
     WHERE patient_name = $1`,
    [patientName],
  );

  expect(finalResult.rows).toHaveLength(1);
  expect(finalResult.rows[0].id).toBe(originalId);

  expect(submittedKeys).toHaveLength(2);
  expect(submittedKeys[0]).toBeTruthy();
  expect(submittedKeys[1]).toBe(submittedKeys[0]);
});
