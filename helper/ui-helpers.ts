import { expect, type Page, type Locator } from '@playwright/test';

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
  await page.goto(`https://dev.anterasaas.com/${moduleName}/v1`);
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
 * @param selector - CSS selector for the loader element (default: '.loader')
 * @param timeout - Maximum time to wait (default: 50000 = TIMEOUT_NAVIGATION)
 */
export async function waitForLoader(page: Page, selector: string = '.loader', timeout: number = 50000): Promise<void> {
  // Wait for loader to appear (indicates operation has started)
  const loader = page.locator(selector);
  await loader.waitFor({ state: 'visible', timeout }).catch(() => {
    console.log(`Loader '${selector}' did not appear or already finished`);
  });

  // Wait for loader to disappear (indicates operation is complete)
  await loader.waitFor({ state: 'hidden', timeout }).catch(() => {
    console.log(`Loader '${selector}' already hidden`);
  });
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
export async function getColumnIndex(page: Page, columnName: string, timeout: number = 50000): Promise<number> {
  await page.locator('table thead th, table thead td').first().waitFor({ state: 'visible', timeout });
  const headers = await page.locator('table thead th, table thead td').allTextContents();
  const index = headers.findIndex(h => h.trim() === columnName);
  if (index === -1) {
    throw new Error(`Column "${columnName}" not found in table headers: [${headers.map(h => h.trim()).join(', ')}]`);
  }
  return index;
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
  await expect(page.getByRole('dialog').locator('div').filter({ hasText: 'Receiving PO' }).first()).toBeVisible();
}

/**
 * Selects the first checkbox in the grid and clicks 'Receive All'
 * @param page - The Playwright page
 */
export async function selectFirstCheckboxAndReceive(page: Page): Promise<void> {
  await page.getByRole('gridcell').first().click();
  await page.getByRole('button', { name: 'Receive All' }).click();
}

export async function selectAllCheckboxAndReceive(page: Page): Promise<void> {
  await page.locator('.mat-checkbox-inner-container').first().click();
  await page.getByRole('button', { name: 'Receive All' }).click();
}

/**
 * Performs a search and verifies that no records are found in the table
 * @param page - The Playwright page
 * @param searchTerm - The term to search for
 */
export async function searchAndExpectNoRecords(page: Page, searchTerm: string): Promise<void> {
  await performSearchInModule(page, searchTerm);
  await expect(page.locator('tbody')).toContainText('No records found');
}
