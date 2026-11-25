import { TextField, type TextFieldProps } from '@mui/material';
// oxlint-disable-next-line no-restricted-imports -- a timer is an outside system: an effect's job
import { useEffect, useEffectEvent, useState } from 'react';

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

  // A new value from the parent (a report landing, a reset, Back) wins over the draft.
  if (value !== shownValue) {
    setShownValue(value);
    setDraft(undefined);
  }

  function report(typed: string) {
    setDraft(undefined);
    if (typed !== value) onChange(typed);
  }

  const reportSettledDraft = useEffectEvent(report);

  // Reports the draft once it stops changing. Dropping the draft (a report, a reset, leaving the
  // field) or unmounting clears the pending report.
  useEffect(() => {
    if (draft === undefined) return;

    const pendingReport = setTimeout(() => reportSettledDraft(draft), DEBOUNCE_DELAY);

    return () => clearTimeout(pendingReport);
  }, [draft]);

  return (
    <TextField
      {...props}
      onBlur={(event) => {
        if (draft !== undefined) report(draft);
        onBlur?.(event);
      }}
      onChange={(event) => setDraft(event.target.value)}
      value={draft ?? value}
    />
  );
}
