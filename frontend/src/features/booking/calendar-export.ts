import type { Appointment } from './appointments.api';
import { CLINIC_TIME_ZONE } from './booking-dates';

// Calendar entries intentionally omit the patient's name and exam type.
const EVENT_TITLE = 'Exame agendado';
const EVENT_DESCRIPTION = 'Consulte os detalhes no comprovante do agendamento.';

type CalendarAppointment = Pick<Appointment, 'id' | 'startAt' | 'endAt' | 'createdAt'>;

function formatUtcDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Invalid calendar event date.');
  }

  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function getEventTimes(appointment: CalendarAppointment): { start: string; end: string } {
  const start = new Date(appointment.startAt);
  const end = new Date(appointment.endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new RangeError('Invalid calendar event interval.');
  }

  return {
    start: formatUtcDateTime(appointment.startAt),
    end: formatUtcDateTime(appointment.endAt),
  };
}

function escapeICalendarText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

// RFC 5545 limits content lines to 75 UTF-8 octets, not 75 characters.
function foldICalendarLine(value: string): string {
  const encoder = new TextEncoder();
  let result = '';
  let lineBytes = 0;

  for (const character of value) {
    const characterBytes = encoder.encode(character).length;

    if (lineBytes + characterBytes > 75) {
      result += '\r\n ';
      lineBytes = 1;
    }

    result += character;
    lineBytes += characterBytes;
  }

  return result;
}

export function buildGoogleCalendarUrl(appointment: CalendarAppointment): string {
  const { start, end } = getEventTimes(appointment);
  const url = new URL('https://calendar.google.com/calendar/r/eventedit');

  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('dates', `${start}/${end}`);
  url.searchParams.set('stz', CLINIC_TIME_ZONE);
  url.searchParams.set('etz', CLINIC_TIME_ZONE);
  url.searchParams.set('text', EVENT_TITLE);
  url.searchParams.set('details', EVENT_DESCRIPTION);

  return url.toString();
}

export function buildICalendarFile(appointment: CalendarAppointment): string {
  const { start, end } = getEventTimes(appointment);
  const created = formatUtcDateTime(appointment.createdAt);
  const uid = `appointment-${appointment.id}-${created}@a3data-medical-scheduling.invalid`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//A3Data Medical Scheduling//Appointment Calendar//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${created}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICalendarText(EVENT_TITLE)}`,
    `DESCRIPTION:${escapeICalendarText(EVENT_DESCRIPTION)}`,
    'STATUS:CONFIRMED',
    'CLASS:PRIVATE',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `${lines.map(foldICalendarLine).join('\r\n')}\r\n`;
}
