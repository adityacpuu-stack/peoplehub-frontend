import { Page, expect } from '@playwright/test';

interface Credentials {
  email: string;
  password: string;
}

/**
 * Log in via the UI. Returns once dashboard is visible.
 *
 * Use this in test setup. Reuse Storage State for performance (see playwright.config).
 */
export async function login(page: Page, creds: Credentials) {
  await page.goto('/login');
  await page.fill('input[type=email], input[name=email]', creds.email);
  await page.fill('input[type=password], input[name=password]', creds.password);
  await page.click('button[type=submit]');

  // Wait for redirect to authenticated page
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10_000 });
}

export async function loginViaApi(page: Page, creds: Credentials): Promise<string> {
  const apiUrl = process.env.E2E_API_URL || 'http://localhost:3001';
  const response = await page.request.post(`${apiUrl}/api/v1/auth/login`, {
    data: creds,
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  const token = body.token as string;
  expect(token).toBeTruthy();

  // Seed token into localStorage so frontend bootstraps as authenticated
  await page.goto('/');
  await page.evaluate((t) => localStorage.setItem('token', t), token);
  return token;
}

export const creds = {
  superAdmin: {
    email: process.env.E2E_SUPERADMIN_EMAIL || 'superadmin@example.com',
    password: process.env.E2E_SUPERADMIN_PW || 'changeme',
  },
  hrManager: {
    email: process.env.E2E_HR_MANAGER_EMAIL || 'hr-manager@example.com',
    password: process.env.E2E_HR_MANAGER_PW || 'changeme',
  },
  groupCEO: {
    email: process.env.E2E_GROUP_CEO_EMAIL || 'group-ceo@example.com',
    password: process.env.E2E_GROUP_CEO_PW || 'changeme',
  },
  employee: {
    email: process.env.E2E_EMPLOYEE_EMAIL || 'employee@example.com',
    password: process.env.E2E_EMPLOYEE_PW || 'changeme',
  },
};
