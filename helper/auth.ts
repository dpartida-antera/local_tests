import { type Page } from '@playwright/test';
import { ConfigLoader } from './ConfigLoader';

const config = ConfigLoader.loadConfig<{ baseUrl: string; user: string; password: string }>('test-config.json');

export async function login(page: Page): Promise<void> {
  await page.goto(`${config.baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Username').fill(config.user);
  await page.getByLabel('Password').fill(config.password);
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForLoadState('networkidle');
}
