import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { useDebounce } from './use-debounce';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function renderDebounce(initialValue: string | undefined) {
  const onSettle = vi.fn<(value: string) => void>();
  const view = renderHook(({ value }) => useDebounce(value, 300, onSettle), {
    initialProps: { value: initialValue },
  });

  return { ...view, onSettle };
}

test('calls back with the value once it has stopped changing for the delay', () => {
  const { rerender, onSettle } = renderDebounce('a');

  act(() => vi.advanceTimersByTime(200));
  rerender({ value: 'ab' });
  act(() => vi.advanceTimersByTime(200));
  expect(onSettle).not.toHaveBeenCalled();

  act(() => vi.advanceTimersByTime(100));
  expect(onSettle).toHaveBeenCalledExactlyOnceWith('ab');
});

test('a change to undefined, or unmounting, cancels the pending call', () => {
  const { rerender, unmount, onSettle } = renderDebounce('a');

  rerender({ value: undefined });
  act(() => vi.advanceTimersByTime(300));
  rerender({ value: 'b' });
  unmount();
  act(() => vi.advanceTimersByTime(300));

  expect(onSettle).not.toHaveBeenCalled();
});

test('the same value, set again after undefined, calls back again', () => {
  const { rerender, onSettle } = renderDebounce('a');

  act(() => vi.advanceTimersByTime(300));
  rerender({ value: undefined });
  rerender({ value: 'a' });
  act(() => vi.advanceTimersByTime(300));

  expect(onSettle).toHaveBeenCalledTimes(2);
});
