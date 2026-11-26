import { expect, test } from 'vitest';

import en from './en.json';
import fr from './fr.json';

/** Each translation by its full key (`job-offers.list.title`). */
function byKey(translations: object, prefix = ''): Map<string, string> {
  return new Map(
    Object.entries(translations).flatMap(([key, value]) =>
      typeof value === 'string'
        ? [[`${prefix}${key}`, value]]
        : [...byKey(value, `${prefix}${key}.`)],
    ),
  );
}

function placeholdersOf(text: string | undefined) {
  return [...(text ?? '').matchAll(/{{(\w+)}}/g)].map(([, name]) => name).toSorted();
}

const english = byKey(en);
const french = byKey(fr);

// The type check (`fr satisfies typeof en`) only catches a key missing from French.
test('French has exactly the English keys', () => {
  expect([...french.keys()].toSorted()).toEqual([...english.keys()].toSorted());
});

test('each French text keeps the placeholders of its English one', () => {
  for (const [key, text] of english) {
    expect({ key, placeholders: placeholdersOf(french.get(key)) }).toEqual({
      key,
      placeholders: placeholdersOf(text),
    });
  }
});
