import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { DebouncedTextField } from './debounced-text-field';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function renderField(value: string, onChange = vi.fn<(value: string) => void>()) {
  const view = render(<DebouncedTextField label="Title" onChange={onChange} value={value} />);

  return { ...view, onChange, input: screen.getByRole('textbox', { name: 'Title' }) };
}

test('reports once the user pauses typing', () => {
  const { input, onChange } = renderField('');

  fireEvent.change(input, { target: { value: 'tech' } });
  act(() => vi.advanceTimersByTime(299));
  expect(onChange).not.toHaveBeenCalled();

  act(() => vi.advanceTimersByTime(1));
  expect(onChange).toHaveBeenCalledExactlyOnceWith('tech');
});

test('a reset from the parent drops the pending draft', () => {
  const { input, onChange, rerender } = renderField('foo');

  fireEvent.change(input, { target: { value: 'foob' } });
  rerender(<DebouncedTextField label="Title" onChange={onChange} value="" />);
  act(() => vi.advanceTimersByTime(300));

  expect(input).toHaveValue('');
  expect(onChange).not.toHaveBeenCalled();
});

test('typing back to the current value reports nothing', () => {
  const { input, onChange } = renderField('foo');

  fireEvent.change(input, { target: { value: 'fo' } });
  fireEvent.change(input, { target: { value: 'foo' } });
  act(() => vi.advanceTimersByTime(300));

  expect(onChange).not.toHaveBeenCalled();
});

test('leaving the field reports what was typed at once, and only once', () => {
  const { input, onChange } = renderField('');

  fireEvent.change(input, { target: { value: 'tech' } });
  fireEvent.blur(input);
  expect(onChange).toHaveBeenCalledExactlyOnceWith('tech');

  act(() => vi.advanceTimersByTime(300));
  expect(onChange).toHaveBeenCalledOnce();
});

test('typing again the value a reset removed reports it', () => {
  const { input, onChange, rerender } = renderField('tech');

  rerender(<DebouncedTextField label="Title" onChange={onChange} value="" />);
  fireEvent.change(input, { target: { value: 'tech' } });
  act(() => vi.advanceTimersByTime(300));

  expect(onChange).toHaveBeenCalledExactlyOnceWith('tech');
});
