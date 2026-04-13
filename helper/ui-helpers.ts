import { expect, test, type Page, type Locator } from '@playwright/test';
import { BASE_URL } from './base-url';

/**
 * Opens the main navigation menu by clicking the menu button
 * @param page - The Playwright page
 */
export async function openMenu(page: Page): Promise<void> {
  const menuButton = page.locator('mat-toolbar button', { hasText: 'menu' });
  await menuButton.click();
}

/**
 * Navigates to a specific module's v1 URL
 * @param page - The Playwright page
 * @param moduleName - The name of the module (e.g., 'receiving', 'accounts')
 */
export async function navigateToModule(page: Page, moduleName: string): Promise<void> {
  await page.goto(`${BASE_URL}/${moduleName}/v1`);
  await waitForLoader(page);
}

/**
 * Navigates to the receiving module with retry logic: if it takes longer than 1 minute,
 * tries navigating to accounts first, then back to receiving. If it fails again, throws an error.
 * @param page - The Playwright page
 */
export async function navigateToReceivingWithRetry(page: Page): Promise<void> {
  try {
    await Promise.race([
      navigateToModule(page, 'receiving'),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Navigation to receiving timed out after 1 minute')), 60000))
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === 'Navigation to receiving timed out after 1 minute') {
      // Try navigating to accounts first
      await navigateToModule(page, 'accounts');
      await page.waitForTimeout(7000); // Wait for a bit before navigating back to receiving
      // Then try receiving again
      await navigateToModule(page, 'receiving');
    } else {
      throw error;
    }
  }
}

/**
 * Tests autocomplete field behavior: field should clear if not selected from dropdown,
 * and should retain value when properly selected.
 */
export async function testAutocompleteField(
  page: Page,
  fieldRegex: RegExp,
  partialTextInvalid: string,
  partialTextValid: string,
  expectedOption: string,
  expectedValue: string
) {
  // Test 1: Typing without selecting should clear the field
  const inputEmpty = page
    .locator('div')
    .filter({ hasText: fieldRegex })
    .getByRole('searchbox');

  await inputEmpty.click();
  await inputEmpty.fill(partialTextInvalid);

  // Click away to trigger validation
  await page.locator('app-table div')
    .filter({ hasText: 'Customer Sales Rep CSR' })
    .nth(2)
    .click();

  // Field should be empty
  await expect(inputEmpty).toHaveValue('');

  // Test 2: Typing and selecting from dropdown should retain value
  const input = page
    .locator('div')
    .filter({ hasText: fieldRegex })
    .getByRole('searchbox');

  await input.click();
  await input.fill(partialTextValid);

  // Select from dropdown
  await page.getByRole('option', { name: expectedOption }).click();

  // Field should have the selected value
  await expect(input).toHaveValue(expectedValue);
}

/**
 * Performs a global search and waits for results
 */
export async function performGlobalSearch(
  page: Page,
  searchTerm: string
) {
  await page.getByPlaceholder('Global Search').fill(searchTerm);
  await page.keyboard.press('Enter');
}

/**
 * Gets the Notes textarea field locator
 */
export async function getNotesField(page: Page): Promise<Locator> {
  const notesLabel = page.getByText('Notes', { exact: true }).first();
  const notesField = notesLabel.locator('xpath=../..').locator('textarea');
  await notesField.waitFor({ state: 'visible', timeout: 5000 });
  return notesField;
}

/**
 * Navigates to accounts page and clicks add new button
 */
export async function navigateToNewAccount(page: Page, baseUrl: string) {
  await page.goto(`${baseUrl}/accounts/v1`);
  await page.locator('#addNewButton').click();
  await page.waitForTimeout(2000);
}

/**
 * Performs a filtered search in accounts module
 */
export async function searchByBillAddress(
  page: Page,
  address: string,
  filterIconIndex: number = 5,
  timeout: number = 5000
) {
  const filterIcon = page.locator('i').nth(filterIconIndex);
  await filterIcon.click({ timeout });
  await page.waitForTimeout(1000);

  await page.getByRole('textbox', { name: 'Search by Bill Address1' }).click();
  await page.getByRole('textbox', { name: 'Search by Bill Address1' }).fill(address);

  await page.waitForTimeout(2000);
  await page.getByText('Search', { exact: true }).click();
}

/**
 * Waits for a loader/spinner to appear and then disappear
 * Useful for waiting for async operations to complete
 * @param page - The Playwright page
 * @param selector - CSS selector for the loader element (default: 'mat-progress-spinner, .loader, .loading')
 * @param timeout - Maximum time to wait (default: 90000 = 90s)
 */
export async function waitForLoader(page: Page, selector: string = 'mat-progress-spinner, .loader, .loading', timeout: number = 100000): Promise<void> {
  // Wait for loader to appear (indicates operation has started)
  const loader = page.locator(selector);
  
  let loaderWasVisible = false;
  try {
    await loader.waitFor({ state: 'visible', timeout: 5000 });
    loaderWasVisible = true;
  } catch (err) {
    // Loader did not appear in short time. This is okay for fast pages that render without a spinner.
    console.log(`Loader '${selector}' did not appear within 5s (might be instant).`);
  }

  // If loader was visible, wait for it to disappear
  if (loaderWasVisible) {
    await loader.waitFor({ state: 'hidden', timeout });
  }

}

/**
 * Performs a search in the general table searchbox and waits for the loader
 * @param page - The Playwright page
 * @param searchTerm - The term to search for
 */
export async function performSearchInModule(page: Page, searchTerm: string): Promise<void> {
  const searchBox = page.getByRole('textbox', { name: 'Search', exact: true });
  await expect(searchBox).toBeVisible({ timeout: 50000 });
  await searchBox.click();
  await searchBox.fill(searchTerm);
  await page.keyboard.press('Enter');

  await waitForLoader(page);
}

/**
 * Finds the 0-based index of a column in a table by its header text
 * @param page - The Playwright page
 * @param columnName - The exact text of the column header to find
 * @param timeout - Maximum time to wait for headers (default: 50000)
 * @returns The 0-based column index
 * @throws Error if the column header is not found
 */
export async function getColumnIndex(page: Page, columnName: string, timeout: number = 30000): Promise<number> {
  await page.locator('table thead th, table thead td').first().waitFor({ state: 'visible', timeout });
  const headers = await page.locator('table thead th, table thead td').allTextContents();
  const index = headers.findIndex(h => h.trim() === columnName);
  if (index === -1) {
    throw new Error(`Column "${columnName}" not found in table headers: [${headers.map(h => h.trim()).join(', ')}]`);
  }
  return index;
}

/**
 * Resolves the search term by using a specific value or extracting it from the first row of a column.
 * @param page - The Playwright page
 * @param columnName - The exact header text of the column
 * @param colIndex - The resolved index of the column
 * @param specificSearchTerm - Optional value to search for
 * @returns The resolved search term
 */
export async function getFirstInstanceOfSearchTerm(
  page: Page,
  columnName: string,
  colIndex: number,
  specificSearchTerm?: string
): Promise<string> {
  let searchTerm = specificSearchTerm;

  if (!searchTerm) {
    // Grab the first row's value for that column
    const firstRow = page.locator('tbody tr').first();
    await firstRow.waitFor({ state: 'visible' });
    const cellText = await firstRow.locator('td').nth(colIndex).locator('a').textContent();

    if (!cellText) {
      throw new Error(`No text found in the first row of column "${columnName}"`);
    }

    searchTerm = cellText.trim();
  } else {
    searchTerm = searchTerm.trim();
  }

  return searchTerm;
}

/**
 * Searches the table using the provided value or the first value found in a named column,
 * then asserts the search returns at least one row with an exact match.
 *
 * If no search term is provided, it extracts it from the first row.
 * The column cell is expected to contain an <a> link whose text is the search term.
 *
 * @param page       - The Playwright page
 * @param columnName - The exact header text of the column to pick the value from (e.g. 'Order #')
 * @param specificSearchTerm - Optional value to search for instead of grabbing the first row's value
 */
export async function searchByFirstColumnValue(page: Page, columnName: string, specificSearchTerm?: string): Promise<string> {
  // Resolve column index dynamically
  const colIndex = await getColumnIndex(page, columnName);

  const searchTerm = await getFirstInstanceOfSearchTerm(page, columnName, colIndex, specificSearchTerm);

  // Perform the search
  await performSearchInModule(page, searchTerm);

  // Assert at least one result row is visible
  const rows = page.locator('tbody tr');
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThanOrEqual(1);

  // Assert an exact match exists among results (CSS nth-child is 1-based)
  const resultCells = page.locator(`tbody tr td:nth-child(${colIndex + 1}) a`);
  const resultTexts = await resultCells.allTextContents();
  const hasExactMatch = resultTexts.some(t => t.trim() === searchTerm);
  expect(hasExactMatch, `Could not find exact match for "${searchTerm}" in column "${columnName}"`).toBe(true);

  return searchTerm;
}

/**
 * Clicks on an order row and verifies the Receiving PO dialog is visible
 * @param page - The Playwright page
 * @param orderNum - The order number or text to identify the row
 */
export async function openReceivingDialogByOrderNumber(page: Page, orderNum: string): Promise<void> {
  const orderRow = page.locator('tr').filter({ hasText: orderNum });
  await orderRow.first().click();
  await waitForLoader(page);
  await page.waitForTimeout(2000);
  await expect(page.getByRole('dialog').locator('div').filter({ hasText: 'Receiving PO' }).first()).toBeVisible();
}

/**
 * Clicks the 'Receive All' button and waits for the receipt completion notification
 * @param page - The Playwright page
 */
export async function clickReceiveAllAndWait(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Receive All' }).click();
  await waitForLoader(page);
  const inventoryReceiptCompleted = await page.getByText('Inventory receipt completed.');
  await inventoryReceiptCompleted.waitFor({ state: 'visible', timeout: 15000 });
}

/**
 * Selects the first checkbox in the grid and clicks 'Receive All'
 * @param page - The Playwright page
 */
export async function selectFirstCheckboxAndReceive(page: Page): Promise<void> {
  await page.getByRole('gridcell').first().click();
  await clickReceiveAllAndWait(page);
}

/**
 * Selects all checkboxes in the grid by clicking the header checkbox and clicks 'Receive All'
 * @param page - The Playwright page
 */
export async function selectAllCheckboxAndReceive(page: Page): Promise<void> {
  await page.locator('.mat-checkbox-inner-container').first().click();
  await clickReceiveAllAndWait(page);
}

/**
 * Performs a search and verifies that no records are found in the table
 * @param page - The Playwright page
 * @param searchTerm - The term to search for
 */
export async function searchAndExpectNoRecords(page: Page, searchTerm: string): Promise<void> {
  await performSearchInModule(page, searchTerm);
  await expect(page.locator('tbody')).toContainText('No records found', { timeout: 15000 });
}

/**
 * Navigates to the receiving module, searches for an order, and opens its receiving dialog
 * @param page - The Playwright page
 * @param orderNum - Optional order number to search for. If omitted, uses the first order.
 * @returns The order number that was searched and opened
 */
export async function navigateToReceivingAndOpenOrder(page: Page, orderNum?: string): Promise<string> {
  await navigateToModule(page, 'receiving');
  const foundOrderNum = await searchByFirstColumnValue(page, 'Order #', orderNum);
  await openReceivingDialogByOrderNumber(page, foundOrderNum);
  return foundOrderNum;
}

/**
 * Receives a partial quantity by clicking the Receiving cell, filling a quantity, and clicking 'More'
 * @param page - The Playwright page
 * @param quantity - The quantity to receive
 */
export async function receivePartialQuantity(page: Page, quantity: string): Promise<void> {
  await page.getByRole('gridcell', { name: 'Receiving' }).click();
  await page.getByRole('gridcell', { name: 'Receiving' }).locator('input').fill(quantity);
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'More' }).click();
  await expect(page.getByText('Inventory receipt completed.')).toBeVisible({ timeout: 30000 });
}

/**
 * Navigates to the admin configuration page for order systems
 * @param page - The Playwright page
 */
export async function navigateToAdminConfig(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/admin/config`)
  // await waitForLoader(page);
  const orderSystemConfiguration = page.getByText('Order System Configuration');
  await orderSystemConfiguration.waitFor({ state: 'visible', timeout: 15000 });
}

/**
 * Verifies and applies the "Group by all attached Decoration" setting if it is not already set
 * @param page - The Playwright page
 */
export async function makeSureGroupByAllAttachedDecorationInSingleProductIsSet(page: Page): Promise<void> {
  let isVisible = false;
  try {
    const checkboxLabel = page.getByText('Group by all attached Decoration in single Product (Common Variation + Location)').first();
    await expect(checkboxLabel).toBeVisible({ timeout: 30000 });
    isVisible = true;
  } catch (e) {
    console.log('Visibility check failed:', e instanceof Error ? e.message : e);
    isVisible = false;
  }

  if (!isVisible) {
    await page.getByText('Work Order Configure work').locator('.mat-form-field-infix').click();
    await page.waitForTimeout(2000);
    await page.getByText('Group by all attached Decoration in single Product (Common Variation + Location)').first().click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Order Settings updated')).toBeVisible();
  }
}

/**
 * Verifies that a specific work order contains the correct details, including location, stock item, and color
 * @param page - The Playwright page
 * @param number - The work order number to verify
 * @param totalNumber - The total count of work orders
 * @param location - The expected location text
 */
export async function verifyWorkOrderIsCorrect(page: Page, number: number, totalNumber: number, location: string): Promise<void> {
  console.log(`verifyWorkOrderIsCorrect called with number=${number}, totalNumber=${totalNumber}`);
  console.log(`Waiting for Work Order (${number} of ${totalNumber})`);
  await expect(page.getByText(`Work Order (${number} of ${totalNumber})`).first()).toBeVisible({ timeout: 15000 });

  console.log(`Waiting for ${location}`);
  await expect(page.getByText(location).first()).toBeVisible({ timeout: 15000 });

  console.log('Waiting for Long buttoned shirt...');
  await expect(page.getByText('Long buttoned shirt DiegoP Stock Item #: S658 In house ID: 50639720 SPC/ASI:').first()).toBeVisible({ timeout: 15000 });

  console.log('Waiting for Color: Black');
  await expect(page.getByText('Color: Black').first()).toBeVisible({ timeout: 15000 });

  console.log(`verifyWorkOrderIsCorrect completed for number=${number}`);
}