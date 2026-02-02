import { test, expect, type Page } from '@playwright/test';
import { ConfigLoader } from '../helper/ConfigLoader';
import { login } from '../helper/auth';
import { generateRandomString } from '../helper/orders';

const config = ConfigLoader.loadConfig<{ baseUrl: string; user: string; password: string }>('test-config.json');
const TIMEOUT_FILTER = 5000;

// test.describe('Global Navigation & Search Rules', () => {

//   test('Global Search should find PO/Order numbers but FAIL on Address', async ({ page }) => {
//     test.setTimeout(480000);
//     try{
// 			await login(page);
//     	// 1. Positive Test: Search by Order Number (Valid)
// 			await page.getByPlaceholder('Global Search').fill('53614'); // Example from transcript [5]
// 			await page.keyboard.press('Enter');
// 			// await expect(page.getByText('Order #53614')).toBeVisible();
// 			await page.getByRole('button', { name: 'Orders' }).click();
// 			await expect(page.locator('mat-list-item')).toContainText('53614');

// 			// 2. Negative Test: Search by Address (Invalid)
// 			// Rick explicitly states: "If you type 2121 Main Street... it won't find it" [1]
// 			await page.getByPlaceholder('Global Search').fill('2121 Main Street');
// 			await page.keyboard.press('Enter');
// 			await expect(page.getByText('No results found')).toBeVisible();

// 		} catch (error) {
// 				console.error('Test failed with error:', error);
// 				throw error; // Rethrow to ensure the test is marked as failed
// 		}
// 		// Source [1]: Global search finds Name, Email, Order#, PO# but NOT Address.
    
//   });
		
//   test('Module Level Search should find Address', async ({ page }) => {
// 		test.setTimeout(480000);
//     try{
// 			// Source [6]: Column specific search finds fields global search misses.
// 			// await page.goto('/crm/customers');
// 			await login(page);
// 			await page.goto(`${config.baseUrl}/accounts/v1`);

// 			const filterIcon = page.locator('i').nth(5);
// 			await filterIcon.click({ timeout: TIMEOUT_FILTER });
// 			await page.waitForTimeout(1000);
			
// 			// Select filter option
// 			await page.getByRole('textbox', { name: 'Search by Bill Address1' }).click();
// 			await page.getByRole('textbox', { name: 'Search by Bill Address1' }).fill('144 Brays Chapel Rd');
			
// 			// Wait for the table to update with filtered results
// 			await page.waitForTimeout(2000); // Additional wait for results to populate
// 			await page.getByText('Search', { exact: true }).click();

			
// 			// Should find the record now
// 			await expect(page.locator('table tbody tr')).toHaveCount(1);		
// 		} catch (error) {
// 			console.error('Test failed with error:', error);
// 			throw error; // Rethrow to ensure the test is marked as failed
// 		}
//   });
// });

// Group 2: Customer Record & Data Integrity
test.describe('Customer Record - Business Logic & "Rick Rules"', () => {

  test.beforeEach(async ({ page }) => {
		test.setTimeout(480000);

		await login(page);
		await page.goto(`${config.baseUrl}/accounts/v1`);
		await page.locator('#addNewButton').click();
		await page.waitForTimeout(2000);
		
  });

test('CRITICAL: Autocomplete fields must use dropdown selection', async ({ page }) => {
  test.setTimeout(480000);

  // Make sure the form is rendered
  await page.getByText('General Info', { exact: false }).waitFor({ state: 'visible', timeout: 15000 });

  // 1) Locate the SECOND visible text "Sales Rep"
  const salesRepLabel = page.locator('text=Sales Rep').nth(2);
  console.log('Sales Rep label count:', await page.locator('text=Sales Rep').count());

  // 2) Go up to the field container. You’ve been using ../..; keep that for now.
  const salesRepContainer = salesRepLabel.locator('xpath=../..');
  console.log('Sales Rep container bbox:', await salesRepContainer.boundingBox());

  // 3) Click the container – this should focus the *real* input/combobox inside
  await salesRepContainer.click();
  await page.waitForTimeout(500);

  // 4) Type into the focused element using keyboard (don’t target the internal input)
  await page.keyboard.type('diego', { delay: 50 });

  // 5) Wait for the autocomplete options and click one
  const option = page
    .locator('.p-autocomplete-items .p-autocomplete-item', { hasText: /diego/i })
    .first();

  await option.waitFor({ state: 'visible', timeout: 5000 });
  await option.click();

  // 6) Optional: assert that "diego" was selected.
  // Easiest is to read back the visible text from the same container:
  const containerText = await salesRepContainer.innerText();
  console.log('Sales Rep container text after selection:', containerText);
  expect(containerText.toLowerCase()).toContain('diego');
});


  // test('CRITICAL: General Notes field must respect 500 char limit (QuickBooks Sync)', async ({ page }) => {
  //   // Source [3, 7]: "If you type more than 500 characters... QuickBooks will refuse the order."
    
  //   const notesField = page.getByLabel('General Notes');
  //   const longText = 'A'.repeat(501); // Create string of 501 chars

  //   await notesField.fill(longText);
  //   await page.getByRole('button', { name: 'Save' }).click();

  //   // Expectation: UI should block save or show validation error to prevent QB sync failure
  //   // Note: If the UI currently allows this, this test will FAIL (which is good, it catches the bug)
  //   await expect(page.locator('.error-message')).toContainText('limit is 500 characters');
  // });
  
  // test('Parent Account must be selected before Child Account creation', async ({ page }) => {
  //   // Source [8]: "You can't have a child till you have a parent."
    
  //   // Try to save a child account without a parent link (logic check)
  //   await page.getByLabel('Parent Account').fill('NonExistentParent');
  //   await page.click('body');
    
  //   // Ensure it enforces the Lookup/Dropdown rule similar to Autocomplete
  //   await expect(page.getByLabel('Parent Account')).toBeEmpty();
  // });
});


// test('orders_quantity_test', async ({ page }: { page: Page }) => {
//   test.setTimeout(480000);
//   try{
//     login(page);


//   } catch (error) {
//     console.error('Test failed with error:', error);
//     throw error; // Rethrow to ensure the test is marked as failed
//   }
//     // Login
// })