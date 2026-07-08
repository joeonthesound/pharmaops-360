import { test, expect } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const email = process.env.E2E_EMAIL ?? 'tu-usuario-test@pharmaops.com';
const password = process.env.E2E_PASSWORD ?? 'TuPasswordTest123';

async function expectPageLoaded(page: import('@playwright/test').Page) {
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).not.toBeEmpty();
  await expect(page.locator('h1, h2, table, main').first()).toBeVisible();
  await expect(page).not.toHaveURL(/404|not-found/i);
}

test('Flujo Crítico: Login, Dashboard y Carga de Activos', async ({ page }) => {
  await page.goto(`${baseURL}/login`);

  const loginForm = page.locator('form');
  await expect(loginForm).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /ingresar/i }).click();

  await page.waitForURL('**/dashboard', { timeout: 15_000 }).catch(async () => {
    const loginMessage = page.locator('form div').first();
    const message = (await loginMessage.textContent())?.trim() || 'Sin mensaje visible';

    throw new Error(
      `No hubo redirección a /dashboard. URL actual: ${page.url()}. Mensaje de login: ${message}`,
    );
  });

  await expect(page).toHaveURL(/.*dashboard/);

  const sidebar = page.locator('aside');
  const header = page.locator('header');
  await expect(sidebar).toBeVisible();
  await expect(header).toBeVisible();
  await expect(sidebar.locator('nav')).toBeVisible();

  await page.goto(`${baseURL}/activos/hvac`);
  await expectPageLoaded(page);

  await page.goto(`${baseURL}/activos/gestion`);
  await expectPageLoaded(page);
});
