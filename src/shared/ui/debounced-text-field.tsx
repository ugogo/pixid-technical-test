import { TextField, type TextFieldProps } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

const DEBOUNCE_DELAY = 300;

type DebouncedTextFieldProps = Omit<TextFieldProps, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
};

/**
 * A text field that reports its value once the user pauses typing, or leaves the field (to click
 * "Clear filters", say, which a report landing after it must not undo).
 */
export function DebouncedTextField({ value, onChange, onBlur, ...props }: DebouncedTextFieldProps) {
  // What the user typed and the parent has not received yet; otherwise the parent's value shows.
  const [draft, setDraft] = useState<string>();
  const [shownValue, setShownValue] = useState(value);
  const pendingReport = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latestValue = useRef(value);

  // A new value from the parent (a report landing, a reset, Back) wins over the draft.
  if (value !== shownValue) {
    setShownValue(value);
    setDraft(undefined);
  }

  useEffect(() => {
    latestValue.current = value;
  });
  useEffect(() => () => clearTimeout(pendingReport.current), []);

  function report(typed: string) {
    clearTimeout(pendingReport.current);
    setDraft(undefined);
    if (typed !== latestValue.current) onChange(typed);
  }

  return (
    <TextField
      {...props}
      onBlur={(event) => {
        if (draft !== undefined) report(draft);
        onBlur?.(event);
      }}
      onChange={(event) => {
        const typed = event.target.value;
        const valueWhenTyped = value;

        setDraft(typed);
        clearTimeout(pendingReport.current);
        // Dropped if the parent's value changed meanwhile: its new value won over the draft.
        pendingReport.current = setTimeout(() => {
          if (latestValue.current === valueWhenTyped) report(typed);
        }, DEBOUNCE_DELAY);
      }}
      value={draft ?? value}
    />
  );
}
