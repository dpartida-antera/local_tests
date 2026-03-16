import { test, expect, type Page } from '@playwright/test';
import { login } from '../../helper/auth';
import { navigateToReceivingAndOpenOrder } from '../../helper/ui-helpers';
import { openActivitiesSidebar, clickAddActivityButton, fillAndSaveActivity, verifyGlobalActivity, openFirstActivityItem, editAndSaveActivity } from '../../helper/activities-helpers';

test.describe.serial('Order Activities', () => {
  test.describe.configure({ timeout: 350000, retries: 0 });

  let sharedOrderNum: string;

  test('should create an activity for an order in receiving', async ({ page }: { page: Page }) => {
    // 1. Login with specific user
    await login(page);

    // 2. Receiving & Row Selection
    sharedOrderNum = await navigateToReceivingAndOpenOrder(page);

    // 3. Open Activities Sidebar
    await openActivitiesSidebar(page);

    // 4. Add New Activity
    await clickAddActivityButton(page);

    // 5. Fill and Save
    const uniqueSubject = `Test Subject ${Date.now()}`;
    await fillAndSaveActivity(page, uniqueSubject);

    // 6. Verify Global Activities
    await verifyGlobalActivity(page, uniqueSubject);
  });

  test('should edit an activity for an order in receiving', async ({ page }: { page: Page }) => {
    // 1. Login with specific user
    await login(page);

    // 2. Receiving & Row Selection
    // Ensure we have a shared order number from the first test
    if (!sharedOrderNum) {
      throw new Error('sharedOrderNum is not set. The create test must run and succeed first.');
    }

    await navigateToReceivingAndOpenOrder(page, sharedOrderNum);

    // 3. Open Activities Sidebar
    await openActivitiesSidebar(page);

    // 4. Open the first activity
    await openFirstActivityItem(page);

    // 5. Edit and Save
    const editedSubject = `Edited Subject ${Date.now()}`;
    await editAndSaveActivity(page, editedSubject);

    // 6. Verify the edit
    // It should now be visible in the sidebar list with the new subject
    await expect(page.getByText(`${editedSubject}`).first()).toBeVisible();
  });
});
