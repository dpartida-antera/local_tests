import { test, expect, type Page } from '@playwright/test';
import { ConfigLoader } from '../helper/ConfigLoader';

const config = ConfigLoader.loadConfig<{ baseUrl: string; user: string; password: string }>('test-config.json');
test('orders_quantity_test', async ({ page }: { page: Page }) => {
  test.setTimeout(480000); // increase timeout for large datasets

  // Login
  await page.goto(`${config.baseUrl}/login`);
  await page.getByLabel('Username').fill(config.user);
  await page.getByLabel('Password').fill(config.password);
  await page.getByLabel('LOGIN').click();

  // Navigate to Orders
  await page.locator('mat-toolbar button', { hasText: 'menu' }).click();
  await page.getByText('view_listOrder').click();
  await page.getByRole('link', { name: 'Orders' }).click();
  await page.locator('fuse-navbar').getByRole('button').click();
  await page.locator('.fuse-sidebar-overlay').click();
  await page.waitForTimeout(3000);

	// Filter by something to ensure enough entries but not so many
	// Filter by Status = Billed
  await page.locator('i').nth(5).click();
	await page.waitForTimeout(3000);
  await page.getByText('Select options').nth(5).click();
	await page.getByText('Select options').nth(5).click();
  await page.locator('.p-ripple > .p-checkbox > .p-checkbox-box').first().click();
  await page.waitForTimeout(1000);
	await page.getByText('Search', { exact: true }).click();
  await page.waitForTimeout(2000);
	
  // Get total entries
  const showingText = page.locator('text=Showing');
  const total_entries_text = await showingText.innerText();
  const match = total_entries_text.match(/of\s+(\d+)/);
  if (!match) throw new Error('Could not determine total entries!');
  const total_entries = Number(match[1]);
  console.log('Total entries: ' + total_entries);

  // Set page size to 100
  await page.locator('.p-dropdown-trigger').click();
  await page.getByRole('option', { name: '100' }).click();

  // Loop through pages
  let processed_entries = 0;
  const page_size = 100;
  let loop_counter = 0;
  const max_loops = Math.ceil(total_entries / page_size) + 5; // safety to prevent infinite loop

  while (processed_entries < total_entries) {
    loop_counter++;
    if (loop_counter > max_loops) throw new Error('Too many loops! Possible infinite loop.');
		await page.waitForTimeout(5000); // wait for page to load
    // Click only the header checkbox (select all rows on this page)
    const headerCheckbox = page.locator('th p-tristatecheckbox .p-checkbox-box');
    const isChecked = await headerCheckbox.getAttribute('aria-checked');
    if (isChecked !== 'true') {
      await headerCheckbox.click();
    }

    // Get number of selected entries
    const entries_in_page_text = await page.getByText('Selected:').innerText();
    const entries_in_page = Number(entries_in_page_text.split(':')[1].trim());
    console.log(`Entries in page: ${entries_in_page}`);

    // Ensure last page count is correct
    const remaining_entries = total_entries - processed_entries;
    const expected_entries = remaining_entries >= page_size ? page_size : remaining_entries;
    expect(entries_in_page).toBe(expected_entries);

    processed_entries += entries_in_page;
    console.log(`Processed entries: ${processed_entries} / ${total_entries}`);

    // Go to next page if needed
    if (processed_entries < total_entries) {
      await page.locator('.p-ripple.p-element.p-paginator-next').click();
    }
  }

  console.log('Test successfully executed!');
});

