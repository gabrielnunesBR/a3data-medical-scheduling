import { describe, expect, it } from 'vitest';

import { generateShiftSlots } from './generate-shift-slots.js';

describe('generateShiftSlots', () => {
  it('should generate 20-minute slots', () => {
    const slots = generateShiftSlots('08:00', '12:00', 20);

    expect(slots).toHaveLength(12);
    expect(slots[0]).toBe('08:00');
    expect(slots[11]).toBe('11:40');
  });

  it('should generate 30-minute slots', () => {
    const slots = generateShiftSlots('08:00', '12:00', 30);

    expect(slots).toHaveLength(8);
    expect(slots[0]).toBe('08:00');
    expect(slots[7]).toBe('11:30');
  });

  it('should generate 40-minute slots', () => {
    const slots = generateShiftSlots('08:00', '12:00', 40);

    expect(slots).toEqual([
      '08:00',
      '08:40',
      '09:20',
      '10:00',
      '10:40',
      '11:20',
    ]);
  });

  it('should exclude slots that exceed shift end', () => {
    const slots = generateShiftSlots('08:00', '09:15', 40);

    expect(slots).toEqual(['08:00']);
  });

  it('should return no slots when the exam is longer than the shift', () => {
    const slots = generateShiftSlots('08:00', '08:15', 20);

    expect(slots).toEqual([]);
  });

  it('should support night shifts', () => {
    const slots = generateShiftSlots('19:00', '22:00', 40);

    expect(slots).toEqual([
      '19:00',
      '19:40',
      '20:20',
      '21:00',
    ]);
  });

  it('should accept PostgreSQL TIME values', () => {
    const slots = generateShiftSlots('08:00:00', '12:00:00', 40);

    expect(slots).toHaveLength(6);
    expect(slots[5]).toBe('11:20');
  });

  it.each([0, -20, 20.5])(
    'should reject invalid duration %s',
    (duration) => {
      expect(() =>
        generateShiftSlots('08:00', '12:00', duration),
      ).toThrow(RangeError);
    },
  );

  it('should reject invalid shift intervals', () => {
    expect(() =>
      generateShiftSlots('12:00', '08:00', 20),
    ).toThrow(RangeError);

    expect(() =>
      generateShiftSlots('08:00', '08:00', 20),
    ).toThrow(RangeError);
  });

  it('should reject invalid time formats', () => {
    expect(() =>
      generateShiftSlots('25:00', '12:00', 20),
    ).toThrow(RangeError);

    expect(() =>
      generateShiftSlots('08:00:30', '12:00', 20),
    ).toThrow(RangeError);
  });
});
