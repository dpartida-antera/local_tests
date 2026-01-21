import { type Page, expect } from '@playwright/test';

const TIMEOUT_NAVIGATION = 7000;

export async function setPageSize(page: Page, size: number): Promise<void> {
  const dropdown = page.locator('.p-paginator .p-dropdown-trigger');
  await dropdown.click({ timeout: TIMEOUT_NAVIGATION });
  
  const option = page.getByRole('option', { name: size.toString() });
  await option.click({ timeout: TIMEOUT_NAVIGATION });
  
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Wait for table to render
}

export async function getTableRowCount(page: Page, timeout: number = TIMEOUT_NAVIGATION): Promise<number> {
  await page.waitForLoadState('networkidle');
  const rows = page.getByRole('row');
  await rows.first().waitFor({ state: 'visible', timeout });
  return await rows.count() - 1; // Subtract 1 for header row
}

export async function verifyPageSize(page: Page, expectedSize: number): Promise<void> {
  const rowCount = await getTableRowCount(page);
  console.log(`Table rows: ${rowCount}, Expected: ${expectedSize}`);
  expect(rowCount).toBe(expectedSize);
}
