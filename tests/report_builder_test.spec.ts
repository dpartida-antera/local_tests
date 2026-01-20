import { test, expect, type Page } from '@playwright/test';
import { login } from '../helper/auth';

// Constants
const MAX_LOOPS_MULTIPLIER = 5;
const TIMEOUT_NAVIGATION = 7000;
const TIMEOUT_FILTER = 5000;

// Functions
async function goToReportBuilder(page: Page): Promise<Page> {
	// Move mouse to simulate user interaction, then click and wait for popup
	await page.mouse.move(100, 100);
	const reportBuilderElement = page.getByText('bar_chartReports Builder');

	const [page2] = await Promise.all([
		page.waitForEvent('popup'),
		reportBuilderElement.click(),
	]);

	await page2.waitForLoadState();
	return page2;
}

async function openMenu(page: Page): Promise<void> {
	const menuButton = page.locator('mat-toolbar button', { hasText: 'menu' });
	await menuButton.click();
}


test('report_builder_test', async ({ page }: { page: Page }) => {
  // Login  
  test.setTimeout(480000);
  await login(page);
	await openMenu(page);
	const reportBuilderPage = await goToReportBuilder(page);
	// Now interact with the Report Builder page
	await reportBuilderPage.getByRole('img', { name: 'Sales', exact: true }).click();
	await page.waitForTimeout(10000);

});