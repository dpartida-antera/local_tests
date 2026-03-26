// import { expect, type Page } from '@playwright/test';
// import { ConfigLoader } from './ConfigLoader';
// const config: any = ConfigLoader.loadConfig<any>('test/test-config.json');

// export async function login(page: Page): Promise<void> {
//   const password = process.env.STEVEN_DEV_PASSWORD;
//   if (!password) {
//     throw new Error('STEVEN_DEV_PASSWORD environment variable is not set');
//   }
//   console.log('Using username:', config.user);
//   await page.goto(`${config.baseUrl}/login`, { waitUntil: 'networkidle' });
//   await page.getByLabel('Username').click();
//   await page.getByLabel('Username').fill(config.user);
//   await page.getByLabel('Password').click();
//   await page.getByLabel('Password').fill(password);
//   await page.getByLabel('LOGIN').click();
//   await page.waitForTimeout(2000);
//   await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
//   const username = page.locator('span.username.mr-12').nth(1);
//   await expect(username).toHaveText('Antera Testing');
//   console.log('Login complete');
// }

import { type Page } from '@playwright/test';
import { ConfigLoader } from './ConfigLoader';

const config = ConfigLoader.loadConfig<{ baseUrl: string; user: string; password: string }>('test-config.json');

export async function login(page: Page): Promise<void> {
  await page.goto(`${config.baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Username').fill(config.user);
  await page.getByLabel('Password').fill(config.password);
  // Click the login button and wait for navigation (SPA or full navigation).
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
    page.getByRole('button', { name: /login/i }).click(),
  ]);
  // Best-effort: wait for a known post-login UI element so tests don't race.
  await page.getByRole('button', { name: 'Orders' }).waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
}
