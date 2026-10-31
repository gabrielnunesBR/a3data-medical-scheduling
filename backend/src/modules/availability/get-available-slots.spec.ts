import { describe, expect, it } from 'vitest';

import { getAvailableSlots, type WeeklyShift } from './get-available-slots.js';

describe('getAvailableSlots', () => {
  const monday = '2026-11-02';

  const beforeMonday = new Date('2026-11-01T12:00:00-03:00');

  const shifts: WeeklyShift[] = [
    {
      weekday: 1,
      startTime: '08:00',
      endTime: '12:00',
    },
    {
      weekday: 1,
      startTime: '14:00',
      endTime: '18:00',
    },
    {
      weekday: 2,
      startTime: '07:00',
      endTime: '13:00',
    },
  ];

  it('should combine shifts from the selected weekday', () => {
    const result = getAvailableSlots({
      date: monday,
      durationMinutes: 40,
      shifts,
      occupiedIntervals: [],
      now: beforeMonday,
    });

    expect(result).toHaveLength(12);

    expect(result).toContain('08:00');
    expect(result).toContain('11:20');
    expect(result).toContain('14:00');
    expect(result).toContain('17:20');

    expect(result).not.toContain('07:00');
    expect(result).not.toContain('12:00');
  });

  it('should return no slots on a day without shifts', () => {
    const result = getAvailableSlots({
      date: '2026-11-01',
      durationMinutes: 40,
      shifts,
      occupiedIntervals: [],
      now: new Date('2026-10-30T10:00:00-03:00'),
    });

    expect(result).toEqual([]);
  });

  it('should remove occupied slots', () => {
    const result = getAvailableSlots({
      date: monday,
      durationMinutes: 40,
      shifts,
      occupiedIntervals: [
        {
          startTime: '09:20',
          endTime: '10:00',
        },
      ],
      now: beforeMonday,
    });

    expect(result).not.toContain('09:20');
    expect(result).toContain('10:00');
  });

  it('should remove partially overlapping slots', () => {
    const result = getAvailableSlots({
      date: monday,
      durationMinutes: 40,
      shifts,
      occupiedIntervals: [
        {
          startTime: '09:10',
          endTime: '09:50',
        },
      ],
      now: beforeMonday,
    });

    expect(result).not.toContain('08:40');
    expect(result).not.toContain('09:20');
    expect(result).toContain('10:00');
  });

  it('should remove past slots on the current date', () => {
    const result = getAvailableSlots({
      date: monday,
      durationMinutes: 40,
      shifts,
      occupiedIntervals: [],
      now: new Date('2026-11-02T10:00:00-03:00'),
    });

    expect(result).toEqual([
      '10:00',
      '10:40',
      '11:20',
      '14:00',
      '14:40',
      '15:20',
      '16:00',
      '16:40',
      '17:20',
    ]);
  });

  it('should return no slots for past dates', () => {
    const result = getAvailableSlots({
      date: monday,
      durationMinutes: 40,
      shifts,
      occupiedIntervals: [],
      now: new Date('2026-11-03T10:00:00-03:00'),
    });

    expect(result).toEqual([]);
  });

  it('should respect the clinic time zone', () => {
    const result = getAvailableSlots({
      date: monday,
      durationMinutes: 40,
      shifts,
      occupiedIntervals: [],
      now: new Date('2026-11-02T13:00:00Z'),
    });

    expect(result[0]).toBe('10:00');
  });

  it('should support Saturday shifts', () => {
    const result = getAvailableSlots({
      date: '2026-11-07',
      durationMinutes: 30,
      shifts: [
        {
          weekday: 6,
          startTime: '08:00:00',
          endTime: '12:00:00',
        },
      ],
      occupiedIntervals: [],
      now: beforeMonday,
    });

    expect(result).toHaveLength(8);
    expect(result[0]).toBe('08:00');
    expect(result[7]).toBe('11:30');
  });

  it('should not duplicate slots', () => {
    const result = getAvailableSlots({
      date: monday,
      durationMinutes: 40,
      shifts: [shifts[0], shifts[0]],
      occupiedIntervals: [],
      now: beforeMonday,
    });

    expect(result).toHaveLength(6);
  });

  it.each(['2026-02-30', '2026-11-2', 'invalid'])('should reject invalid date %s', (date) => {
    expect(() =>
      getAvailableSlots({
        date,
        durationMinutes: 40,
        shifts,
        occupiedIntervals: [],
        now: beforeMonday,
      }),
    ).toThrow(RangeError);
  });

  it('should reject invalid durations', () => {
    expect(() =>
      getAvailableSlots({
        date: monday,
        durationMinutes: 0,
        shifts,
        occupiedIntervals: [],
        now: beforeMonday,
      }),
    ).toThrow(RangeError);
  });
});
