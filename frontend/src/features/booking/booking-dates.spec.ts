import { describe, expect, it } from 'vitest';

import {
  fromClinicDate,
  toAppointmentStartAt,
  toClinicDate,
} from './booking-dates';

describe('Clinic dates', () => {
  it('should interpret an instant using the clinic time zone', () => {
    const date = new Date('2030-01-07T01:00:00Z');

    expect(toClinicDate(date)).toBe('2030-01-06');
  });

  it('should preserve a selected calendar date', () => {
    const date = fromClinicDate('2030-01-07');

    expect(toClinicDate(date)).toBe('2030-01-07');
  });

  it('should convert clinic time to the correct UTC instant', () => {
    expect(
      toAppointmentStartAt('2030-01-07', '09:20'),
    ).toBe('2030-01-07T12:20:00.000Z');
  });

  it('should reject malformed appointment times', () => {
    expect(() =>
      toAppointmentStartAt('2030-01-07', '25:20'),
    ).toThrow(RangeError);
  });

  it('should reject nonexistent calendar dates', () => {
    expect(() =>
      toAppointmentStartAt('2030-02-30', '09:20'),
    ).toThrow(RangeError);
  });
});
