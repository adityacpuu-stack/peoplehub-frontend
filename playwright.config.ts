import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for PeopleHub smoke tests.
 *
 * Run locally:
 *   npx playwright install --with-deps chromium    (one-time)
 *   npm run dev                                     (in separate terminal)
 *   cd peoplehub-backend && npm run dev             (in separate terminal)
 *   npx playwright test
 *
 * Required env (.env.test or set inline):
 *   E2E_BASE_URL          — frontend URL, default http://localhost:5173
 *   E2E_API_URL           — backend URL, default http://localhost:3001
 *   E2E_SUPERADMIN_EMAIL  — known Super Admin login
 *   E2E_SUPERADMIN_PW
 *   E2E_HR_MANAGER_EMAIL  — known HR Manager login
 *   E2E_HR_MANAGER_PW
 *   E2E_GROUP_CEO_EMAIL   — known Group CEO login
 *   E2E_GROUP_CEO_PW
 *   E2E_EMPLOYEE_EMAIL    — known Employee login
 *   E2E_EMPLOYEE_PW
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // share login storage between tests
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
