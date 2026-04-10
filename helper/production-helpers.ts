import { expect, type Page } from '@playwright/test';
import { waitForLoader } from './ui-helpers';

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
 * Shared helper for modifying module tags with a specific view locator.
 */
async function modifyModuleTagsWithViewConfig(page: Page, viewLocator: string, action: 'Add Module Tags' | 'Remove Module Tags', tagName: string, confirmButton: 'Add' | 'Save', rowIconLocator: string = '.p-element.pi') {
  await page.locator(viewLocator).click();
  await waitForLoader(page);
    // await expect(page.getByRole('progressbar').first()).not.toBeVisible({ timeout: 40000 });

  if (viewLocator === '.pi.pi-desktop') {
    await expect(page.getByText('(8h)').first()).toBeVisible({ timeout: 70000 });
  }
  await expect(page.locator('.cdk-drag.task').first()).toBeVisible({ timeout: 70000 });
  await page.getByText('Pending').first().click();
  await page.waitForTimeout(2000);
  await page.locator(rowIconLocator).first().click();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Actions' }).click();
  await page.getByText(action).click();
  await page.getByText(tagName).click();
  await page.getByRole('button', { name: confirmButton }).click();
  // const actionCompletedToast = page.getByText('Action Completed.');
  // await actionCompletedToast.waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(5000);
}

/**
 * Adds or removes a tag from the module in Machine View
 */
export async function modifyModuleTagsMachineView(page: Page, action: 'Add Module Tags' | 'Remove Module Tags', tagName: string, confirmButton: 'Add' | 'Save') {
  await modifyModuleTagsWithViewConfig(page, '.pi.pi-desktop', action, tagName, confirmButton, '.p-element.pi');
}

/**
 * Adds or removes a tag from the module in Status View
 * @param page - The Playwright page
 * @param action - Whether to add or remove a tag
 * @param tagName - The name of the tag to add or remove
 * @param confirmButton - The text of the confirmation button to click ('Add' or 'Save')
 */
export async function modifyModuleTagsStatusView(page: Page, action: 'Add Module Tags' | 'Remove Module Tags', tagName: string, confirmButton: 'Add' | 'Save') {
  await modifyModuleTagsWithViewConfig(page, '.pi.pi-table', action, tagName, confirmButton, '.p-element.pi.pi-list');
}

/**
 * Searches by a specific tag and order number using the tag filter and search box
 * @param page - The Playwright page
 * @param tagName - The tag text to search by
 * @param orderNumber - The specific order number to search for
 */
export async function searchByTagAndOrder(page: Page, tagName: string, orderNumber: string) {
  await page.locator('i').nth(5).click();
  await page.waitForTimeout(2000);
  await page.getByText('Find a tag').click();
  await page.waitForTimeout(2000);
  await page.getByRole('listitem', { name: tagName }).click();
  await page.waitForTimeout(2000);
  // await page.getByText('Search', { exact: true }).click();
  // await page.locator('i').nth(5).click();
  await page.getByRole('textbox', { name: 'Search by Order', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search by Order', exact: true }).fill(orderNumber);
  await page.getByText('Search', { exact: true }).click();
  await page.waitForTimeout(4000);
}
