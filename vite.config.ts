import { fileURLToPath } from 'node:url';

import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tanstackRouter({ autoCodeSplitting: true, target: 'react' }), react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    coverage: {
      exclude: ['src/routeTree.gen.ts', 'src/shared/api/schema.ts', 'src/test/**', 'src/main.tsx'],
      include: ['src/**/*.{ts,tsx}'],
      provider: 'v8',
      thresholds: { branches: 80, functions: 80, lines: 80, statements: 80 },
      reporter: ['text', 'html'],
    },
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
