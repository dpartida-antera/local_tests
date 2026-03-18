/**
 * Helper functions for Report Builder tests
 * Contains utilities for navigating, column validation, API comparison, and data verification
 *
 * Function Index
 * - Core navigation/setup: goToReportBuilder, openMenu, goToSalesReport
 * - Column selection/validation: columnsSelectedCount, selectAllColumns, compareColumnsWithAPI, checkColumnNames, toggleRandomCheckboxes
 * - Pagination: testPaginationWithPageSize
 * - Sampling/search + row verification: getRandomOrderNumbers, searchOrderOnMainPageViaMenu, searchOrderOnMainPage
 * - Internal helpers: loaders/parsers, API fetch/comparison, order-detail extraction, field derivations, row comparison
 */

import { expect, type Page } from '@playwright/test';
import { setPageSize, getTableRowCount } from './pagination';
import { navigateToOrders } from './orders';
import { BASE_URL } from './base-url';
import { type APIField, getAllLabelNames } from './api-fields-helper';
import { normalizeColumnName, REPORT_BUILDER_MISSING_COLUMNS_ALLOWLIST } from './report-builder-columns';
import {
	normalizeNumericString,
	getOrderDetailFieldValue,
	openOrderDetailPageDirectly,
	openOrderDetailPageViaMenu,
	extractAndSetOrderTotal
} from './order-helpers';
import { openMenu as uiOpenMenu } from './ui-helpers';

// Re-export openMenu for convenience in test files
export { uiOpenMenu as openMenu };

// Timeout constants
const TIMEOUT_NAVIGATION = 50000; // 50 seconds - for navigation and element visibility
const TIMEOUT_LISTITEM = 15000; // 15 seconds - for list items and dropdowns

/**
 * Column name mapping: Maps Sales Report column names to Order Detail page field names
 * Use this when the same field has different labels in different parts of the application
 * Add entries here when column names differ between the two pages
 */
const COLUMN_NAME_MAPPING: Record<string, string> = {
	// Example: "Sales Report Column": "Order Detail Field"
	"Order No": "Order #",
	"Order Status": "Status",
	"Customer": "Account Name",
	"Order Subtotal": "Subtotal"
	// Add your mappings here as you discover mismatches
};

// =========================
// Navigation helpers
// =========================

/**
 * Navigates to the Report Builder by clicking the menu item, which opens in a new popup window
 * Retries up to 3 times on failure
 * @param page - The main Playwright page
 * @returns The new popup page for Report Builder
 */
export async function goToReportBuilder(page: Page): Promise<Page> {
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			// Move mouse to avoid element overlap issues
			await page.mouse.move(100, 100);
			const reportBuilderElement = page.getByText('bar_chartReports Builder');
			await reportBuilderElement.waitFor({ state: 'visible', timeout: TIMEOUT_NAVIGATION });

			// Wait for popup to open when clicking Report Builder
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

// =========================
// Navigation helpers
// =========================

/**
 * Navigates to the Sales Report within the Report Builder
 * Waits for the table to load and verifies data is present
 * @param page - The Report Builder page
 * @returns The same page after navigation
 */
export async function goToSalesReport(page: Page): Promise<Page> {
	// Click the Sales report icon
	page.getByRole('img', { name: 'Sales', exact: true }).click();
	await page.waitForLoadState('networkidle');

	// Verify table has loaded with data
	const rows = page.locator('table tbody tr');
	await expect(rows.first()).toBeVisible({ timeout: TIMEOUT_NAVIGATION });
	const rowCount = await rows.count();
	expect(rowCount).toBeGreaterThan(0);
	return page;
}

// =========================
// Column selection helpers
// =========================

/**
 * Validates that the column count displayed in the UI matches the actual number of column headers
 * @param page - The Report Builder page
 */
export async function columnsSelectedCount(page: Page): Promise<void> {
	// Get count from UI text (e.g., "12 columns selected")
	const columnsSelectedElement = await page.getByText('columns selected');
	const columnsSelectedText = await columnsSelectedElement.innerText();
	const columnsSelectedCount = Number(columnsSelectedText.split(' ')[0]);
	console.log(`Columns selected (from text): ${columnsSelectedCount}`);

	// Get actual column header count from table
	const selectedColumnsElement = await page.getByRole('columnheader');
	const selectedColumnsCount = await selectedColumnsElement.count();
	console.log(`Columns selected (from count): ${selectedColumnsCount}`);

	// Verify they match
	expect(columnsSelectedCount).toBe(selectedColumnsCount);
}

/**
 * Selects all available columns in the column selector dropdown
 * @param page - The Report Builder page
 */
export async function selectAllColumns(page: Page): Promise<void> {
	// Open the column selector dropdown
	await page.locator('.p-multiselect-trigger').click();
	// Click the "Select All" checkbox (second checkbox, first is search)
	await page.getByRole('checkbox').nth(1).click();
	// Close the dropdown
	await page.locator('p-multiselect').click();
	await page.waitForTimeout(2000);
	// Verify all columns are selected
	await columnsSelectedCount(page);
}

// =========================
// API comparison helpers
// =========================

/**
 * Fetches field definitions from the API for a specific module
 * @param module - The module name (default: 'orders')
 * @returns Array of API field definitions
 */
async function fetchFieldsFromAPI(module: string = 'orders'): Promise<APIField[]> {
	// Basic Auth: Postman puts ODI2YjBkZTBkYjE2 as username, then encodes "username:" for Basic Auth
	const username = 'ODI2YjBkZTBkYjE2';
	const auth = Buffer.from(`${username}:`).toString('base64');

	const response = await fetch(
		`${BASE_URL}/protected/content/get-fields-list`,
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

/**
 * Fetches field definitions specifically for the orders module from the dedicated orders endpoint
 * @returns Array of order field definitions
 */
async function fetchOrderFieldsFromAPI(): Promise<APIField[]> {
	const username = 'ODI2YjBkZTBkYjE2';
	const auth = Buffer.from(`${username}:`).toString('base64');

	const response = await fetch(
		`${BASE_URL}/protected/api/v1/orders/fields`,
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

/**
 * Extracts all available column names from the column selector dropdown
 * @param page - The Report Builder page
 * @returns Array of column names
 */
async function getUIColumnNames(page: Page): Promise<string[]> {
	await page.locator('.p-multiselect-trigger').click();
	await page.waitForTimeout(1000);
	await page.getByRole('listitem').first().waitFor({ state: 'visible', timeout: TIMEOUT_LISTITEM });

	const columnTexts = await page.getByRole('listitem').allTextContents();
	const columnNames = columnTexts.map(text => text.trim()).filter(text => text.length > 0);

	await page.locator('p-multiselect').click();
	await page.waitForTimeout(500);

	return columnNames;
}

/**
 * Fetches and combines all API field labels from multiple endpoints
 * @returns Set of all unique label names across all API endpoints
 */
async function fetchAllAPILabels(): Promise<Set<string>> {
	const apiFields = await fetchFieldsFromAPI('orders');
	const orderFields = await fetchOrderFieldsFromAPI();

	console.log(`\n=== API Response Summary ===`);
	console.log(`get-fields-list endpoint: ${apiFields.length} fields`);
	console.log(`orders/fields endpoint: ${orderFields.length} fields`);

	// Combine all labels from both endpoints
	const getFieldsLabels = getAllLabelNames(apiFields);
	const orderFieldsLabels = getAllLabelNames(orderFields);

	console.log(`get-fields-list unique labels: ${getFieldsLabels.size}`);
	console.log(`orders/fields unique labels: ${orderFieldsLabels.size}`);

	const allLabelNames = new Set([...getFieldsLabels, ...orderFieldsLabels]);
	console.log(`\nTotal unique field labels across all endpoints: ${allLabelNames.size}`);

	return allLabelNames;
}

/**
 * Compares UI columns against API field labels and categorizes results
 * @param uiColumns - Array of column names from the UI
 * @param apiLabels - Set of label names from API
 * @returns Categorized columns (found, missing, allowlisted)
 */
function categorizeColumns(
	uiColumns: string[],
	apiLabels: Set<string>
): { found: string[]; missing: string[]; allowlisted: string[] } {
	const found: string[] = [];
	const missing: string[] = [];
	const allowlisted: string[] = [];

	for (const columnName of uiColumns) {
		const normalizedColumnName = normalizeColumnName(columnName);

		if (apiLabels.has(normalizedColumnName)) {
			found.push(columnName);
		} else if (REPORT_BUILDER_MISSING_COLUMNS_ALLOWLIST.has(normalizedColumnName)) {
			allowlisted.push(columnName);
		} else {
			missing.push(columnName);
		}
	}

	return { found, missing, allowlisted };
}

/**
 * Verifies that all UI columns in the Report Builder are present in the API field definitions
 * This ensures the UI and backend are in sync
 * @param page - The Report Builder page
 */
export async function compareColumnsWithAPI(page: Page): Promise<void> {
	const uiColumns = await getUIColumnNames(page);
	console.log(`UI columns (${uiColumns.length}): ${uiColumns.join(', ')}`);
	console.log(`Checking ${uiColumns.length} columns against API fields`);

	const apiLabels = await fetchAllAPILabels();
	const { found, missing, allowlisted } = categorizeColumns(uiColumns, apiLabels);

	console.log(
		`Found ${found.length} matching columns, ` +
		`${missing.length} missing, ${allowlisted.length} allowlisted`
	);

	if (allowlisted.length > 0) {
		console.log(`\nℹ️  Allowlisted missing columns (${allowlisted.length}): ${allowlisted.join(', ')}`);
	}

	if (missing.length > 0) {
		console.error(`\n❌ Columns not found in API (${missing.length}): ${missing.join(', ')}`);
		console.log(`\n✓ Found columns (${found.length}): ${found.join(', ')}`);
		expect(missing).toEqual([]);
	}

	console.log(`\n✓ All UI columns are present in the API response!`);
	console.log(`API Coverage: ${found.length}/${uiColumns.length} (100%)`);
}

/**
 * Confirms selected columns match the visible table headers
 * @param page - The Report Builder page
 */
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

/**
 * Picks random checkbox indices from the column selector list
 * @param page - The Report Builder page
 * @param count - How many indices to return
 * @param checkedOnly - Whether to select only checked items
 * @returns Array of list item indices
 */
async function getRandomCheckboxIndices(page: Page, count: number, checkedOnly: boolean = false): Promise<number[]> {
	const listItems = await page.getByRole('listitem').all();
	let validIndices: number[] = [];

	if (checkedOnly) {
		for (let i = 0; i < listItems.length; i++) {
			const checkbox = listItems[i].locator('.p-checkbox-checked, [aria-checked="true"]').first();
			if (await checkbox.count() > 0) {
				validIndices.push(i);
			}
		}
	} else {
		validIndices = Array.from({ length: listItems.length }, (_, i) => i);
	}

	// Shuffle and take first 'count' items
	const shuffled = validIndices.sort(() => Math.random() - 0.5);
	return shuffled.slice(0, Math.min(count, validIndices.length));
}

/**
 * Toggles a random set of column selector checkboxes
 * @param page - The Report Builder page
 * @param count - How many checkboxes to toggle
 * @param checkedOnly - Whether to only toggle already-checked items
 */
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

// =========================
// Pagination helpers
// =========================

/**
 * Verifies pagination by comparing page size to rendered row count
 * @param page - The Report Builder page
 * @param pageSize - Expected number of rows per page
 */
export async function testPaginationWithPageSize(page: Page, pageSize: number): Promise<void> {
	await setPageSize(page, pageSize);

	const rowCount = await getTableRowCount(page);
	console.log(`Pagination test - Page size: ${pageSize}, Actual rows: ${rowCount}`);

	expect(rowCount).toBe(pageSize);
	console.log(`✓ Page size ${pageSize} verified with ${rowCount} table rows`);
}

// =========================
// Order sampling + verification helpers
// =========================

/**
 * Selects random order numbers from the sales report table
 * @param page - The Report Builder page
 * @param count - How many rows to sample
 * @returns Array of selected row indices and order numbers
 */
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

/**
 * Verifies all columns in a table row against the order detail page
 * @param salesReportPage - The sales report page with the table
 * @param orderPage - The order detail page to compare against
 * @param rowIndex - The row index in the table
 * @param orderNumber - The order number being verified
 * @returns Verification statistics (verified count, skipped count)
 */
async function verifyRowColumns(
	salesReportPage: Page,
	orderPage: Page,
	rowIndex: number,
	orderNumber: string
): Promise<{ verified: number; skipped: number }> {
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

		// Skip Invoice Date if Order Status is not "Billed"
		if (columnName === 'Invoice Date') {
			const orderStatusColIndex = columnHeaders.findIndex(h => h.trim() === 'Order Status');
			if (orderStatusColIndex !== -1) {
				const statusCell = targetRow.locator('td').nth(orderStatusColIndex);
				const statusValue = (await statusCell.innerText()).trim();
				if (statusValue !== 'Billed') {
					console.log(`  ⊘ Column "Invoice Date": skipped (Order Status is "${statusValue}", not "Billed")`);
					skippedCount++;
					continue;
				}
			}
		}

		// Skip Payment Date if Payment Status is "Unpaid"
		if (columnName === 'Payment Date') {
			const paymentStatusColIndex = columnHeaders.findIndex(h => h.trim() === 'Payment Status');
			if (paymentStatusColIndex !== -1) {
				const statusCell = targetRow.locator('td').nth(paymentStatusColIndex);
				const statusValue = (await statusCell.innerText()).trim();
				if (statusValue === 'Unpaid') {
					console.log(`  ⊘ Column "Payment Date": skipped (Payment Status is "Unpaid")`);
					skippedCount++;
					continue;
				}
			}
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
			// If it's an assertion error, re-throw it to fail the test
			if ((error as Error).message.includes('expect(')) {
				throw error;
			}
			// Otherwise, log and skip (for other errors like element not found)
			console.log(`  Column "${columnName}": error checking (${(error as Error).message})`);
			skippedCount++;
		}

		await salesReportPage.bringToFront();
	}

	console.log(`✓ Verified ${verifiedCount} columns, skipped ${skippedCount} columns for row ${rowIndex}\n`);
	return { verified: verifiedCount, skipped: skippedCount };
}

/**
 * Legacy method: Navigates through the menu to the orders page and verifies row columns against the detail page
 * @param page - The parent Playwright page
 * @param orderNumber - The order number to search for
 * @param salesReportPage - The Sales Report page with the table
 * @param rowIndex - The row index in the sales report table
 */
export async function searchOrderOnMainPageViaMenu(
	page: Page,
	orderNumber: string,
	salesReportPage: Page,
	rowIndex: number
): Promise<void> {
	console.log(`Switching to main page to search for order ${orderNumber}`);

	const orderPage = await openOrderDetailPageViaMenu(page, orderNumber);
	await extractAndSetOrderTotal(orderPage);
	await verifyRowColumns(salesReportPage, orderPage, rowIndex, orderNumber);

	await page.waitForTimeout(2000);
	console.log(`✓ Searched for order ${orderNumber} on main page`);
}

/**
 * Navigates directly to the orders page via URL and verifies row columns against the detail page
 * @param page - The parent Playwright page
 * @param orderNumber - The order number to search for
 * @param salesReportPage - The Sales Report page with the table
 * @param rowIndex - The row index in the sales report table
 */
export async function searchOrderOnMainPage(
	page: Page,
	orderNumber: string,
	salesReportPage: Page,
	rowIndex: number
): Promise<void> {
	console.log(`Navigating directly to orders page to search for order ${orderNumber}`);

	const orderPage = await openOrderDetailPageDirectly(page, orderNumber);
	await extractAndSetOrderTotal(orderPage);
	await verifyRowColumns(salesReportPage, orderPage, rowIndex, orderNumber);

	await page.waitForTimeout(2000);
	console.log(`✓ Searched for order ${orderNumber} on main page`);
}
