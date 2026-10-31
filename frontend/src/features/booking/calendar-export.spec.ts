import { describe, expect, it } from 'vitest';

import type { Appointment } from './appointments.api';
import { buildGoogleCalendarUrl, buildICalendarFile } from './calendar-export';

const appointment: Appointment = {
  id: 123,
  patientName: 'Maria Oliveira',
  examId: 17,
  doctorId: 1,
  startAt: '2026-11-02T12:20:00.000Z',
  endAt: '2026-11-02T13:00:00.000Z',
  createdAt: '2026-10-31T12:00:00.000Z',
};

describe('Calendar export', () => {
  it('should prepare the Google Calendar event with UTC instants and the clinic time zone', () => {
    const url = new URL(buildGoogleCalendarUrl(appointment));

    expect(url.origin).toBe('https://calendar.google.com');
    expect(url.pathname).toBe('/calendar/r/eventedit');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('dates')).toBe('20261102T122000Z/20261102T130000Z');
    expect(url.searchParams.get('stz')).toBe('America/Sao_Paulo');
    expect(url.searchParams.get('etz')).toBe('America/Sao_Paulo');
    expect(url.searchParams.get('text')).toBe('Exame agendado');
  });

  it('should generate a valid single-event iCalendar file with stable identifiers', () => {
    const content = buildICalendarFile(appointment);

    expect(content).toContain('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n');
    expect(content).toContain('BEGIN:VEVENT\r\n');
    expect(content).toContain(
      'UID:appointment-123-20261031T120000Z@a3data-medical-scheduling.invalid',
    );
    expect(content).toContain('DTSTAMP:20261031T120000Z');
    expect(content).toContain('DTSTART:20261102T122000Z');
    expect(content).toContain('DTEND:20261102T130000Z');
    expect(content).toContain('SUMMARY:Exame agendado');
    expect(content).toContain('STATUS:CONFIRMED');
    expect(content).toContain('CLASS:PRIVATE');
    expect(content).toMatch(/END:VEVENT\r\nEND:VCALENDAR\r\n$/);
    expect(buildICalendarFile(appointment)).toBe(content);

    for (const line of content.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }

    expect(content.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('should use a generic description without exposing patient or exam details', () => {
    const googleUrl = buildGoogleCalendarUrl(appointment);
    const ics = buildICalendarFile(appointment);

    for (const value of [googleUrl, ics]) {
      expect(value).not.toContain('Maria Oliveira');
      expect(value).not.toContain('Ressonância magnética');
    }

    expect(ics).toContain('DESCRIPTION:Consulte os detalhes no comprovante do agendamento.');
  });

  it('should preserve UTC boundaries for a booking crossing midnight in Brasília', () => {
    const overnight = {
      ...appointment,
      startAt: '2026-11-03T02:40:00.000Z',
      endAt: '2026-11-03T03:20:00.000Z',
    };

    expect(new URL(buildGoogleCalendarUrl(overnight)).searchParams.get('dates')).toBe(
      '20261103T024000Z/20261103T032000Z',
    );
    expect(buildICalendarFile(overnight)).toContain('DTEND:20261103T032000Z');
  });

  it('should reject invalid or reversed intervals instead of exporting an incorrect event', () => {
    expect(() => buildICalendarFile({ ...appointment, endAt: '2026-11-02T12:20:00.000Z' })).toThrow(
      RangeError,
    );
    expect(() => buildGoogleCalendarUrl({ ...appointment, startAt: 'invalid' })).toThrow(
      RangeError,
    );
  });
});
