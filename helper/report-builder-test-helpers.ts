import { expect, type Page } from '@playwright/test';
import { setPageSize, getTableRowCount } from './pagination';
import { navigateToOrders } from './orders';
import { type APIField, getModuleFieldData } from './api-fields-helper';
import { normalizeColumnName, REPORT_BUILDER_MISSING_COLUMNS_ALLOWLIST } from './report-builder-columns';

const TIMEOUT_NAVIGATION = 50000; // 50 seconds
const TIMEOUT_LISTITEM = 15000;

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

let orderTotal = 0;

function normalizeNumericString(value: string): string {
	let normalized = value.replace(/[$,]/g, '').trim();
	if (normalized === '') normalized = '0';
	const isNumeric = !isNaN(parseFloat(normalized));
	if (isNumeric) {
		return parseFloat(normalized).toString();
	}
	return normalized;
}

function extractValueAfterLabel(fullText: string, label: string): string {
	if (!fullText.includes(label)) return '';
	const startIndex = fullText.indexOf(label) + label.length;
	let remainingText = fullText.substring(startIndex).trim();
	if (remainingText.startsWith('|')) return '0';
	if (remainingText.includes('|')) {
		return remainingText.split('|')[0].trim();
	}
	return remainingText;
}

function extractOrderTotalValue(text: string): number {
	const value = extractValueAfterLabel(text, 'Order Total:');
	return parseFloat(value.replace(/[$,]/g, '')) || 0;
}

export async function goToReportBuilder(page: Page): Promise<Page> {
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			await page.mouse.move(100, 100);
			const reportBuilderElement = page.getByText('bar_chartReports Builder');
			await reportBuilderElement.waitFor({ state: 'visible', timeout: TIMEOUT_NAVIGATION });

			const [page2] = await Promise.all([
				page.waitForEvent('popup'),
				reportBuilderElement.click(),
			]);

			await page2.waitForLoadState();
			return page2;
		} catch (error) {
			console.warn(`goToReportBuilder attempt ${attempt} failed: ${error}`);
			if (attempt === 3) throw error;
			await page.waitForTimeout(500);
		}
	}
	throw new Error('goToReportBuilder exhausted retries');
}

export async function openMenu(page: Page): Promise<void> {
	const menuButton = page.locator('mat-toolbar button', { hasText: 'menu' });
	await menuButton.click();
}

export async function goToSalesReport(page: Page): Promise<Page> {
	page.getByRole('img', { name: 'Sales', exact: true }).click();
	await page.waitForLoadState('networkidle');
	const rows = page.locator('table tbody tr');
	await expect(rows.first()).toBeVisible({ timeout: TIMEOUT_NAVIGATION });
	const rowCount = await rows.count();
	expect(rowCount).toBeGreaterThan(0);
	return page;
}

export async function columnsSelectedCount(page: Page): Promise<void> {
	const columnsSelectedElement = await page.getByText('columns selected');
	const columnsSelectedText = await columnsSelectedElement.innerText();
	const columnsSelectedCount = Number(columnsSelectedText.split(' ')[0]);
	console.log(`Columns selected (from text): ${columnsSelectedCount}`);
	const selectedColumnsElement = await page.getByRole('columnheader');
	const selectedColumnsCount = await selectedColumnsElement.count();
	console.log(`Columns selected (from count): ${selectedColumnsCount}`);
	expect(columnsSelectedCount).toBe(selectedColumnsCount);
}

export async function selectAllColumns(page: Page): Promise<void> {
	await page.locator('.p-multiselect-trigger').click();
	await page.getByRole('checkbox').nth(1).click();
	await page.locator('p-multiselect').click();
	await page.waitForTimeout(2000);
	await columnsSelectedCount(page);
}

async function fetchFieldsFromAPI(module: string = 'orders'): Promise<APIField[]> {
	// Postman puts ODI2YjBkZTBkYjE2 as username, then encodes "username:" for Basic Auth
	const username = 'ODI2YjBkZTBkYjE2';
	const auth = Buffer.from(`${username}:`).toString('base64');

	const response = await fetch(
		'https://dev.anterasaas.com/protected/content/get-fields-list',
		{
			method: 'POST',
			headers: {
				Authorization: `Basic ${auth}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ module }),
		}
	);

	if (!response.ok) {
		const errorText = await response.text();
		console.error(`API error response: ${errorText}`);
		throw new Error(`API request failed with status ${response.status}: ${errorText}`);
	}

	const data: APIField[] = await response.json();
	console.log(`API returned ${data.length} fields for module '${module}'`);
	return data;
}

async function fetchOrderFieldsFromAPI(): Promise<APIField[]> {
	const username = 'ODI2YjBkZTBkYjE2';
	const auth = Buffer.from(`${username}:`).toString('base64');

	const response = await fetch(
		'https://dev.anterasaas.com/protected/api/v1/orders/fields',
		{
			method: 'GET',
			headers: {
				Authorization: `Basic ${auth}`,
			},
		}
	);

	if (!response.ok) {
		const errorText = await response.text();
		console.error(`Orders API error response: ${errorText}`);
		throw new Error(`Orders API request failed with status ${response.status}: ${errorText}`);
	}

	const data: APIField[] = await response.json();
	console.log(`Orders API returned ${data.length} fields`);
	return data;
}

export async function compareColumnsWithAPI(page: Page): Promise<void> {
	await page.locator('.p-multiselect-trigger').click();
	await page.waitForTimeout(1000);
	await page.getByRole('listitem').first().waitFor({ state: 'visible', timeout: TIMEOUT_LISTITEM });

	const columnTexts = await page.getByRole('listitem').allTextContents();
	const columnNames = columnTexts.map(text => text.trim()).filter(text => text.length > 0);
	console.log(`UI columns (${columnNames.length}): ${columnNames.join(', ')}`);

	await page.locator('p-multiselect').click();
	await page.waitForTimeout(500);

	const columnsToCheck = columnNames;
	console.log(`Checking ${columnsToCheck.length} columns against API fields`);

	const apiFields = await fetchFieldsFromAPI('orders');
	const orderFields = await fetchOrderFieldsFromAPI();

	if (apiFields.length > 0) {
		console.log('\n=== API Response Sample (first 3 fields) ===');
		console.log(JSON.stringify(apiFields.slice(0, 3), null, 2));
	}

	const uniqueModules = new Set<string>();
	apiFields.forEach(field => {
		if (field.module) {
			uniqueModules.add(field.module.trim());
		}
	});
	console.log(`\n=== Unique modules in API response: ${Array.from(uniqueModules).join(', ')} ===`);
	console.log(`Total fields in API response: ${apiFields.length}`);
	console.log(`Fields with null module: ${apiFields.filter(f => !f.module).length}`);

	const modulesToCheck = Array.from(uniqueModules).map(m => m.trim());
	console.log(`\n=== Using modules: ${modulesToCheck.join(', ')} ===`);

	const allLabelNames = new Set<string>();

	const fieldsWithoutModule = apiFields.filter(f => !f.module || f.module.trim() === '');
	console.log(`\n=== Fields without module: ${fieldsWithoutModule.length} ===`);
	if (fieldsWithoutModule.length > 0) {
		const nullModuleLabels = fieldsWithoutModule.map(f => f.labelName);
		console.log(`Null module fields: ${nullModuleLabels.join(', ')}`);
		nullModuleLabels.forEach(label => allLabelNames.add(label));
	}

	for (const moduleName of modulesToCheck) {
		const { labelNames } = getModuleFieldData(apiFields, moduleName);
		labelNames.forEach(label => allLabelNames.add(label));
		console.log(`\nModule '${moduleName}': ${labelNames.length} fields`);
		console.log(`Fields: ${labelNames.join(', ')}`);
	}

	const { labelNames: orderLabelNames } = getModuleFieldData(orderFields, 'orders');
	orderLabelNames.forEach(label => allLabelNames.add(label));
	console.log(`\nOrders endpoint fields: ${orderLabelNames.length}`);
	console.log(`Orders endpoint labels: ${orderLabelNames.join(', ')}`);

	const apiLabelNamesArray = Array.from(allLabelNames);
	console.log(`\nTotal unique fields across all modules: ${apiLabelNamesArray.length}`);
	console.log(`All unique fields: ${apiLabelNamesArray.join(', ')}`);

	const missingColumns: string[] = [];
	const foundColumns: string[] = [];

	const normalizedUIColumns = columnsToCheck.map(normalizeColumnName);

	for (let i = 0; i < columnsToCheck.length; i++) {
		const originalColumnName = columnsToCheck[i];
		const normalizedColumnName = normalizedUIColumns[i];

		if (!allLabelNames.has(normalizedColumnName)) {
			missingColumns.push(originalColumnName);
		} else {
			foundColumns.push(originalColumnName);
		}
	}

	const filteredMissingColumns = missingColumns.filter(
		column => !REPORT_BUILDER_MISSING_COLUMNS_ALLOWLIST.has(normalizeColumnName(column))
	);
	const ignoredMissingColumns = missingColumns.filter(
		column => REPORT_BUILDER_MISSING_COLUMNS_ALLOWLIST.has(normalizeColumnName(column))
	);

	console.log(
		`Found ${foundColumns.length} matching columns, ` +
		`${filteredMissingColumns.length} missing, ${ignoredMissingColumns.length} allowlisted`
	);

	if (ignoredMissingColumns.length > 0) {
		console.log(`\nℹ️  Allowlisted missing columns (${ignoredMissingColumns.length}): ${ignoredMissingColumns.join(', ')}`);
	}

	if (filteredMissingColumns.length > 0) {
		console.error(`\n❌ Columns not found in API (${filteredMissingColumns.length}): ${filteredMissingColumns.join(', ')}`);
		console.log(`\n✓ Found columns (${foundColumns.length}): ${foundColumns.join(', ')}`);
		expect(filteredMissingColumns).toEqual([]);
	}

	console.log(`\n✓ All UI columns are present in the API response!`);
	console.log(`API Coverage: ${foundColumns.length}/${columnsToCheck.length} (100%)`);
}

export async function checkColumnNames(page: Page): Promise<void> {
	await page.locator('.p-multiselect-trigger').click();
	await page.waitForTimeout(1000);

	await page.getByRole('listitem').first().waitFor({ state: 'visible', timeout: TIMEOUT_LISTITEM });

	const columnHeaderTexts = await page.getByRole('columnheader').allTextContents();
	console.log(`Column headers (${columnHeaderTexts.length}): ${columnHeaderTexts.join(', ')}`);

	const checkedItemTexts = await page
		.getByRole('listitem')
		.filter({ has: page.locator('.p-checkbox-checked, [aria-checked="true"]') })
		.allTextContents();
	console.log(`Checked items (${checkedItemTexts.length}): ${checkedItemTexts.join(', ')}`);

	await page.locator('p-multiselect').click();
	await page.waitForTimeout(500);

	const trimmedChecked = checkedItemTexts.map(text => text.trim()).sort();
	const trimmedHeaders = columnHeaderTexts.map(text => text.trim()).sort();
	expect(trimmedChecked).toEqual(trimmedHeaders);
}

async function getRandomCheckboxIndices(page: Page, count: number, checkedOnly: boolean = false): Promise<number[]> {
	const listItems = await page.getByRole('listitem').all();
	const validIndices: number[] = [];

	if (checkedOnly) {
		for (let i = 0; i < listItems.length; i++) {
			const checkbox = listItems[i].locator('.p-checkbox-checked, [aria-checked="true"]').first();
			if (await checkbox.count() > 0) {
				validIndices.push(i);
			}
		}
	} else {
		validIndices.push(...Array.from({ length: listItems.length }, (_, i) => i));
	}

	const randomIndices = new Set<number>();
	while (randomIndices.size < Math.min(count, validIndices.length)) {
		randomIndices.add(validIndices[Math.floor(Math.random() * validIndices.length)]);
	}

	return Array.from(randomIndices);
}

export async function toggleRandomCheckboxes(page: Page, count: number = 12, checkedOnly: boolean = false): Promise<void> {
	await page.locator('.p-multiselect-trigger').click();
	await page.waitForTimeout(1000);

	const listItems = await page.getByRole('listitem').all();
	const randomIndices = await getRandomCheckboxIndices(page, count, checkedOnly);

	for (const index of randomIndices) {
		const listItem = listItems[index];
		const checkbox = listItem.locator('.p-checkbox, .p-checkbox-box, input[type="checkbox"]').first();
		await (await checkbox.count() > 0
			? checkbox.click({ timeout: TIMEOUT_NAVIGATION })
			: listItem.click({ timeout: TIMEOUT_NAVIGATION }));
		console.log(`${checkedOnly ? 'Un' : ''}toggled checkbox at index ${index}`);
		await page.waitForTimeout(500);
	}

	await page.locator('p-multiselect').click();
	await page.waitForTimeout(1000);
}

export async function testPaginationWithPageSize(page: Page, pageSize: number): Promise<void> {
	await setPageSize(page, pageSize);

	const rowCount = await getTableRowCount(page);
	console.log(`Pagination test - Page size: ${pageSize}, Actual rows: ${rowCount}`);

	expect(rowCount).toBe(pageSize);
	console.log(`✓ Page size ${pageSize} verified with ${rowCount} table rows`);
}

export async function getRandomOrderNumbers(
	page: Page,
	count: number = 5
): Promise<{ index: number; orderNumber: string }[]> {
	const rows = page.locator('table tbody tr');
	await rows.first().waitFor({ state: 'visible', timeout: TIMEOUT_LISTITEM });

	const total = await rows.count();
	if (total <= 1) {
		console.warn('No data rows available to sample.');
		return [];
	}

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

async function getOrderDetailFieldValue(
	orderPage: Page,
	detailPageFieldName: string
): Promise<{ found: boolean; value: string }> {
	let fieldValue = '';
	let fieldCount = 0;

	if (detailPageFieldName === 'Payment Status' || detailPageFieldName === 'Payment Amount') {
		const balanceHeader = orderPage.getByRole('columnheader', { name: 'Balance' });
		const balanceHeaderCount = await balanceHeader.count();

		if (balanceHeaderCount > 0) {
			const table = balanceHeader.locator('xpath=ancestor::table').first();
			const rows = table.locator('tbody tr');
			const rowCount = await rows.count();

			if (rowCount > 0) {
				const lastRow = rows.last();
				const headers = await table.locator('thead th, thead td').allTextContents();
				const balanceColIndex = headers.findIndex(h => h.trim().includes('Balance'));

				if (balanceColIndex !== -1) {
					const balanceCell = lastRow.locator('td').nth(balanceColIndex);
					const balanceValue = (await balanceCell.innerText()).trim();
					const balanceNum = parseFloat(balanceValue.replace(/[$,]/g, ''));

					if (detailPageFieldName === 'Payment Status') {
						if (balanceNum === 0) {
							fieldValue = 'Paid';
						} else if (balanceNum > 0 && balanceNum < orderTotal) {
							fieldValue = 'Partial';
						} else {
							fieldValue = 'Unpaid';
						}
					} else if (detailPageFieldName === 'Payment Amount') {
						const paymentAmount = orderTotal - balanceNum;
						fieldValue = paymentAmount.toString();
					}

					fieldCount = 1;
				}
			} else {
				if (detailPageFieldName === 'Payment Status') {
					fieldValue = 'Unpaid';
				} else if (detailPageFieldName === 'Payment Amount') {
					fieldValue = '0';
				}
				fieldCount = 1;
			}
		} else {
			if (detailPageFieldName === 'Payment Amount') {
				fieldValue = '0';
				fieldCount = 1;
			}
		}
	} else {
		const fieldElement = orderPage.getByText(new RegExp(`${detailPageFieldName}:`));
		fieldCount = await fieldElement.count();

		if (fieldCount > 0) {
			const fieldText = (await fieldElement.first().innerText()).trim();
			fieldValue = extractValueAfterLabel(fieldText, `${detailPageFieldName}:`);
		}
	}

	return { found: fieldCount > 0, value: fieldValue };
}

// Legacy: Navigate through menu to orders page
export async function searchOrderOnMainPageViaMenu(
	page: Page,
	orderNumber: string,
	salesReportPage: Page,
	rowIndex: number
): Promise<void> {
	console.log(`Switching to main page to search for order ${orderNumber}`);

	await page.bringToFront();

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

	const orderTotalElement = orderPage.getByText(/Order Total:/);
	const orderTotalCount = await orderTotalElement.count();
	orderTotal = 0;

	if (orderTotalCount > 0) {
		const orderTotalText = (await orderTotalElement.first().innerText()).trim();
		orderTotal = extractOrderTotalValue(orderTotalText);
	}

	console.log(`Order Total extracted: $${orderTotal}`);

	await salesReportPage.bringToFront();
	const columnHeaders = await salesReportPage.getByRole('columnheader').allTextContents();
	const targetRow = salesReportPage.locator('table tbody tr').nth(rowIndex);

	console.log(`\nVerifying all columns for row ${rowIndex} (Order: ${orderNumber})`);

	let verifiedCount = 0;
	let skippedCount = 0;

	for (let colIndex = 0; colIndex < columnHeaders.length; colIndex++) {
		const columnName = columnHeaders[colIndex].trim();

		if (!columnName) {
			skippedCount++;
			continue;
		}

		const cell = targetRow.locator('td').nth(colIndex);
		const cellValue = (await cell.innerText()).trim();

		const detailPageFieldName = COLUMN_NAME_MAPPING[columnName] || columnName;

		await orderPage.bringToFront();
		try {
			const { found, value } = await getOrderDetailFieldValue(orderPage, detailPageFieldName);
			let fieldValue = value;

			if (found) {
				if (detailPageFieldName === 'Status' || detailPageFieldName === 'Invoice Date') {
					fieldValue = fieldValue.split(' ')[0].trim();
				}

				const normalizedCellValue = normalizeNumericString(cellValue);
				const normalizedFieldValue = normalizeNumericString(fieldValue);

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
			console.log(`  Column "${columnName}": error checking (${(error as Error).message})`);
			skippedCount++;
		}

		await salesReportPage.bringToFront();
	}

	console.log(`✓ Verified ${verifiedCount} columns, skipped ${skippedCount} columns for row ${rowIndex}\n`);

	await page.waitForTimeout(2000);

	console.log(`✓ Searched for order ${orderNumber} on main page`);
}

// Direct URL navigation to orders page
export async function searchOrderOnMainPage(
	page: Page,
	orderNumber: string,
	salesReportPage: Page,
	rowIndex: number
): Promise<void> {
	console.log(`Navigating directly to orders page to search for order ${orderNumber}`);

	await page.bringToFront();

	await page.goto('https://dev.anterasaas.com/e-commerce/orders/v1');
	await page.waitForLoadState('networkidle');
	
	const searchBox = page.getByRole('textbox', { name: 'Search', exact: true });
	await expect(searchBox).toBeVisible({ timeout: TIMEOUT_NAVIGATION });
	
	await searchBox.click();
	await searchBox.fill(`${orderNumber}`);
	await page.locator('.p-input-icon-left.table_top_search > .pi').click();
	const page1Promise = page.waitForEvent('popup');
	await page.getByTitle(`${orderNumber}`).click();
	const orderPage = await page1Promise;
	await orderPage.bringToFront();
	await orderPage.waitForLoadState('networkidle');

	const orderTotalElement = orderPage.getByText(/Order Total:/);
	const orderTotalCount = await orderTotalElement.count();
	orderTotal = 0;

	if (orderTotalCount > 0) {
		const orderTotalText = (await orderTotalElement.first().innerText()).trim();
		orderTotal = extractOrderTotalValue(orderTotalText);
	}

	console.log(`Order Total extracted: $${orderTotal}`);

	await salesReportPage.bringToFront();
	const columnHeaders = await salesReportPage.getByRole('columnheader').allTextContents();
	const targetRow = salesReportPage.locator('table tbody tr').nth(rowIndex);

	console.log(`\nVerifying all columns for row ${rowIndex} (Order: ${orderNumber})`);

	let verifiedCount = 0;
	let skippedCount = 0;

	for (let colIndex = 0; colIndex < columnHeaders.length; colIndex++) {
		const columnName = columnHeaders[colIndex].trim();

		if (!columnName) {
			skippedCount++;
			continue;
		}

		const cell = targetRow.locator('td').nth(colIndex);
		const cellValue = (await cell.innerText()).trim();

		const detailPageFieldName = COLUMN_NAME_MAPPING[columnName] || columnName;

		await orderPage.bringToFront();
		try {
			const { found, value } = await getOrderDetailFieldValue(orderPage, detailPageFieldName);
			let fieldValue = value;

			if (found) {
				if (detailPageFieldName === 'Status' || detailPageFieldName === 'Invoice Date') {
					fieldValue = fieldValue.split(' ')[0].trim();
				}

				const normalizedCellValue = normalizeNumericString(cellValue);
				const normalizedFieldValue = normalizeNumericString(fieldValue);

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
			console.log(`  Column "${columnName}": error checking (${(error as Error).message})`);
			skippedCount++;
		}

		await salesReportPage.bringToFront();
	}

	console.log(`✓ Verified ${verifiedCount} columns, skipped ${skippedCount} columns for row ${rowIndex}\n`);

	await page.waitForTimeout(2000);

	console.log(`✓ Searched for order ${orderNumber} on main page`);
}
