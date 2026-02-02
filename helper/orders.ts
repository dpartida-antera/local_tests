import { type Page, expect } from '@playwright/test';

const TIMEOUT_NAVIGATION = 7000;

export async function navigateToOrders(page: Page): Promise<void> {
  // Open menu
  const menuButton = page.locator('mat-toolbar button', { hasText: 'menu' });
  await menuButton.click();
  
  // Navigate to Orders
  await page.getByText('view_listOrder').click();
  await page.getByRole('link', { name: /Orders/i }).click();
  
  // Close sidebar overlay
  const sidebarButton = page.locator('fuse-navbar').getByRole('button');
  await sidebarButton.click({ timeout: TIMEOUT_NAVIGATION });
  
  await page.locator('.fuse-sidebar-overlay').click();
  await page.waitForTimeout(5000);
  
  await page.waitForLoadState('networkidle');
}
export async function generateRandomString(length: number): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < length; i++) {
    randomString += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return randomString;
}