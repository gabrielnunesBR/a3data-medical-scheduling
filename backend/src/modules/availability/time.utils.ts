const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::00)?$/;

export function timeToMinutes(time: string): number {
  const match = TIME_PATTERN.exec(time);

  if (!match) {
    throw new RangeError(`Invalid time format: ${time}`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
