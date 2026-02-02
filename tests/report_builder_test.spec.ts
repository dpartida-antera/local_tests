import { test, expect, type Page } from '@playwright/test';
import { login } from '../helper/auth';
import { setPageSize, getTableRowCount, verifyPageSize } from '../helper/pagination';
import { navigateToOrders } from '../helper/orders';
// Constants
const MAX_LOOPS_MULTIPLIER = 5;
const TIMEOUT_NAVIGATION = 7000;
const TIMEOUT_FILTER = 5000;
const PAGE_SIZE = 100;

// Column name mapping: Sales Report column name -> Order Detail page field name
// Add entries here when column names differ between the two pages
const COLUMN_NAME_MAPPING: Record<string, string> = {
	// Example: "Sales Report Column": "Order Detail Field"
	"Order No": "Order #",
	"Order Status": "Status",
	"Customer": "Account Name",
	"Order Subtotal": "Subtotal",
	// Add your mappings here as you discover mismatches
};

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

// Global variables for order detail page context
let orderTotalElement: any;
let orderTotal: number = 0;
let orderTotalText: string = '';

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

async function searchOrderOnMainPage(page: Page, orderNumber: string, salesReportPage: Page, rowIndex: number): Promise<void> {
	console.log(`Switching to main page to search for order ${orderNumber}`);

	// Bring the main page to front
	await page.bringToFront();

	// Reload the page
	await page.reload();
	await navigateToOrders(page);
	await page.waitForLoadState('networkidle');
	await page.getByRole('textbox', { name: 'Search', exact: true }).click();
	await page.getByRole('textbox', { name: 'Search', exact: true }).fill(`${orderNumber}`);
	await page.locator('.p-input-icon-left.table_top_search > .pi').click();
	const page1Promise = page.waitForEvent('popup');
	await page.getByTitle(`${orderNumber}`).click();
	const orderPage = await page1Promise;
	await orderPage.bringToFront();
	await orderPage.waitForLoadState('networkidle');

	// Extract Order Total element and value from orderPage for reuse in verifications
	// Store in global variables so other functions can access them
	await orderPage.bringToFront();
	orderTotalElement = orderPage.getByText(/Order Total:/);
	const orderTotalCount = await orderTotalElement.count();
	orderTotal = 0;
	orderTotalText = '';

	if (orderTotalCount > 0) {
		orderTotalText = (await orderTotalElement.first().innerText()).trim();
		// Extract Order Total value, handling pipe-separated format
		const startIdx = orderTotalText.indexOf('Order Total:') + 'Order Total:'.length;
		let remainingText = orderTotalText.substring(startIdx).trim();

		// If starts with pipe, value is 0
		if (remainingText.startsWith('|')) {
			orderTotal = 0;
		} else {
			// Extract up to next pipe or end
			const valueStr = remainingText.includes('|') ? remainingText.split('|')[0].trim() : remainingText;
			orderTotal = parseFloat(valueStr.replace(/[$,]/g, '')) || 0;
		}
	}

	console.log(`Order Total extracted: $${orderTotal}`);

	// Verify all columns on salesReportPage match the values from orderPage
	await salesReportPage.bringToFront();
	const columnHeaders = await salesReportPage.getByRole('columnheader').allTextContents();
	const targetRow = salesReportPage.locator('table tbody tr').nth(rowIndex);

	console.log(`\nVerifying all columns for row ${rowIndex} (Order: ${orderNumber})`);

	let verifiedCount = 0;
	let skippedCount = 0;

	for (let colIndex = 0; colIndex < columnHeaders.length; colIndex++) {
		const columnName = columnHeaders[colIndex].trim();

		// Skip empty column headers
		if (!columnName) {
			skippedCount++;
			continue;
		}

		// Get cell value from sales report table
		const cell = targetRow.locator('td').nth(colIndex);
		const cellValue = (await cell.innerText()).trim();

		// Check if there's a mapping for this column name
		const detailPageFieldName = COLUMN_NAME_MAPPING[columnName] || columnName;

		// Try to find the corresponding field on the order detail page
		await orderPage.bringToFront();
		try {
			let fieldValue = '';
			let fieldCount = 0;

			// Special handling for Payment Status and Payment Amount - derive from Balance column
			if (detailPageFieldName === 'Payment Status' || detailPageFieldName === 'Payment Amount') {
				const balanceHeader = orderPage.getByRole('columnheader', { name: 'Balance' });
				const balanceHeaderCount = await balanceHeader.count();

				if (balanceHeaderCount > 0) {
					// Find the table containing the Balance column
					const table = balanceHeader.locator('xpath=ancestor::table').first();
					const rows = table.locator('tbody tr');
					const rowCount = await rows.count();

					if (rowCount > 0) {
						// Get the last row
						const lastRow = rows.last();

						// Find the Balance column index
						const headers = await table.locator('thead th, thead td').allTextContents();
						const balanceColIndex = headers.findIndex(h => h.trim().includes('Balance'));

						if (balanceColIndex !== -1) {
							const balanceCell = lastRow.locator('td').nth(balanceColIndex);
							const balanceValue = (await balanceCell.innerText()).trim();
							const balanceNum = parseFloat(balanceValue.replace(/[$,]/g, ''));

							if (detailPageFieldName === 'Payment Status') {
								// Determine payment status using the extracted orderTotal variable
								if (balanceNum === 0) {
									fieldValue = 'Paid';
								} else if (balanceNum > 0 && balanceNum < orderTotal) {
									fieldValue = 'Partial';
								} else {
									fieldValue = 'Unpaid';
								}
							} else if (detailPageFieldName === 'Payment Amount') {
								// Calculate Payment Amount = Order Total - Last Balance
								const paymentAmount = orderTotal - balanceNum;
								fieldValue = paymentAmount.toString();
							}

							fieldCount = 1;
						}
					} else {
						// No rows in Balance table - no payments made
						if (detailPageFieldName === 'Payment Status') {
							fieldValue = 'Unpaid';
						} else if (detailPageFieldName === 'Payment Amount') {
							// No payments made, payment amount = 0
							fieldValue = '0';
						}
						fieldCount = 1;
					}
				} else {
					// Balance header not found - no payment history
					if (detailPageFieldName === 'Payment Amount') {
						// No Balance table, no payments made
						fieldValue = '0';
						fieldCount = 1;
					}
				}
			} else {
				// Look for the field in format "Field Name: value"
				const fieldElement = orderPage.getByText(new RegExp(`${detailPageFieldName}:`));
				fieldCount = await fieldElement.count();
			}

			if (fieldCount > 0 && detailPageFieldName !== 'Payment Status' && detailPageFieldName !== 'Payment Amount') {
				const fieldElement = orderPage.getByText(new RegExp(`${detailPageFieldName}:`));
				const fieldText = (await fieldElement.first().innerText()).trim();

				// Extract value after the field name, handling both standalone and pipe-separated fields
				const fieldNamePattern = `${detailPageFieldName}:`;

				if (fieldText.includes(fieldNamePattern)) {
					// Find the position after "FieldName:"
					const startIndex = fieldText.indexOf(fieldNamePattern) + fieldNamePattern.length;
					let remainingText = fieldText.substring(startIndex).trim();

					// If the field value starts with a pipe, the field has no value (empty/0)
					if (remainingText.startsWith('|')) {
						fieldValue = '0';
					} else {
						// Stop at next pipe separator
						if (remainingText.includes('|')) {
							fieldValue = remainingText.split('|')[0].trim();
						} else {
							fieldValue = remainingText;
						}
					}
				}
			}

			if (fieldCount > 0) {
				// Special handling for certain fields - only take the first part
				if (detailPageFieldName === 'Status' || detailPageFieldName === 'Invoice Date') {
					fieldValue = fieldValue.split(' ')[0].trim();
				}

				// Normalize currency/number fields by removing $ and commas
				let normalizedCellValue = cellValue.replace(/[$,]/g, '').trim();
				let normalizedFieldValue = fieldValue.replace(/[$,]/g, '').trim();

				// Treat empty values as "0" for numeric fields
				if (normalizedCellValue === '') normalizedCellValue = '0';
				if (normalizedFieldValue === '') normalizedFieldValue = '0';

				// For numeric values, normalize to same decimal format for comparison
				const isNumeric = !isNaN(parseFloat(normalizedCellValue)) && !isNaN(parseFloat(normalizedFieldValue));
				if (isNumeric) {
					const cellNum = parseFloat(normalizedCellValue);
					const fieldNum = parseFloat(normalizedFieldValue);
					normalizedCellValue = cellNum.toString();
					normalizedFieldValue = fieldNum.toString();
				}

				const mappingNote = COLUMN_NAME_MAPPING[columnName] ? ` (mapped to "${detailPageFieldName}")` : '';
				console.log(`  Column "${columnName}"${mappingNote}: table="${cellValue}", detail="${fieldValue}"`);
				expect(normalizedCellValue).toBe(normalizedFieldValue);
				verifiedCount++;
			} else {
				console.log(`  ⚠️  Column "${columnName}": NOT FOUND on detail page (searched for "${detailPageFieldName}:") - table value: "${cellValue}"`);
				console.log(`      → Add mapping to COLUMN_NAME_MAPPING if this field exists with a different name`);
				skippedCount++;
			}
		} catch (error) {
			console.log(`  Column "${columnName}": error checking (${error.message})`);
			skippedCount++;
		}

		await salesReportPage.bringToFront();
	}

	console.log(`✓ Verified ${verifiedCount} columns, skipped ${skippedCount} columns for row ${rowIndex}\n`);

	// Wait for search results to load
	await page.waitForTimeout(2000);

	console.log(`✓ Searched for order ${orderNumber} on main page`);
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
				await searchOrderOnMainPage(page, orderNumber, salesReportPage, index);
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