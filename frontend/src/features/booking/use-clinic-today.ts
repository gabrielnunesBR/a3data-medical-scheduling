import { useEffect, useState } from 'react';
import { TZDate } from 'react-day-picker';

import { CLINIC_TIME_ZONE, toClinicDate, todayInClinic } from './booking-dates';

/** Keeps the clinic's current date in sync, including after a suspended tab resumes. */
export function useClinicToday(): string {
  const [today, setToday] = useState(() => toClinicDate(todayInClinic()));

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    function refreshClinicDate() {
      const now = todayInClinic();
      const currentDay = toClinicDate(now);

      setToday((previous) => (previous === currentDay ? previous : currentDay));

      // Schedule against midnight in the clinic's timezone, not the browser's.
      const nextMidnight = new TZDate(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        0,
        CLINIC_TIME_ZONE,
      );
      const delay = Math.max(1, nextMidnight.getTime() - now.getTime() + 100);

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(refreshClinicDate, delay);
    }

    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') {
        refreshClinicDate();
      }
    }

    refreshClinicDate();
    window.addEventListener('focus', refreshClinicDate);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      window.removeEventListener('focus', refreshClinicDate);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  return today;
}
