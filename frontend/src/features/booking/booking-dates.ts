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

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value;

  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function fromClinicDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);

  return new TZDate(
    year,
    month - 1,
    day,
    CLINIC_TIME_ZONE,
  );
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
