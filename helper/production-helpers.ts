import { expect, type Page } from '@playwright/test';

/**
 * Adds or removes a tag from the module in Normal View
 */
export async function modifyModuleTags(page: Page, action: 'Add Module Tags' | 'Remove Module Tags', tagName: string, confirmButton: 'Add' | 'Save') {
  await page.locator('p-tristatecheckbox').first().click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Actions' }).click();
  await page.waitForTimeout(1000);
  await page.getByText(action).click();
  await page.waitForTimeout(1000);
  await page.getByText(tagName).click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: confirmButton }).click();
  await page.waitForTimeout(1000);
  const actionCompletedToast = page.getByText('Action Completed.');
  await actionCompletedToast.waitFor({ state: 'visible', timeout: 20000 });
}

/**
 * Adds or removes a tag from the module in Machine View
 */
export async function modifyModuleTagsMachineView(page: Page, action: 'Add Module Tags' | 'Remove Module Tags', tagName: string, confirmButton: 'Add' | 'Save') {
  await page.locator('.pi.pi-desktop').click();
  await page.waitForTimeout(3000);
  await page.getByText('Pending').first().click();
  await page.waitForTimeout(2000);
  await page.locator('.p-element.pi').first().click();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Actions' }).click();
  await page.getByText(action).click();
  await page.getByText(tagName).click();
  await page.getByRole('button', { name: confirmButton }).click();
  const actionCompletedToast = page.getByText('Action Completed.');
  await actionCompletedToast.waitFor({ state: 'visible', timeout: 20000 });
}

/**
 * Searches by a specific tag and order number
 */
export async function searchByTagAndOrder(page: Page, tagName: string, orderNumber: string) {
  await page.locator('i').nth(5).click();
  await page.waitForTimeout(2000);
  await page.getByText('Find a tag').click();
  await page.waitForTimeout(2000);
  await page.getByRole('listitem', { name: tagName }).click();
  await page.waitForTimeout(2000);
  await page.getByText('Search', { exact: true }).click();
  await page.locator('i').nth(5).click();
  await page.getByRole('textbox', { name: 'Search by Order', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search by Order', exact: true }).fill(orderNumber);
  await page.getByText('Search', { exact: true }).click();
  await page.waitForTimeout(4000);
}
