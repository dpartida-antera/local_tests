import { test, expect, type Page } from '@playwright/test';
import { login } from '../../helper/auth';
import { navigateToModule, performSearchInModule } from '../../helper/ui-helpers';
import { navigateToOrdersDirectly, openOrderDetailPageViaMenu } from '../../helper/orders';
import { modifyModuleTags, modifyModuleTagsMachineView, searchByTagAndOrder, modifyModuleTagsStatusView } from '../../helper/production-helpers';

test.describe('receiving suite', () => {
  test.describe.configure({ timeout: 350000, retries: 0 });

  test.describe.serial('Production Tags', () => {
    const orderNumber = '55975';

    test('should add tags to production', async ({ page }: { page: Page }) => {
      await login(page);
      await navigateToOrdersDirectly(page);

      const orderPage = await openOrderDetailPageViaMenu(page, orderNumber);
      await expect(orderPage.getByRole('heading', { name: 'Basic Order Info' })).toBeVisible({ timeout: 15000 });
      await orderPage.getByRole('button', { name: 'Actions' }).click();
      await orderPage.getByRole('menuitem', { name: 'Update Production' }).click();
      await orderPage.getByRole('button', { name: 'Production Refresh' }).click();
      await orderPage.waitForLoadState('networkidle');

      await page.bringToFront();
      await navigateToModule(page, 'productions');
      await performSearchInModule(page, orderNumber);
      await modifyModuleTags(page, 'Add Module Tags', 'Fast Production', 'Add');
      await searchByTagAndOrder(page, 'Fast Production', orderNumber);
      await expect(page.locator('tbody')).toContainText(orderNumber);
    });

    test('should remove tags from production', async ({ page }: { page: Page }) => {
      await login(page);
      await navigateToModule(page, 'productions');
      await performSearchInModule(page, orderNumber);
      await modifyModuleTags(page, 'Remove Module Tags', 'Fast Production', 'Save');
      await searchByTagAndOrder(page, 'Fast Production', orderNumber);
      await expect(page.locator('tbody')).not.toContainText(orderNumber);
    });

    const setupProductionTagsTest = async (page: Page) => {
      await login(page);
      await navigateToModule(page, 'productions');
      await expect(page.getByRole('progressbar').first()).not.toBeVisible({ timeout: 40000 });

      await performSearchInModule(page, orderNumber);
      await page.waitForTimeout(6000);
    };

    const views = [
      { name: 'Machine View', modifyFunc: modifyModuleTagsMachineView, expectedRemoveText: 'Pending (8h) 0 Jobs 0 Pieces' },
      { name: 'Status View', modifyFunc: modifyModuleTagsStatusView, expectedRemoveText: 'Pending 0 Jobs 0 Pieces' }
    ];

    for (const { name, modifyFunc, expectedRemoveText } of views) {
      test(`should add tags to production in ${name}`, async ({ page }: { page: Page }) => {
        await setupProductionTagsTest(page);
        await modifyFunc(page, 'Add Module Tags', 'Fast Production', 'Add');
        await searchByTagAndOrder(page, 'Fast Production', orderNumber);
        await expect(page.getByText('Order#').nth(1)).toBeVisible();
      });

      test(`should remove tags to production in ${name}`, async ({ page }: { page: Page }) => {
        await setupProductionTagsTest(page);
        await modifyFunc(page, 'Remove Module Tags', 'Fast Production', 'Save');
        await searchByTagAndOrder(page, 'Fast Production', orderNumber);
        await expect(page.getByText(expectedRemoveText)).toBeVisible({ timeout: 25000 });
      });
    }
  });
});
