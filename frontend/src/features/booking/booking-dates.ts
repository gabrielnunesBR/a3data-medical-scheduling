import { TZDate } from 'react-day-picker';

export const CLINIC_TIME_ZONE = 'America/Sao_Paulo';

export function todayInClinic(): Date {
  return TZDate.tz(CLINIC_TIME_ZONE);
}

export function toClinicDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value;

  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function fromClinicDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);

  return new TZDate(year, month - 1, day, CLINIC_TIME_ZONE);
}

export function formatClinicDate(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: CLINIC_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function toAppointmentStartAt(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new RangeError('Invalid appointment date or time.');
  }

  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  const start = new TZDate(year, month - 1, day, hours, minutes, 0, 0, CLINIC_TIME_ZONE);

  if (
    Number.isNaN(start.getTime()) ||
    toClinicDate(start) !== date ||
    start.getHours() !== hours ||
    start.getMinutes() !== minutes
  ) {
    throw new RangeError('Invalid appointment date or time.');
  }

  return new Date(start.getTime()).toISOString();
}
