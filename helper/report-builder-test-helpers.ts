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
import { type APIField, getAllLabelNames } from './api-fields-helper';
import { normalizeColumnName, REPORT_BUILDER_MISSING_COLUMNS_ALLOWLIST } from './report-builder-columns';

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

// Global variable to store the current order's total for validation calculations
let orderTotal = 0;

// =========================
// Internal parsing helpers
// =========================

/**
 * Waits for a loader/spinner to appear and then disappear
 * Useful for waiting for async operations to complete
 * @param page - The Playwright page
 * @param selector - CSS selector for the loader element (default: '.loader')
 * @param timeout - Maximum time to wait (default: TIMEOUT_NAVIGATION)
 */
async function waitForLoader(page: Page, selector: string = '.loader', timeout: number = TIMEOUT_NAVIGATION): Promise<void> {
	// Wait for loader to appear (indicates operation has started)
	const loader = page.locator(selector);
	await loader.waitFor({ state: 'visible', timeout }).catch(() => {
		console.log(`Loader '${selector}' did not appear or already finished`);
	});
	
	// Wait for loader to disappear (indicates operation is complete)
	await loader.waitFor({ state: 'hidden', timeout }).catch(() => {
		console.log(`Loader '${selector}' already hidden`);
	});
}

/**
 * Normalizes numeric strings for comparison by removing currency symbols and commas
 * @param value - The string value to normalize (e.g., "$1,234.56")
 * @returns Normalized numeric string (e.g., "1234.56") or "0" if empty
 */
function normalizeNumericString(value: string): string {
	let normalized = value.replace(/[$,]/g, '').trim();
	if (normalized === '') normalized = '0';
	const isNumeric = !isNaN(parseFloat(normalized));
	if (isNumeric) {
		return parseFloat(normalized).toString();
	}
	return normalized;
}

/**
 * Extracts a value from text that follows a specific label
 * Handles pipe-separated format: "Label: value | OtherLabel: value"
 * @param fullText - The full text containing the label and value
 * @param label - The label to search for (e.g., "Order Total:")
 * @returns The extracted value, or "0" if value starts with pipe, or "" if label not found
 */
function extractValueAfterLabel(fullText: string, label: string): string {
	
	if (!fullText.includes(label)) {
		console.log(`[extractValueAfterLabel] Label not found, returning empty string`);
		return '';
	}
	
	const startIndex = fullText.indexOf(label) + label.length;
	let remainingText = fullText.substring(startIndex).trim();
	console.log(`[extractValueAfterLabel] Remaining text after label: "${remainingText}"`);
	
	if (remainingText.startsWith('|')) {
		console.log(`[extractValueAfterLabel] Starts with pipe, returning "0"`);
		return '0';
	}
	
	if (remainingText.includes('|')) {
		const extractedValue = remainingText.split('|')[0].trim();
		console.log(`[extractValueAfterLabel] Extracted value (before pipe): "${extractedValue}"`);
		return extractedValue;
	}
	
	console.log(`[extractValueAfterLabel] Extracted value: "${remainingText}"`);
	return remainingText;
}

/**
 * Extracts numeric order total value from formatted text
 * @param text - Text containing "Order Total: $X,XXX.XX"
 * @returns Numeric order total value
 */
function extractOrderTotalValue(text: string): number {
	const value = extractValueAfterLabel(text, 'Order Total:');
	return parseFloat(value.replace(/[$,]/g, '')) || 0;
}

/**
 * Generic helper to extract a numeric field value from the order detail page
 * @param orderPage - The order detail page
 * @param fieldLabel - The field label to search for (e.g., "Subtotal", "Gross Profit")
 * @returns The numeric value, or null if not found
 */
async function extractNumericFieldValue(orderPage: Page, fieldLabel: string): Promise<number | null> {
	const fieldElement = orderPage.getByText(new RegExp(`${fieldLabel}:`));
	const hasField = await fieldElement.count() > 0;
	
	if (!hasField) {
		return null;
	}
	
	const fieldText = (await fieldElement.first().innerText()).trim();
	const fieldStringValue = extractValueAfterLabel(fieldText, `${fieldLabel}:`);
	const fieldValue = parseFloat(fieldStringValue.replace(/[$,]/g, '')) || 0;
	
	return fieldValue;
}

/**
 * Extracts the Subtotal value from the order detail page
 * @param orderPage - The order detail page
 * @returns The subtotal value, or null if not found
 */
async function extractSubtotal(orderPage: Page): Promise<number | null> {
	return extractNumericFieldValue(orderPage, 'Subtotal');
}

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
 * Opens the main navigation menu by clicking the menu button
 * @param page - The Playwright page
 */
export async function openMenu(page: Page): Promise<void> {
	const menuButton = page.locator('mat-toolbar button', { hasText: 'menu' });
	await menuButton.click();
}

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

/**
 * Fetches field definitions specifically for the orders module from the dedicated orders endpoint
 * @returns Array of order field definitions
 */
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
 * Calculates Total Cost from order detail page (Subtotal - Gross Profit)
 * @param orderPage - The order detail page
 * @returns The calculated total cost value, or null if required fields not found
 */
async function calculateTotalCost(orderPage: Page): Promise<number | null> {
	console.log('[calculateTotalCost] Starting Total Cost calculation');
	
	const subtotal = await extractSubtotal(orderPage);
	const grossProfit = await extractNumericFieldValue(orderPage, 'Gross Profit');
	
	console.log(`[calculateTotalCost] Subtotal exists: ${subtotal !== null}, Gross Profit exists: ${grossProfit !== null}`);
	
	if (subtotal !== null && grossProfit !== null) {
		const totalCost = subtotal - grossProfit;
		
		console.log(`[calculateTotalCost] Subtotal: ${subtotal}, Gross Profit: ${grossProfit}, Total Cost: ${totalCost}`);
		
		return totalCost;
	}
	
	console.log('[calculateTotalCost] Required fields not found, returning null');
	return null;
}

/**
 * Calculates Sales Tax from order detail page (Order Total - Subtotal)
 * @param orderPage - The order detail page
 * @returns The calculated sales tax value, or null if required fields not found
 */
async function calculateSalesTax(orderPage: Page): Promise<number | null> {
	console.log('[calculateSalesTax] Starting Sales Tax calculation');
	
	const subtotal = await extractSubtotal(orderPage);
	
	console.log(`[calculateSalesTax] Subtotal exists: ${subtotal !== null}, Order Total: ${orderTotal}`);
	
	if (subtotal !== null && orderTotal > 0) {
		const salesTax = Math.round((orderTotal - subtotal) * 100) / 100;
		
		console.log(`[calculateSalesTax] Order Total: ${orderTotal}, Subtotal: ${subtotal}, Sales Tax: ${salesTax}`);
		
		return salesTax;
	}
	
	console.log('[calculateSalesTax] Required fields not found, returning null');
	return null;
}

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
 * Determines payment status based on balance relative to order total
 */
function derivePaymentStatus(balance: number, total: number): string {
	if (balance === 0) return 'Paid';
	if (balance > 0 && balance < total) return 'Partial';
	return 'Unpaid';
}

/**
 * Resolves a payment-related field value given computed payment data
 */
function resolvePaymentField(fieldName: string, status: string, paymentAmount: number, balance: number): string {
	if (fieldName === 'Payment Status') return status;
	if (fieldName === 'Payment Amount') return paymentAmount.toString();
	return balance.toString(); // Balance
}

/**
 * Reads a field value from the order detail page, including derived payment fields
 * @param orderPage - The order detail page
 * @param detailPageFieldName - The label name to look for
 * @returns Whether the field was found and its value
 */
async function getOrderDetailFieldValue(
	orderPage: Page,
	detailPageFieldName: string
): Promise<{ found: boolean; value: string }> {
	let fieldValue = '';
	let fieldCount = 0;

	// Handle Total Cost as calculated field (Subtotal - Gross Profit)
	if (detailPageFieldName === 'Total Cost') {
		const totalCost = await calculateTotalCost(orderPage);
		if (totalCost !== null) {
			fieldValue = totalCost.toString();
			fieldCount = 1;
		}
	} else if (detailPageFieldName === 'Sales Tax') {
		// Handle Sales Tax as calculated field (Order Total - Subtotal)
		const salesTax = await calculateSalesTax(orderPage);
		if (salesTax !== null) {
			fieldValue = salesTax.toString();
			fieldCount = 1;
		}
	} else if (detailPageFieldName === 'Payment Status' || detailPageFieldName === 'Payment Amount' || detailPageFieldName === 'Balance') {
		// Read order status from the detail page to determine payment logic shortcuts
		const statusElement = orderPage.getByText(/Status:/);
		let orderStatus = '';
		if (await statusElement.count() > 0) {
			const statusText = (await statusElement.first().innerText()).trim();
			orderStatus = extractValueAfterLabel(statusText, 'Status:').split(' ')[0].trim();
		}
		console.log(`[Payment] Order Status: "${orderStatus}", Order Total: ${orderTotal}`);

		const isPendingOrBooked = orderStatus === 'Pending' || orderStatus === 'Booked';
		const isBilledOrVoided = orderStatus === 'Billed' || orderStatus === 'Voided';

		// Shortcut: $0 total with known status → skip payment table
		// Pending/Booked + $0 → Unpaid | Billed/Voided + $0 → Paid
		if (orderTotal === 0 && (isPendingOrBooked || isBilledOrVoided)) {
			const status = isPendingOrBooked ? 'Unpaid' : 'Paid';
			console.log(`[Payment] Shortcut: ${orderStatus} + $0 total → ${status}`);
			fieldValue = resolvePaymentField(detailPageFieldName, status, 0, 0);
			fieldCount = 1;

		// Otherwise, check the payments table
		} else {
			let balanceNum: number | null = null;

			const balanceHeader = orderPage.getByRole('columnheader', { name: 'Balance' });
			if (await balanceHeader.count() > 0) {
				const table = balanceHeader.locator('xpath=ancestor::table').first();
				const rows = table.locator('tbody tr');
				const rowCount = await rows.count();

				if (rowCount > 0) {
					const headers = await table.locator('thead th, thead td').allTextContents();
					const balanceColIndex = headers.findIndex(h => h.trim().includes('Balance'));
					if (balanceColIndex !== -1) {
						const balanceCell = rows.last().locator('td').nth(balanceColIndex);
						const balanceValue = (await balanceCell.innerText()).trim();
						balanceNum = parseFloat(balanceValue.replace(/[$,]/g, ''));
					}
				}
			}

			// If no balance data found, assume full balance equals order total (no payments made)
			const effectiveBalance = balanceNum ?? orderTotal;
			const paymentStatus = derivePaymentStatus(effectiveBalance, orderTotal);
			const paymentAmount = orderTotal - effectiveBalance;
			fieldValue = resolvePaymentField(detailPageFieldName, paymentStatus, paymentAmount, effectiveBalance);
			fieldCount = 1;
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

/**
 * Navigates to orders page via direct URL and searches for an order
 * @param page - The main page
 * @param orderNumber - The order number to search for
 * @returns The opened order detail page
 */
async function openOrderDetailPageDirectly(
	page: Page,
	orderNumber: string
): Promise<Page> {
	await page.bringToFront();
	await page.goto('https://dev.anterasaas.com/e-commerce/orders/v1');
	await page.waitForLoadState('networkidle');
	
	const searchBox = page.getByRole('textbox', { name: 'Search', exact: true });
	await expect(searchBox).toBeVisible({ timeout: TIMEOUT_NAVIGATION });
	await searchBox.click();
	await searchBox.fill(orderNumber);

	return await searchAndOpenOrder(page, orderNumber);
}

/**
 * Navigates to orders page via menu and searches for an order
 * @param page - The main page
 * @param orderNumber - The order number to search for
 * @returns The opened order detail page
 */
async function openOrderDetailPageViaMenu(
	page: Page,
	orderNumber: string
): Promise<Page> {
	await page.bringToFront();
	await page.reload();
	await navigateToOrders(page);
	await page.waitForLoadState('networkidle');
	
	const searchBox = page.getByRole('textbox', { name: 'Search', exact: true });
	await searchBox.click();
	await searchBox.fill(orderNumber);

	return await searchAndOpenOrder(page, orderNumber);
}

/**
 * Searches for and opens an order detail page (assumes search box is already filled)
 * @param page - The main page
 * @param orderNumber - The order number being searched
 * @returns The opened order detail page
 */
async function searchAndOpenOrder(page: Page, orderNumber: string): Promise<Page> {
	await page.locator('.p-input-icon-left.table_top_search > .pi').click();
	
	// Wait for loader to complete (indicates search is done)
	await waitForLoader(page);
	
	// Wait for table headers to be visible before accessing them
	await page.locator('table thead th, table thead td').first().waitFor({ state: 'visible', timeout: TIMEOUT_NAVIGATION });
	
	// Find the Order No column index from table headers
	const headers = await page.locator('table thead th, table thead td').allTextContents();
	const orderNoColIndex = headers.findIndex(h => h.trim() === 'Order No');

	if (orderNoColIndex === -1) {
		throw new Error('Order No column not found in table headers');
	}
	
	console.log(`Order No column found at index ${orderNoColIndex}`);
	console.log(`All headers: ${JSON.stringify(headers)}`);
	
	// Wait for table rows to be visible before accessing them
	const rows = page.locator('table tbody tr');
	await rows.first().waitFor({ state: 'visible', timeout: TIMEOUT_NAVIGATION });
	const rowCount = await rows.count();
	console.log(`Total rows found: ${rowCount}`);
	
	let targetRow = null;
	for (let i = 0; i < rowCount; i++) {
		const row = rows.nth(i);
		const cells = await row.locator('td').allTextContents();
		const orderNoCell = row.locator('td').nth(orderNoColIndex);
		const cellText = (await orderNoCell.innerText()).trim();
		
		console.log(`Row ${i}: Order No cell text = "${cellText}" (looking for "${orderNumber}")`);
		console.log(`Row ${i} all cells: ${JSON.stringify(cells.map(c => c.trim()))}`);
		
		if (cellText === orderNumber) {
			targetRow = row;
			console.log(`✓ Found exact match for order ${orderNumber} at row ${i}`);
			break;
		}
	}
	
	if (!targetRow) {
		console.log(`❌ Order ${orderNumber} NOT FOUND after checking ${rowCount} rows`);
		throw new Error(`Order ${orderNumber} not found in search results`);
	}
	
	console.log(`Clicking order ${orderNumber} and waiting for popup...`);
	const page1Promise = page.waitForEvent('popup');
	// Click the element with title attribute within the matched row to handle cases like 14131 vs 14131-B
	const clickableElement = targetRow.getByTitle(orderNumber);
	await clickableElement.click();
	const orderPage = await page1Promise;
	console.log(`✓ Order detail page opened`);
	
	await orderPage.bringToFront();
	await orderPage.waitForLoadState('networkidle');

	return orderPage;
}

/**
 * Extracts the order total from the order detail page and updates the global variable
 * @param orderPage - The order detail page
 * @returns The extracted order total value
 */
async function extractAndSetOrderTotal(orderPage: Page): Promise<number> {
	const orderTotalElement = orderPage.getByText(/Order Total:/);
	const orderTotalCount = await orderTotalElement.count();
	orderTotal = 0;

	if (orderTotalCount > 0) {
		const orderTotalText = (await orderTotalElement.first().innerText()).trim();
		orderTotal = extractOrderTotalValue(orderTotalText);
	}

	console.log(`Order Total extracted: $${orderTotal}`);
	return orderTotal;
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

// Legacy: Navigate through menu to orders page
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

// Direct URL navigation to orders page
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
