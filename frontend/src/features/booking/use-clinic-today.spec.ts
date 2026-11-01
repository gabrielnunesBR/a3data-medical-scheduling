import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useClinicToday } from './use-clinic-today';

describe('useClinicToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 23:59:58 on Jan 6 in America/Sao_Paulo (UTC-03:00).
    vi.setSystemTime(new Date('2030-01-07T02:59:58.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('advances the clinic date after midnight without requiring user interaction', () => {
    const { result, unmount } = renderHook(() => useClinicToday());

    expect(result.current).toBe('2030-01-06');

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(result.current).toBe('2030-01-07');
    unmount();
  });

  it('refreshes the clinic date when a suspended page receives focus', () => {
    const { result, unmount } = renderHook(() => useClinicToday());

    act(() => {
      vi.setSystemTime(new Date('2030-01-08T12:00:00.000Z'));
      window.dispatchEvent(new Event('focus'));
    });

    expect(result.current).toBe('2030-01-08');
    unmount();
  });
});
