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

async function goToSalesReport(page: Page): Promise<Page> {
	page.getByRole('img', { name: 'Sales', exact: true }).click();
	await page.waitForTimeout(10000);
	return page;
}

async function columnsSelectedCount(page: Page): Promise<number> {
	const columnsSelectedElement = await page.getByText('columns selected');
  const columnsSelectedText = await columnsSelectedElement.innerText();
	const columnsSelectedCount = columnsSelectedText.split(' ')[0];
	console.log(`Columns selected (from text): ${columnsSelectedCount}`);
	const selectedColumnsElement = await page.getByRole('columnheader');
	const selectedColumnsCount = await selectedColumnsElement.count();
	console.log(`Columns selected (from count): ${selectedColumnsCount}`);

	return selectedColumnsCount;
	
}

test.describe('report builder suite', () => {
	test.describe.configure({ timeout: 480000 });

	test('report_builder_test', async ({ page }: { page: Page }) => {
		// Login  
		try {
			await login(page);

			await openMenu(page);

			const reportBuilderPage = await goToReportBuilder(page);

			const salesReportPage = await goToSalesReport(reportBuilderPage);

			const columnsCount = await columnsSelectedCount(salesReportPage);
			console.log(`Columns selected (final count): ${columnsCount}`);
		} catch (error) {
			console.error('Error during test execution:', error);
			throw error;
		}
	});
});