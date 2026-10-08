import { defineConfig } from '@playwright/test';

// Optional verification of the rebuilt local Docker bundle; API calls remain mocked.
const localBuilt = process.env.E2E_LOCAL_BUILT === '1';

// Isolated UI regressions: no backend, real accounts, email or production writes.
export default defineConfig({
  testDir: './e2e-self-service',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: localBuilt ? 'http://127.0.0.1:5173' : 'http://127.0.0.1:4177',
    channel: process.env.E2E_BROWSER_CHANNEL || undefined,
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
  },
  webServer: localBuilt ? undefined : {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4177 --strictPort',
    url: 'http://127.0.0.1:4177',
    reuseExistingServer: false,
    env: { VITE_API_URL: '/api/v1', VITE_SENTRY_DSN: '' },
  },
});
