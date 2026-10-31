import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import AxeBuilder from '@axe-core/playwright';
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

type BookingStep = 'exam' | 'schedule' | 'confirmation';

const RESPONSIVE_WIDTHS = [320, 375, 768, 1280] as const;

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

async function goToConfirmation(
  page: Page,
  fixture: BookingFixture,
  onStep?: (step: BookingStep) => Promise<void>,
): Promise<void> {
  const { exam, doctor, date, time } = fixture;

  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: 'Qual exame você deseja agendar?',
    }),
  ).toBeVisible();

  await onStep?.('exam');

  await page.getByRole('button').filter({ hasText: exam.name }).first().click();

  await page
    .getByRole('button', {
      name: 'Escolher médico e horário',
    })
    .click();

  await expect(
    page.getByRole('heading', {
      name: 'Escolha o médico, a data e o horário',
    }),
  ).toBeVisible();

  await onStep?.('schedule');

  await page.getByRole('combobox', { name: 'Profissional' }).selectOption(String(doctor.id));

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

  await onStep?.('confirmation');
}

async function expectNoHorizontalOverflowAtWidths(page: Page, step: string): Promise<void> {
  for (const width of RESPONSIVE_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });

    await page.evaluate('document.fonts.ready');

    const dimensions = await page.evaluate<{
      viewport: number;
      document: number;
      body: number;
    }>(`({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    })`);

    expect(
      Math.max(dimensions.document, dimensions.body),
      `${step} at ${width}px: ${JSON.stringify(dimensions)}`,
    ).toBeLessThanOrEqual(dimensions.viewport + 1);
  }
}

async function expectAccessiblePage(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
}

test('keeps exam, schedule and review responsive across viewports', async ({ page, request }) => {
  const fixture = await getBookingFixture(request);

  await goToConfirmation(page, fixture, async (step) => {
    await expectNoHorizontalOverflowAtWidths(page, step);
  });
});

test('creates an appointment and persists it in PostgreSQL', async ({ page, request }) => {
  const fixture = await getBookingFixture(request);
  const patientName = newTestPatient();

  await goToConfirmation(page, fixture);
  await expectAccessiblePage(page);

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

  await expect(
    page.getByRole('heading', {
      name: 'Agendamento confirmado!',
    }),
  ).toBeFocused();

  await expect(page.getByText(patientName)).toBeVisible();
  await expectAccessiblePage(page);
  await expectNoHorizontalOverflowAtWidths(page, 'success');

  await page.emulateMedia({ media: 'print' });
  await expect(page.getByText('Comprovante de agendamento')).toBeVisible();
  await expect(page.locator('.booking-receipt')).toBeVisible();
  await expect(page.locator('.booking-receipt-print-summary')).toBeVisible();
  await expect(page.locator('.booking-receipt-print-footer')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Imprimir comprovante' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Copiar número' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Baixar arquivo .ics' })).toBeHidden();
  await page.emulateMedia({ media: 'screen' });

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

  const googleCalendar = page.getByRole('link', { name: /Google Calendar/ });
  const googleUrl = new URL((await googleCalendar.getAttribute('href')) ?? '');
  const toUtcCalendarTime = (value: Date) =>
    value
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
  const expectedDates = `${toUtcCalendarTime(new Date(startAt))}/${toUtcCalendarTime(endAt)}`;

  expect(googleUrl.origin).toBe('https://calendar.google.com');
  expect(googleUrl.searchParams.get('dates')).toBe(expectedDates);
  expect(googleUrl.searchParams.get('stz')).toBe(CLINIC_TIME_ZONE);
  expect(googleUrl.searchParams.get('etz')).toBe(CLINIC_TIME_ZONE);
  expect(googleUrl.searchParams.get('text')).toBe('Exame agendado');
  await expect(googleCalendar).toHaveAttribute('target', '_blank');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar arquivo .ics' }).click();
  const download = await downloadPromise;
  const icsContent = await readFile(await download.path(), 'utf8');

  expect(download.suggestedFilename()).toBe(`agendamento-${appointmentId}.ics`);
  expect(icsContent).toContain(`DTSTART:${toUtcCalendarTime(new Date(startAt))}`);
  expect(icsContent).toContain(`DTEND:${toUtcCalendarTime(endAt)}`);
  expect(icsContent).toContain('CLASS:PRIVATE');
  expect(icsContent).not.toContain(patientName);
  expect(icsContent).not.toContain(fixture.exam.name);

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

  // Another request books the slot after the patient reaches the confirmation step.
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
    page.getByRole('heading', {
      name: 'Escolha o médico, a data e o horário',
    }),
  ).toBeFocused();

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
  let firstResponseLost = false;

  await goToConfirmation(page, fixture);

  await page.route('**/api/appointments', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    submittedKeys.push(route.request().headers()['idempotency-key'] ?? '');

    if (!firstResponseLost) {
      firstResponseLost = true;

      // Persist the booking in the backend, but simulate a lost response.
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      await route.abort('failed');
      return;
    }

    await route.continue();
  });

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

  await expect(page.getByRole('alert')).toBeVisible();

  const initiallySaved = await database.query<{ id: number }>(
    `SELECT id FROM appointments WHERE patient_name = $1`,
    [patientName],
  );

  expect(initiallySaved.rows).toHaveLength(1);
  const originalId = initiallySaved.rows[0].id;

  // The user manually retries the same operation.
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

  const confirmationText = await page.getByText(/^#\d+$/).innerText();
  expect(Number(confirmationText.slice(1))).toBe(originalId);

  expect(submittedKeys).toHaveLength(2);
  expect(submittedKeys[0]).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
  expect(submittedKeys[1]).toBe(submittedKeys[0]);

  const finallySaved = await database.query<{ id: number }>(
    `SELECT id FROM appointments WHERE patient_name = $1`,
    [patientName],
  );

  expect(finallySaved.rows).toEqual([{ id: originalId }]);
});

test('keeps focus on active steps and supports keyboard navigation', async ({ page, request }) => {
  const fixture = await getBookingFixture(request);

  await goToConfirmation(page, fixture, async (step) => {
    if (step === 'schedule') {
      await expect(
        page.getByRole('heading', {
          name: 'Escolha o médico, a data e o horário',
        }),
      ).toBeFocused();
    }

    if (step === 'confirmation') {
      await expect(
        page.getByRole('heading', {
          name: 'Revise e confirme seu agendamento',
        }),
      ).toBeFocused();
    }
  });

  const patientName = page.getByRole('textbox', {
    name: 'Nome completo do paciente',
  });

  // The first Tab moves focus from the heading to the patient name field.
  await page.keyboard.press('Tab');

  await expect(patientName).toBeFocused();

  // Enter the patient name using only the keyboard.
  await page.keyboard.type('Paciente Teste Teclado');

  await expect(patientName).toHaveValue('Paciente Teste Teclado');

  // The next Tab moves focus to the Back button.
  await page.keyboard.press('Tab');

  await expect(
    page.getByRole('button', {
      name: 'Voltar',
      exact: true,
    }),
  ).toBeFocused();

  // The following Tab moves focus to the confirmation button.
  await page.keyboard.press('Tab');

  await expect(
    page.getByRole('button', {
      name: 'Confirmar agendamento',
    }),
  ).toBeFocused();
});
