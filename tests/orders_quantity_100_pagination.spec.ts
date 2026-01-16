import { test, expect, type Page } from '@playwright/test';
import { ConfigLoader } from '../helper/ConfigLoader';

const config = ConfigLoader.loadConfig<{ baseUrl: string; user: string; password: string }>('test-config.json');

// Constants
const MAX_LOOPS_MULTIPLIER = 5;
const TIMEOUT_NAVIGATION = 7000;
const TIMEOUT_FILTER = 5000;

// Helper Functions
async function login(page: Page): Promise<void> {
  await page.goto(`${config.baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Username').fill(config.user);
  await page.getByLabel('Password').fill(config.password);
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForLoadState('networkidle');
}

async function navigateToOrders(page: Page): Promise<void> {
  // Open menu
  const menuButton = page.locator('mat-toolbar button', { hasText: 'menu' });
  await menuButton.click();
  
  // Navigate to Orders
  await page.getByText('view_listOrder').click();
  await page.getByRole('link', { name: /Orders/i }).click();
  
  // Close sidebar overlay
  const sidebarButton = page.locator('fuse-navbar').getByRole('button');
  await sidebarButton.click({ timeout: TIMEOUT_NAVIGATION });
  
  await page.locator('.fuse-sidebar-overlay').click();
  await page.waitForTimeout(5000);
  
  await page.waitForLoadState('networkidle');
}

async function applyBilledStatusFilter(page: Page): Promise<void> {
  // Open filter dropdown (5th filter icon)
  const filterIcon = page.locator('i').nth(5);
  await filterIcon.click({ timeout: TIMEOUT_FILTER });
  await page.waitForTimeout(1000);
  
  // Select filter option
  const selectOptions = page.getByText('Select options').nth(5);
  await selectOptions.click({ timeout: TIMEOUT_FILTER });
  await page.waitForTimeout(1000);
  
	await page.getByText('Select options').nth(5).click();
  await page.locator('.p-ripple > .p-checkbox > .p-checkbox-box').first().click({ timeout: 5000 });
  await page.waitForTimeout(1000);
  
  // Apply filter
  const searchButton = page.getByText('Search', { exact: true });
  await searchButton.click({ timeout: TIMEOUT_FILTER });
  
  // Wait for the table to update with filtered results
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); 
}

async function getTotalEntries(page: Page): Promise<number> {
  // Wait for the page to fully load after filtering
  await page.waitForLoadState('networkidle');
  
  const showingText = page.locator('text=Showing');
  await showingText.waitFor({ timeout: TIMEOUT_FILTER });
  
  const total_entries_text = await showingText.innerText();
  const match = total_entries_text.match(/of\s+(\d+)/);
  
  if (!match) {
    throw new Error(`Could not parse total entries from text: "${total_entries_text}"`);
  }
  
  const total_entries = Number(match[1]);
  console.log(`Total entries: ${total_entries}`);
  return total_entries;
}

async function setPageSize(page: Page, size: number): Promise<void> {
  const dropdown = page.locator('.p-paginator .p-dropdown-trigger');
  await dropdown.click({ timeout: TIMEOUT_NAVIGATION });
  
  const option = page.getByRole('option', { name: size.toString() });
  await option.click({ timeout: TIMEOUT_NAVIGATION });
  
  await page.waitForLoadState('networkidle');
}

async function selectAllRowsOnPage(page: Page): Promise<void> {
  const headerCheckbox = page.locator('th p-tristatecheckbox .p-checkbox-box');
  const isChecked = await headerCheckbox.getAttribute('aria-checked');
  
  if (isChecked !== 'true') {
    await headerCheckbox.click({ timeout: TIMEOUT_NAVIGATION });
  }
}

async function getSelectedEntriesCount(page: Page): Promise<number> {
  const selectedText = page.getByText('Selected:');
  await selectedText.waitFor({ timeout: TIMEOUT_NAVIGATION });
  
  const text = await selectedText.innerText();
  const count = Number(text.split(':')[1].trim());
  
  if (isNaN(count)) {
    throw new Error(`Could not parse selected entries count from text: "${text}"`);
  }
  
  return count;
}

async function goToNextPage(page: Page): Promise<void> {
  const nextButton = page.locator('.p-ripple.p-element.p-paginator-next');
  await nextButton.click({ timeout: TIMEOUT_NAVIGATION });
  await page.waitForLoadState('networkidle');
}


// Main Test
test('orders_quantity_test', async ({ page }: { page: Page }) => {
  test.setTimeout(480000);

  try {
    // Login
    await login(page);

    // Navigate to Orders
    await navigateToOrders(page);

    // Apply filter for Billed status
    await applyBilledStatusFilter(page);

    // Get total entries
    const total_entries = await getTotalEntries(page);

    // Hard-coded single page size
    const PAGE_SIZE = 100;
    console.log(`Testing hard-coded page size: ${PAGE_SIZE}`);

    console.log(`\n========== Testing with page size: ${PAGE_SIZE} ==========`);

    // Set page size
    await setPageSize(page, PAGE_SIZE);

    let processed_entries = 0;
    let loop_counter = 0;
    const max_loops = Math.ceil(total_entries / PAGE_SIZE) + MAX_LOOPS_MULTIPLIER;

    while (processed_entries < total_entries) {
      loop_counter++;

      if (loop_counter > max_loops) {
        throw new Error(
          `Exceeded maximum loop count of ${max_loops}. ` +
          `Processed: ${processed_entries}, Total: ${total_entries}`
        );
      }

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Select all rows on current page
      await selectAllRowsOnPage(page);

      // Get number of selected entries
      const entries_in_page = await getSelectedEntriesCount(page);
      console.log(`Loop ${loop_counter}: Entries in page: ${entries_in_page}`);

      // Verify page count matches expected
      const remaining_entries = total_entries - processed_entries;
      const expected_entries = remaining_entries >= PAGE_SIZE ? PAGE_SIZE : remaining_entries;

      expect(entries_in_page).toBe(expected_entries);

      processed_entries += entries_in_page;
      console.log(`Processed entries: ${processed_entries} / ${total_entries}`);

      // Go to next page if needed
      if (processed_entries < total_entries) {
        await goToNextPage(page);
      }
    }

    console.log(`✓ Test passed for page size: ${PAGE_SIZE}`);

    console.log('\n========== Pagination test completed successfully! ==========');
  } catch (error) {
    console.error('Test failed with error:', error);
    throw error;
  }
});

