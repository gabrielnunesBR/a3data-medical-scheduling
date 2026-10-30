const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::00)?$/;

function timeToMinutes(time: string): number {
  const match = TIME_PATTERN.exec(time);

  if (!match) {
    throw new RangeError(`Invalid time format: ${time}`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

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

  for (
    let current = start;
    current + durationMinutes <= end;
    current += durationMinutes
  ) {
    slots.push(minutesToTime(current));
  }

  return slots;
}
