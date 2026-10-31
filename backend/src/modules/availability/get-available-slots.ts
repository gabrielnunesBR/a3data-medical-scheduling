import { DateTime } from 'luxon';

import { CLINIC_TIME_ZONE } from './availability.constants.js';
import { filterOccupiedSlots, type OccupiedInterval } from './filter-occupied-slots.js';
import { generateShiftSlots } from './generate-shift-slots.js';

export type WeeklyShift = {
  weekday: number;
  startTime: string;
  endTime: string;
};

export type AvailabilityInput = {
  date: string;
  durationMinutes: number;
  shifts: readonly WeeklyShift[];
  occupiedIntervals: readonly OccupiedInterval[];
  now?: Date;
};

export function getAvailableSlots({
  date,
  durationMinutes,
  shifts,
  occupiedIntervals,
  now = new Date(),
}: AvailabilityInput): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new RangeError('Invalid date format. Expected YYYY-MM-DD.');
  }

  const selectedDate = DateTime.fromISO(date, {
    zone: CLINIC_TIME_ZONE,
  });

  if (!selectedDate.isValid) {
    throw new RangeError('Invalid date.');
  }

  if (!Number.isSafeInteger(durationMinutes) || durationMinutes <= 0) {
    throw new RangeError('Exam duration must be a positive integer.');
  }

  if (Number.isNaN(now.getTime())) {
    throw new RangeError('Invalid current date.');
  }

  const dayShifts = shifts.filter((shift) => shift.weekday === selectedDate.weekday);

  const candidateSlots = dayShifts.flatMap((shift) =>
    generateShiftSlots(shift.startTime, shift.endTime, durationMinutes),
  );

  const uniqueSlots = [...new Set(candidateSlots)];

  const unoccupiedSlots = filterOccupiedSlots(uniqueSlots, durationMinutes, occupiedIntervals);

  return unoccupiedSlots
    .filter((slot) => {
      const slotDateTime = DateTime.fromISO(`${date}T${slot}`, { zone: CLINIC_TIME_ZONE });

      return (
        slotDateTime.isValid &&
        slotDateTime.toFormat('HH:mm') === slot &&
        slotDateTime.toMillis() >= now.getTime()
      );
    })
    .sort();
}
