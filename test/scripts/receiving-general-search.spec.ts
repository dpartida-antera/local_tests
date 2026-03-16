import { test, type Page } from '@playwright/test';
import { login } from '../../helper/auth';
import { navigateToModule, waitForLoader, searchByFirstColumnValue } from '../../helper/ui-helpers';

test.describe('receiving suite', () => {
  test.describe.configure({ timeout: 350000, retries: 0 });

  // Verifies the general search works by picking the first Order # from the table and searching it
  test('receiving_general_search', async ({ page }: { page: Page }) => {
    await login(page);
    await navigateToModule(page, 'receiving');
    await waitForLoader(page);
    await page.waitForTimeout(2000);
    await searchByFirstColumnValue(page, 'Order #');
  });
});
