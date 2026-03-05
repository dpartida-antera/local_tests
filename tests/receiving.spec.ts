import { test, expect, type Page } from '@playwright/test';
import { login } from '../helper/auth';
import { navigateToModule, waitForLoader, searchByFirstColumnValue } from '../helper/ui-helpers';
import { openActivitiesSidebar, clickAddActivityButton, fillAndSaveActivity, verifyGlobalActivity, openFirstActivityItem, editAndSaveActivity } from '../helper/activities-helpers';

test.describe('receiving suite', () => {
  test.describe.configure({ timeout: 480000, retries: 1 });

  // Verifies the general search works by picking the first Order # from the table and searching it
  test('receiving_general_search', async ({ page }: { page: Page }) => {
    await login(page);
    await navigateToModule(page, 'receiving');
    await waitForLoader(page);
    await searchByFirstColumnValue(page, 'Order #');
  });

  test('should create an activity for an order in receiving', async ({ page }: { page: Page }) => {
    // 1. Login with specific user
    await login(page);
    console.log('Step 1 complete');

    // 2. Receiving & Row Selection
    console.log('Step 2: Navigating to receiving module');
    await navigateToModule(page, 'receiving');
    await waitForLoader(page);
    console.log('Step 2 complete');
    await searchByFirstColumnValue(page, 'Order #', '55721');
    console.log('Step 3: Finding order 55721 and clicking test');
    const orderRow = page.locator('tr').filter({ hasText: '55721' });
    await orderRow.getByText('test', { exact: true }).click();
    expect(page.getByRole('dialog').locator('div').filter({ hasText: 'Receiving PO' }).first()).toBeVisible();
    console.log('Step 3 complete');

    // 3. Open Activities Sidebar
    console.log('Step 4: Opening Activities sidebar');
    await openActivitiesSidebar(page);
    console.log('Step 4 complete');

    // 4. Add New Activity
    console.log('Step 5: Clicking + to add activity');
    await clickAddActivityButton(page);
    console.log('Step 5 complete');

    // 5. Fill and Save
    console.log('Step 6: Filling in subject and saving');
    const uniqueSubject = `Test Subject ${Date.now()}`;
    await fillAndSaveActivity(page, uniqueSubject);
    console.log('Step 6 complete');

    // 6. Verify Global Activities
    console.log('Step 7: Verifying activity creation');
    await verifyGlobalActivity(page, uniqueSubject);
    console.log('Test finished successfully');
  });

  test('should edit an activity for an order in receiving', async ({ page }: { page: Page }) => {
    // 1. Login with specific user
    await login(page);
    console.log('Step 1 complete');

    // 2. Receiving & Row Selection
    console.log('Step 2: Navigating to receiving module');
    await navigateToModule(page, 'receiving');
    await waitForLoader(page);
    console.log('Step 2 complete');

    await searchByFirstColumnValue(page, 'Order #', '55721');
    console.log('Step 3: Finding order 55721 and clicking test');
    const orderRow = page.locator('tr').filter({ hasText: '55721' });
    await orderRow.getByText('test', { exact: true }).click();
    expect(page.getByRole('dialog').locator('div').filter({ hasText: 'Receiving PO' }).first()).toBeVisible();
    console.log('Step 3 complete');

    // 3. Open Activities Sidebar
    console.log('Step 4: Opening Activities sidebar');
    await openActivitiesSidebar(page);
    console.log('Step 4 complete');

    // 4. Open the first activity
    console.log('Step 5: Opening the first activity');
    await openFirstActivityItem(page);
    console.log('Step 5 complete');

    // 5. Edit and Save
    console.log('Step 6: Editing subject and saving');
    const editedSubject = `Edited Subject ${Date.now()}`;
    await editAndSaveActivity(page, editedSubject);
    console.log('Step 6 complete');

    // 6. Verify the edit
    console.log('Step 7: Verifying activity was edited');
    // It should now be visible in the sidebar list with the new subject
    await expect(page.getByText(`${editedSubject}`).first()).toBeVisible();
    console.log('Test finished successfully');
  });

});
