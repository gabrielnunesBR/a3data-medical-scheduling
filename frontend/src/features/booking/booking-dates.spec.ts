import { describe, expect, it } from 'vitest';

import {
  fromClinicDate,
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
});
