import { test, expect, type Page } from '@playwright/test';
import { ConfigLoader } from '../helper/ConfigLoader';

const config = ConfigLoader.loadConfig<{ baseUrl: string; user: string; password: string }>('test-config.json');

function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < length; i++) {
    randomString += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return randomString;
}

test('product_test', async ({ page }: { page: Page }) => {
  test.setTimeout(480000);
  const randomString = generateRandomString(6);
  const inputText = 'auto_test' + randomString;
  console.log(inputText);

  await page.goto(`${config.baseUrl}/login`);
  await page.getByLabel('Username').click();
  await page.getByLabel('Username').fill(config.user);
  await page.getByLabel('Password').click();
  await page.getByLabel('Password').fill(config.password);
  await page.getByLabel('LOGIN').click();
  await page.locator('mat-toolbar button').filter({ hasText: 'menu' }).click();
  await page.getByText('workCRMkeyboard_arrow_right').click();
  await page.getByText('workCRMkeyboard_arrow_right').click();
  await page.getByText('view_listOrder').click();
  await page.getByRole('link', { name: 'Products' }).click();
  await page.locator('.fuse-sidebar-overlay').click();
  await page.locator('#addNewButton').click();
  await page.locator('gridster-item').filter({ hasText: 'Item #' }).getByPlaceholder('Start typing...').click();
  await page.waitForTimeout(5000);

  await page.locator('gridster-item').filter({ hasText: 'Item #' }).getByPlaceholder('Start typing...').fill(inputText);
  await page.waitForTimeout(5000);

  await page.getByPlaceholder('Enter a value...').fill(inputText);
  await page.waitForTimeout(5000);
  await page.locator('gridster-item:nth-child(17) > .gridster-item > div > .edit-dropdown > .p-element > div').click();
  await page.getByLabel('Product', { exact: true }).click();
  await page.locator('app-table-dashboard-widgets div').filter({ hasText: 'Vendor' }).getByRole('searchbox').fill('test');
  await page.getByRole('option', { name: 'Test %' }).click();
  await page.locator('app-table-dashboard-widgets div').filter({ hasText: 'empty' }).nth(3).click();
  await page.getByLabel('3D Miniatures').first().click();
  await page.getByRole('button', { name: '' }).click();
  await page.locator('app-table-dashboard-widgets textarea').fill('this is a test');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.waitForTimeout(3000);
  await page.locator('gridster-item').filter({ hasText: 'Item #' }).getByPlaceholder('Start typing...').click();
  await page.locator('gridster-item').filter({ hasText: 'Item #' }).getByPlaceholder('Start typing...').fill(inputText + '2');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(3000);
  await page.getByRole('textbox', { name: 'Search', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search', exact: true }).fill(inputText);
  await page.waitForTimeout(5000);
  await page.getByRole('textbox', { name: 'Search', exact: true }).press('Enter');
  await page.waitForTimeout(7000);
  await page.getByRole('cell', { name: inputText, exact: true }).locator('span').click();
  console.log('Product created successfully.');
});
