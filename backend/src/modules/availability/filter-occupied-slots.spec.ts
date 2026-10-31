import { describe, expect, it } from 'vitest';

import { filterOccupiedSlots } from './filter-occupied-slots.js';

describe('filterOccupiedSlots', () => {
  const slots = ['08:00', '08:40', '09:20', '10:00', '10:40', '11:20'];

  it('should return all slots when there are no appointments', () => {
    const result = filterOccupiedSlots(slots, 40, []);

    expect(result).toEqual(slots);
  });

  it('should remove a fully occupied slot', () => {
    const result = filterOccupiedSlots(slots, 40, [{ startTime: '09:20', endTime: '10:00' }]);

    expect(result).toEqual(['08:00', '08:40', '10:00', '10:40', '11:20']);
  });

  it('should remove slots with partial overlaps', () => {
    const result = filterOccupiedSlots(['09:00', '09:30', '10:00'], 30, [
      { startTime: '09:20', endTime: '10:00' },
    ]);

    expect(result).toEqual(['10:00']);
  });

  it('should allow a slot ending exactly when an appointment starts', () => {
    const result = filterOccupiedSlots(['08:40'], 40, [{ startTime: '09:20', endTime: '10:00' }]);

    expect(result).toEqual(['08:40']);
  });

  it('should allow a slot starting exactly when an appointment ends', () => {
    const result = filterOccupiedSlots(['10:00'], 40, [{ startTime: '09:20', endTime: '10:00' }]);

    expect(result).toEqual(['10:00']);
  });

  it('should reject a slot containing an occupied interval', () => {
    const result = filterOccupiedSlots(['09:00'], 40, [{ startTime: '09:10', endTime: '09:20' }]);

    expect(result).toEqual([]);
  });

  it('should handle multiple appointments', () => {
    const result = filterOccupiedSlots(slots, 40, [
      { startTime: '08:00', endTime: '08:30' },
      { startTime: '10:00', endTime: '10:40' },
    ]);

    expect(result).toEqual(['08:40', '09:20', '10:40', '11:20']);
  });

  it('should support 20-minute appointments', () => {
    const result = filterOccupiedSlots(['08:00', '08:20', '08:40'], 20, [
      { startTime: '08:20', endTime: '08:40' },
    ]);

    expect(result).toEqual(['08:00', '08:40']);
  });

  it('should accept PostgreSQL TIME values', () => {
    const result = filterOccupiedSlots(['08:00', '08:40'], 40, [
      { startTime: '08:00:00', endTime: '08:40:00' },
    ]);

    expect(result).toEqual(['08:40']);
  });

  it('should not mutate the original slots', () => {
    const original = [...slots];

    filterOccupiedSlots(slots, 40, [{ startTime: '09:20', endTime: '10:00' }]);

    expect(slots).toEqual(original);
  });

  it('should reject invalid durations', () => {
    expect(() => filterOccupiedSlots(slots, 0, [])).toThrow(RangeError);

    expect(() => filterOccupiedSlots(slots, -20, [])).toThrow(RangeError);
  });

  it('should reject invalid occupied intervals', () => {
    expect(() =>
      filterOccupiedSlots(slots, 40, [{ startTime: '10:00', endTime: '09:00' }]),
    ).toThrow(RangeError);

    expect(() =>
      filterOccupiedSlots(slots, 40, [{ startTime: '09:00', endTime: '09:00' }]),
    ).toThrow(RangeError);
  });
});
