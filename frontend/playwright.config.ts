import { fileURLToPath } from 'node:url';

import { defineConfig } from '@playwright/test';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',

  fullyParallel: false,
  workers: 1,
  retries: 0,

  timeout: 30_000,

  use: {
    baseURL: 'http://127.0.0.1:5174',
    browserName: 'chromium',

    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  webServer: [
    {
      name: 'Backend de testes',
      command: 'npm run dev:api',
      cwd: repositoryRoot,
      env: {
        NODE_ENV: 'test',
        PORT: '3100',
      },
      url: 'http://127.0.0.1:3100/api/doctors',
      reuseExistingServer: false,
      timeout: 120_000,
    },

    {
      name: 'Frontend de testes',
      command: 'npm run dev --workspace=frontend -- --host 127.0.0.1 --port 5174 --strictPort',
      cwd: repositoryRoot,
      env: {
        VITE_API_PROXY_TARGET: 'http://127.0.0.1:3100',
      },
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
