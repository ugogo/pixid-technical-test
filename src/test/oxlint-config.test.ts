import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';
import { z } from 'zod';

const restrictedImports = z.object({
  'no-restricted-imports': z.tuple([z.literal('error'), z.object({ paths: z.array(z.unknown()) })]),
});
const oxlintConfigSchema = z.object({
  rules: restrictedImports,
  overrides: z.array(z.object({ rules: restrictedImports })),
});

// An override's options replace the base ones, so each layer repeats the useEffect ban.
test('every layer of the lint config keeps the same useEffect ban', () => {
  const { rules, overrides } = oxlintConfigSchema.parse(
    JSON.parse(readFileSync('.oxlintrc.json', 'utf8')),
  );
  const [, { paths: basePaths }] = rules['no-restricted-imports'];

  for (const override of overrides) {
    const [, { paths }] = override.rules['no-restricted-imports'];

    expect(paths).toEqual(basePaths);
  }
});
