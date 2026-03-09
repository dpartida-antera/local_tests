import { expect, type Page } from '@playwright/test';
import { waitForLoader } from './ui-helpers';

/**
 * Opens the activities sidebar from a dialog (e.g. Order Detail or Receiving PO)
 * @param page - The Playwright page
 */
export async function openActivitiesSidebar(page: Page): Promise<void> {
  await page.getByRole('dialog').getByText('Activities').click();
  await expect(page.getByRole('complementary').locator('div').filter({ hasText: 'Activities' }).first()).toBeVisible();
}

/**
 * Clicks the add activity button inside the activities sidebar
 * @param page - The Playwright page 
 */
export async function clickAddActivityButton(page: Page): Promise<void> {
  await page.getByText('+').click();
}

/**
 * Fills out the activity form and saves it
 * @param page - The Playwright page
 * @param subject - The subject text to fill in
 */
export async function fillAndSaveActivity(page: Page, subject: string): Promise<void> {
  await page.locator('#subject').fill(subject);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('complementary').locator('div').filter({ hasText: 'Activities' }).first()).toBeVisible();
}

/**
 * Verifies that an activity was created by checking the global activities page
 * @param page - The Playwright page
 * @param subject - The subject of the activity to verify
 */
export async function verifyGlobalActivity(page: Page, subject: string): Promise<void> {
  await page.goto('https://dev.anterasaas.com/activities/v1');
  await waitForLoader(page);
  await expect(page.getByText(subject).first()).toBeVisible();
}

/**
 * Opens the first activity from the list in the activities sidebar
 * @param page - The Playwright page
 */
export async function openFirstActivityItem(page: Page): Promise<void> {
  // Use .first() to avoid strict mode violations when there are multiple activities
  await page.getByText(/Task:/).first().click();
}

/**
 * Edits the subject of an open activity and saves
 * @param page - The Playwright page
 * @param newSubject - The new subject text to fill in
 */
export async function editAndSaveActivity(page: Page, newSubject: string): Promise<void> {
  const subjectInput = page.locator('#subject');
  await subjectInput.waitFor({ state: 'visible', timeout: 30000 });
  await subjectInput.click();
  await subjectInput.fill(newSubject);

  const saveBtn = page.getByRole('button', { name: 'Save' });
  await saveBtn.waitFor({ state: 'visible', timeout: 15000 });
  await saveBtn.click();

  // Wait for the success toast message
  // await expect(page.getByText('Success Updated.')).toBeVisible({ timeout: 15000 });
}
