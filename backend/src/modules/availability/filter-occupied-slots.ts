import { timeToMinutes } from './time.utils.js';

export type OccupiedInterval = {
  startTime: string;
  endTime: string;
};

export function filterOccupiedSlots(
  slots: readonly string[],
  durationMinutes: number,
  occupiedIntervals: readonly OccupiedInterval[],
): string[] {
  if (!Number.isSafeInteger(durationMinutes) || durationMinutes <= 0) {
    throw new RangeError('Exam duration must be a positive integer.');
  }

  const occupied = occupiedIntervals.map((interval) => {
    const start = timeToMinutes(interval.startTime);
    const end = timeToMinutes(interval.endTime);

    if (start >= end) {
      throw new RangeError('Occupied interval start must be before end.');
    }

    return { start, end };
  });

  return slots.filter((slot) => {
    const start = timeToMinutes(slot);
    const end = start + durationMinutes;

    const hasConflict = occupied.some((interval) => start < interval.end && end > interval.start);

    return !hasConflict;
  });
}
