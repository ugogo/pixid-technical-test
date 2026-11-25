import { TextField, type TextFieldProps } from '@mui/material';
import { useEffect, useEffectEvent, useState } from 'react';

const DEBOUNCE_DELAY = 300;

type DebouncedTextFieldProps = Omit<TextFieldProps, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
};

/** A text field that reports its value once the user pauses typing. */
export function DebouncedTextField({ value, onChange, ...props }: DebouncedTextFieldProps) {
  // What the user typed and the parent has not received yet; otherwise the parent's value shows.
  const [draft, setDraft] = useState<string>();
  const [shownValue, setShownValue] = useState(value);
  const report = useEffectEvent(onChange);

  // A new value from the parent (a report landing, a reset) wins over the draft.
  if (value !== shownValue) {
    setShownValue(value);
    setDraft(undefined);
  } else if (draft === value) {
    setDraft(undefined);
  }

  useEffect(() => {
    if (draft === undefined) return;

    const timeout = setTimeout(() => report(draft), DEBOUNCE_DELAY);

    return () => clearTimeout(timeout);
  }, [draft]);

  return (
    <TextField
      {...props}
      onChange={(event) => setDraft(event.target.value)}
      value={draft ?? value}
    />
  );
}
