// oxlint-disable-next-line no-restricted-imports -- a timer is an outside system: an effect's job
import { useEffect, useEffectEvent } from 'react';

/**
 * Calls `onSettle` with `value` once it has stopped changing for `delay` milliseconds. Nothing is
 * pending while `value` is `undefined`: a change to `undefined`, or unmounting, cancels the call.
 */
export function useDebounce<Value>(
  value: Value | undefined,
  delay: number,
  onSettle: (value: Value) => void,
) {
  // Always the latest `onSettle`, without restarting the timer when it changes.
  const settle = useEffectEvent(onSettle);

  useEffect(() => {
    if (value === undefined) return;

    const pendingCall = setTimeout(() => settle(value), delay);

    return () => clearTimeout(pendingCall);
  }, [value, delay]);
}
