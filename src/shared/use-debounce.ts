import { useEffect, useState } from 'react';

/** The value as it was once it stopped changing for `delay` milliseconds. */
export function useDebounce<Value>(value: Value, delay: number): Value {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}
