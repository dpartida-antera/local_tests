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
	// await page.waitForTimeout(10000);
	return page;
}

async function columnsSelectedCount(page: Page): Promise<void> {
	const columnsSelectedElement = await page.getByText('columns selected');
  const columnsSelectedText = await columnsSelectedElement.innerText();
	const columnsSelectedCount = Number(columnsSelectedText.split(' ')[0]);
	console.log(`Columns selected (from text): ${columnsSelectedCount}`);
	const selectedColumnsElement = await page.getByRole('columnheader');
	const selectedColumnsCount = await selectedColumnsElement.count();
	console.log(`Columns selected (from count): ${selectedColumnsCount}`);
	expect(columnsSelectedCount).toBe(selectedColumnsCount);
	
}

async function selectAllColumns(page: Page): Promise<void> {
	await page.locator('.p-multiselect-trigger').click();
  await page.getByRole('checkbox').nth(1).click();
	await page.locator('p-multiselect').click(); // Close the dropdown
	await page.waitForTimeout(2000); // Wait for the UI to update
	await columnsSelectedCount(page);

}

async function checkColumnNames(page: Page): Promise<void> {
	await page.locator('.p-multiselect-trigger').click();
	await page.waitForTimeout(1000); // Wait for dropdown to open
	
	// Wait for list items to be visible
	await page.getByRole('listitem').first().waitFor({ state: 'visible', timeout: 5000 });
	
	const columnHeaderTexts = await page.getByRole('columnheader').allTextContents();
	console.log(`Column headers (${columnHeaderTexts.length}): ${columnHeaderTexts.join(', ')}`);
	
	// Try different checkbox selectors
	const checkedItemTexts = await page.getByRole('listitem').filter({ has: page.locator('.p-checkbox-checked, [aria-checked="true"]') }).allTextContents();
	console.log(`Checked items (${checkedItemTexts.length}): ${checkedItemTexts.join(', ')}`);
	
	await page.locator('p-multiselect').click(); // Close the dropdown
	await page.waitForTimeout(500);
	
	const trimmedChecked = checkedItemTexts.map(text => text.trim()).sort();
	const trimmedHeaders = columnHeaderTexts.map(text => text.trim()).sort();
	expect(trimmedChecked).toEqual(trimmedHeaders);
}

async function toggleRandomCheckboxes(page: Page, count: number = 8): Promise<void> {
	await page.locator('.p-multiselect-trigger').click();
	await page.waitForTimeout(1000); // Wait for dropdown to open
	
	const listItems = await page.getByRole('listitem').all();
	const randomIndices = new Set<number>();
	
	while (randomIndices.size < Math.min(count, listItems.length)) {
		randomIndices.add(Math.floor(Math.random() * listItems.length));
	}
	
	for (const index of randomIndices) {
		// Try clicking the checkbox div or the list item itself
		const listItem = listItems[index];
		const checkbox = listItem.locator('.p-checkbox, .p-checkbox-box, input[type="checkbox"]').first();
		
		// Check if checkbox exists, otherwise click the list item
		const checkboxCount = await checkbox.count();
		if (checkboxCount > 0) {
			await checkbox.click();
		} else {
			await listItem.click();
		}
		
		console.log(`Toggled checkbox at index ${index}`);
		await page.waitForTimeout(300); // Small delay between clicks
	}
	
	await page.locator('p-multiselect').click(); // Close the dropdown
	await page.waitForTimeout(1000); // Wait for UI to update
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

			await columnsSelectedCount(salesReportPage);
			
			await checkColumnNames(salesReportPage);

			await toggleRandomCheckboxes(salesReportPage, 8);
			
			await checkColumnNames(salesReportPage);
			
			await selectAllColumns(salesReportPage);
						

		} catch (error) {
			console.error('Error during test execution:', error);
			throw error;
		}
	});
});