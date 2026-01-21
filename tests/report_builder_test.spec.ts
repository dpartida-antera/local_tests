import { test, expect, type Page } from '@playwright/test';
import { login } from '../helper/auth';
import { setPageSize, getTableRowCount, verifyPageSize } from '../helper/pagination';

// Constants
const MAX_LOOPS_MULTIPLIER = 5;
const TIMEOUT_NAVIGATION = 7000;
const TIMEOUT_FILTER = 5000;
const PAGE_SIZE = 100;

// I'm excluding these columns because I don't have an endpoint to get the labels from Customers, only orders.
const EXCLUDED_COLUMNS = [
	"Account #",
	"Add Ons Cost",
	"Add Ons Total",
	"Balance",
	"Billing Customer Email",
	"Booked Date",
	"Contact Email",
	"Customer",
	"Decoration Cost",
	"Decoration Total",
	"Difference Regular To Vouched Cost",
	"Freight Cost",
	"Freight Total",
	"Gross Profit Percent",
	"Invoice Date",
	"Is Tax Exempt",
	"MAS #",
	"Non Taxable Amount",
	"Order Subtotal",
	"Order Total",
	"Payment Amount",
	"Payment Date",
	"Payment Method",
	"Payment Status",
	"Product Cost",
	"Product Total",
	"Production Manager Email",
	"Production Manager Phone",
	"Proforma Date",
	"Sales Person Mobile",
	"Sales Tax",
	"Shipping Account Number",
	"Shipping Customer Email",
	"Tax Exemption Reason",
	"Taxable Amount",
	"Tracking Number",
	"Transaction Number",
	"Vouched Cost",
	"Vouched Gross Profit",
	"Vouched Gross Profit Percent",
	"Workflow Status"
];

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

async function fetchFieldsFromAPI(): Promise<string[]> {
	// Postman puts ODI2YjBkZTBkYjE2 as username, then encodes "username:" for Basic Auth
	const username = 'ODI2YjBkZTBkYjE2';
	const auth = Buffer.from(`${username}:`).toString('base64');
	
	const response = await fetch(
		'https://dev.anterasaas.com/protected/api/v1/orders/fields',
		{
			method: 'GET',
			headers: {
				Authorization: `Basic ${auth}`,
			}
		}
	);
	
	if (!response.ok) {
		const errorText = await response.text();
		console.error(`API error response: ${errorText}`);
		throw new Error(`API request failed with status ${response.status}: ${errorText}`);
	}
	
	const data = await response.json();
	const labelNames = data.map((field: any) => field.labelName);
	console.log(`API returned ${labelNames.length} field labels`);
	return labelNames;
}

async function compareColumnsWithAPI(page: Page): Promise<void> {
	// Get all column names from the UI
	await page.locator('.p-multiselect-trigger').click();
	await page.waitForTimeout(1000);
	await page.getByRole('listitem').first().waitFor({ state: 'visible', timeout: 5000 });
	
	const columnTexts = await page.getByRole('listitem').allTextContents();
	const columnNames = columnTexts.map(text => text.trim()).filter(text => text.length > 0);
	console.log(`UI columns (${columnNames.length}): ${columnNames.join(', ')}`);
	
	await page.locator('p-multiselect').click(); // Close the dropdown
	await page.waitForTimeout(500);
	
	// Filter out excluded columns
	const columnsToCheck = columnNames.filter(col => !EXCLUDED_COLUMNS.includes(col));
	console.log(`Checking ${columnsToCheck.length} columns (${columnNames.length - columnsToCheck.length} excluded)`);
	
	// Get field names from API
	const apiLabelNames = await fetchFieldsFromAPI();
	
	// Check if all UI columns exist in API response
	const missingColumns: string[] = [];
	for (const columnName of columnsToCheck) {
		if (!apiLabelNames.includes(columnName)) {
			missingColumns.push(columnName);
		}
	}
	
	if (missingColumns.length > 0) {
		console.error(`Columns not found in API (${missingColumns.length}): ${missingColumns.join(', ')}`);
		expect(missingColumns).toEqual([]);
	}
	
	console.log('All UI columns are present in the API response ✓');
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

async function getRandomCheckboxIndices(page: Page, count: number, checkedOnly: boolean = false): Promise<number[]> {
	const listItems = await page.getByRole('listitem').all();
	const validIndices: number[] = [];
	
	if (checkedOnly) {
		// Find all checked items
		for (let i = 0; i < listItems.length; i++) {
			const checkbox = listItems[i].locator('.p-checkbox-checked, [aria-checked="true"]').first();
			if (await checkbox.count() > 0) {
				validIndices.push(i);
			}
		}
	} else {
		// Use all indices
		validIndices.push(...Array.from({ length: listItems.length }, (_, i) => i));
	}
	
	// Randomly select up to 'count' items
	const randomIndices = new Set<number>();
	while (randomIndices.size < Math.min(count, validIndices.length)) {
		randomIndices.add(validIndices[Math.floor(Math.random() * validIndices.length)]);
	}
	
	return Array.from(randomIndices);
}

async function toggleRandomCheckboxes(page: Page, count: number = 12, checkedOnly: boolean = false): Promise<void> {
	await page.locator('.p-multiselect-trigger').click();
	await page.waitForTimeout(1000);
	
	const listItems = await page.getByRole('listitem').all();
	const randomIndices = await getRandomCheckboxIndices(page, count, checkedOnly);
	
	for (const index of randomIndices) {
		const listItem = listItems[index];
		const checkbox = listItem.locator('.p-checkbox, .p-checkbox-box, input[type="checkbox"]').first();
		await (await checkbox.count() > 0 ? checkbox.click({ timeout: TIMEOUT_NAVIGATION }) : listItem.click({ timeout: TIMEOUT_NAVIGATION }));
		console.log(`${checkedOnly ? 'Un' : ''}toggled checkbox at index ${index}`);
		await page.waitForTimeout(500);
	}
	
	await page.locator('p-multiselect').click();
	await page.waitForTimeout(1000);
}

async function testPaginationWithPageSize(page: Page, pageSize: number): Promise<void> {
	await setPageSize(page, pageSize);
	
	const rowCount = await getTableRowCount(page);
	console.log(`Pagination test - Page size: ${pageSize}, Actual rows: ${rowCount}`);
	
	expect(rowCount).toBe(pageSize);
	console.log(`✓ Page size ${pageSize} verified with ${rowCount} table rows`);
}

// New helper: get 5 random order numbers from first cell (skip first row)
// Modified to also include row index in the result
async function getRandomOrderNumbers(page: Page, count: number = 5): Promise<{ index: number; orderNumber: string }[]> {
	const rows = page.locator('table tbody tr');
	await rows.first().waitFor({ state: 'visible', timeout: 5000 });

	const total = await rows.count();
	if (total <= 1) {
		console.warn('No data rows available to sample.');
		return [];
	}

	// Skip the first row
	const selectable = Array.from({ length: total - 1 }, (_, i) => i + 1);
	const toPick = Math.min(count, selectable.length);
	const picked = new Set<number>();
	while (picked.size < toPick) {
		picked.add(selectable[Math.floor(Math.random() * selectable.length)]);
	}

	const selectedRows: { index: number; orderNumber: string }[] = [];
	for (const idx of picked) {
		const firstCell = rows.nth(idx).locator('td').first();
		const orderNumber = (await firstCell.innerText()).trim();
		selectedRows.push({ index: idx, orderNumber });
	}

	console.log(
		`Random selections (${selectedRows.length}): ` +
		selectedRows.map(r => `row ${r.index} -> ${r.orderNumber}`).join(', ')
	);
	return selectedRows;
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

			await testPaginationWithPageSize(salesReportPage, PAGE_SIZE);

			// Get 5 random rows: index and first td (order number), skipping the first row
			const rowsWithOrders = await getRandomOrderNumbers(salesReportPage, 5);

			// Loop to process each selected row
			for (const { index, orderNumber } of rowsWithOrders) {
				// TODO: do something with each row and order number
				console.log(`Processing row ${index} with order ${orderNumber}`);
			}

			await columnsSelectedCount(salesReportPage);
			
			await checkColumnNames(salesReportPage);

			await toggleRandomCheckboxes(salesReportPage, 12);
			
			await checkColumnNames(salesReportPage);

			await compareColumnsWithAPI(salesReportPage);
			
			await selectAllColumns(salesReportPage);
			
			await checkColumnNames(salesReportPage);

		} catch (error) {
			console.error('Error during test execution:', error);
			throw error;
		}
	});
});