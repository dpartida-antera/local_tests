import { test, expect, type Page } from '@playwright/test';
import { ConfigLoader } from '../helper/ConfigLoader';
import { login } from '../helper/auth';
import { generateRandomString } from '../helper/orders';
import { performGlobalSearch, searchByBillAddress, testAutocompleteField, getNotesField, navigateToNewAccount } from '../helper/ui-helpers';

const config = ConfigLoader.loadConfig<{ baseUrl: string; user: string; password: string }>('test-config.json');
const TIMEOUT_FILTER = 5000;

test.describe('Global Navigation & Search Rules', () => {

  test.beforeEach(async () => {
    test.setTimeout(120000);
  });

  test('Global Search should find PO/Order numbers but FAIL on Address', async ({ page }) => {
    await login(page);
    
    // 1. Positive Test: Search by Order Number (Valid)
    await performGlobalSearch(page, '53614'); // Example from transcript [5]
    // await expect(page.getByText('Order #53614')).toBeVisible();
    await page.getByRole('button', { name: 'Orders' }).click();
    await expect(page.locator('mat-list-item')).toContainText('53614');

    // 2. Negative Test: Search by Address (Invalid)
    // Rick explicitly states: "If you type 2121 Main Street... it won't find it" [1]
    await performGlobalSearch(page, '2121 Main Street');
    await expect(page.getByText('No results found')).toBeVisible();

    // Source [1]: Global search finds Name, Email, Order#, PO# but NOT Address.
  });
		
  test('Module Level Search should find Address', async ({ page }) => {
    test.setTimeout(480000);
    // Source [6]: Column specific search finds fields global search misses.
    await login(page);
    await page.goto(`${config.baseUrl}/accounts/v1`);

    await searchByBillAddress(page, '144 Brays Chapel Rd', 5, TIMEOUT_FILTER);
    
    // Should find the record now
    await expect(page.locator('table tbody tr')).toHaveCount(1);
  });
});

// Group 2: Customer Record & Data Integrity
test.describe('Customer Record - Business Logic & "Rick Rules"', () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(480000);
    await login(page);
    await navigateToNewAccount(page, config.baseUrl);
  });

  test('CRITICAL: Autocomplete fields must use dropdown selection', async ({ page }) => {
    await testAutocompleteField(
      page,
      /^Sales Rep$/,
      'diego',
      'dieg',
      'Diego Partida',
      'Diego Partida'
    );
  });

  test('CRITICAL: Parent Co. autocomplete field must use dropdown selection', async ({ page }) => {
    await testAutocompleteField(
      page,
      /^Parent Co\.$/,
      'diego',
      'dieg',
      'Diego Partida Customer',
      'Diego Partida Customer'
    );
  });

  test('Notes field should contain expected text', async ({ page }) => {
    // Wait for the form to be visible
    await page.getByText('General Info', { exact: false }).waitFor({ state: 'visible', timeout: 15000 });

    const notesField = await getNotesField(page);
    await notesField.fill('test');
    
    // Assert that the notes field contains the expected text
    await expect(notesField).toHaveValue('test');
  });

  // test('CRITICAL: Notes field must respect 500 char limit (QuickBooks Sync)', async ({ page }) => {
  //   // Wait for the form to be visible
  //   await page.getByText('General Info', { exact: false }).waitFor({ state: 'visible', timeout: 15000 });

  //   // Fill customer name with random string
  //   const randomName = generateRandomString(10);
  //   await page.getByRole('textbox', { name: 'Enter a name...' }).fill(await randomName);

  //   // Get Notes field using helper
  //   const notesField = await getNotesField(page);
    
  //   // Fill with 501 characters (exceeds limit)
  //   const longText = 'A'.repeat(501);
  //   await notesField.fill(longText);
    
  //   // Try to save
  //   await page.getByRole('button', { name: 'Save' }).click();

  //   // Assert that an error message is displayed
  //   // Note: Update the selector and text based on actual error implementation
  //   const errorMessages = page.locator('.error-message, .p-toast-message-error, .p-toast-message-danger');
  //   await expect(errorMessages.first()).toBeVisible({ timeout: 5000 });

  //   const count = await errorMessages.count();
  //   console.log(`Error message elements found: ${count}`);

  //   const texts = await errorMessages.allTextContents();
  //   console.log('Error message texts:', texts);

  //   if (count > 0) {
  //     const firstHtml = await errorMessages.first().evaluate((el) => el.outerHTML);
  //     console.log('First error message HTML:', firstHtml);
  //   }
  // });

});

// Group 3: Activities Dashboard Workflow
test.describe('Activities module', () => {

  test.beforeEach(async ({ page }) => {
		test.setTimeout(480000);

		await login(page);
		await page.goto(`${config.baseUrl}/activities/v1`);
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 });
  });

  test('Completing an activity from Dashboard removes it from list)', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first();

    const initialRowText = await firstRow.innerText();

    // 4. Identify the "Pending" button within this specific row
    const pendingButton = firstRow.getByText('Pending');

    // 5. Click the button
    await pendingButton.click();

    // 6. Wait for UI to update and assert the first row changed
    await expect.poll(async () => {
      return await page.locator('tbody tr').first().innerText();
    }, { timeout: 10000 }).not.toBe(initialRowText);
    
  });

});