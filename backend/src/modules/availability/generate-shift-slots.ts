import { minutesToTime, timeToMinutes } from './time.utils.js';

export function generateShiftSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number,
): string[] {
  if (!Number.isSafeInteger(durationMinutes) || durationMinutes <= 0) {
    throw new RangeError('Exam duration must be a positive integer.');
  }

  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start >= end) {
    throw new RangeError('Shift start must be before shift end.');
  }

  const slots: string[] = [];

  for (let current = start; current + durationMinutes <= end; current += durationMinutes) {
    slots.push(minutesToTime(current));
  }

  return slots;
}
