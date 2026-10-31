import { expect, test, type Page } from '@playwright/test';
import { TZDate } from 'react-day-picker';

import {
  CLINIC_TIME_ZONE,
  toClinicDate,
} from '../src/features/booking/booking-dates.js';

type Exam = {
  id: number;
  name: string;
  durationMinutes: number;
};

type Doctor = {
  id: number;
  name: string;
  crm: string;
};

function getFutureMonday(): string {
  const date = TZDate.tz(CLINIC_TIME_ZONE);

  date.setDate(date.getDate() + 15);

  const daysUntilMonday = (8 - date.getDay()) % 7;

  date.setDate(date.getDate() + daysUntilMonday);

  return toClinicDate(date);
}

async function selectCalendarDate(
  page: Page,
  date: string,
): Promise<void> {
  const day = page.locator(
    `.booking-calendar .rdp-day[data-day="${date}"]` +
      ':not(.rdp-outside) .rdp-day_button',
  );

  for (let attempt = 0; attempt < 4; attempt++) {
    if (await day.isVisible()) {
      await day.click();
      return;
    }

    await page
      .locator('.booking-calendar .rdp-button_next')
      .click();
  }

  throw new Error(`Could not select calendar date: ${date}`);
}

test('patient can select exam, doctor, date and time', async ({
  page,
  request,
}) => {
  const examsResponse = await request.get('/api/exams');
  const doctorsResponse = await request.get('/api/doctors');

  expect(examsResponse.ok()).toBeTruthy();
  expect(doctorsResponse.ok()).toBeTruthy();

  const exams = (await examsResponse.json()) as Exam[];
  const doctors = (await doctorsResponse.json()) as Doctor[];

  const exam = exams.find((item) => item.id === 17);

  const doctor = doctors.find(
    (item) => item.crm === 'CRM-MG 11111',
  );

  if (!exam || !doctor) {
    throw new Error(
      'Exam and doctor seeds must exist in the test database.',
    );
  }

  expect(exam.durationMinutes).toBe(40);

  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: 'Agende seu exame com facilidade',
    }),
  ).toBeVisible();

  const examButton = page
    .getByRole('button')
    .filter({ hasText: exam.name })
    .first();

  await examButton.click();

  const summary = page.getByRole('complementary', {
    name: 'Seu agendamento',
  });

  await expect(summary).toContainText(exam.name);

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

  await expect(summary).toContainText(doctor.name);

  const date = getFutureMonday();

  await selectCalendarDate(page, date);

  await expect(
    page.getByRole('button', {
      name: 'Selecionar horário 08:00',
    }),
  ).toBeVisible();

  await page
    .getByRole('button', {
      name: 'Selecionar horário 08:00',
    })
    .click();

  await expect(summary).toContainText('08:00');

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

  await expect(
    page.getByRole('textbox', {
      name: 'Nome completo do paciente',
    }),
  ).toBeVisible();

  await expect(
    page.getByRole('heading', {
      name: 'Resumo do atendimento',
    }),
  ).toBeVisible();

  await expect(
    page.getByRole('complementary', {
      name: 'Seu agendamento',
    }),
  ).toHaveCount(0);
});
