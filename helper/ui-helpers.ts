import { expect, type Page, type Locator } from '@playwright/test';

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
