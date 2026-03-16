import { test, type Page } from '@playwright/test';
import { login } from '../../helper/auth';
import {
	goToReportBuilder,
	openMenu,
	goToSalesReport,
	columnsSelectedCount,
	checkColumnNames,
	toggleRandomCheckboxes,
	compareColumnsWithAPI,
	selectAllColumns,
	testPaginationWithPageSize,
	getRandomOrderNumbers,
	searchOrderOnMainPage,
} from '../../helper/report-builder-test-helpers';

const PAGE_SIZE = 100;
const TEST_DELAY_MS = 10000;

async function openSalesReport(page: Page): Promise<Page> {
	await login(page);
	await openMenu(page);
	const reportBuilderPage = await goToReportBuilder(page);
	return goToSalesReport(reportBuilderPage);
}

test.describe('report builder suite', () => {
	test.describe.configure({ timeout: 480000, retries: 0 });

	test.beforeAll(async ({ }, testInfo) => {
		testInfo.setTimeout(120000);
		const delay = testInfo.workerIndex * TEST_DELAY_MS;
		if (delay > 0) {
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	});

	// Verifies report pagination behavior when page size is set to 100 rows.
	test('report_builder_pagination_page_size', async ({ page }: { page: Page }) => {
		const salesReportPage = await openSalesReport(page);

		await testPaginationWithPageSize(salesReportPage, PAGE_SIZE);
	});

	// Validates that random order numbers in the report match details on the main page.
	test.only('report_builder_order_details_match', async ({ page }: { page: Page }) => {
		const salesReportPage = await openSalesReport(page);

		const rowsWithOrders = await getRandomOrderNumbers(salesReportPage, 5);
		for (const { index, orderNumber } of rowsWithOrders) {
			await searchOrderOnMainPage(page, orderNumber, salesReportPage, index);
		}
	});

	// Checks that toggling random column checkboxes updates visible column headers correctly.
	test('report_builder_columns_toggle', async ({ page }: { page: Page }) => {
		const salesReportPage = await openSalesReport(page);

		await checkColumnNames(salesReportPage);
		await toggleRandomCheckboxes(salesReportPage, 12);
		await checkColumnNames(salesReportPage);
	});

	// Compares report builder columns against API-provided fields for coverage consistency.
	test('report_builder_columns_api_coverage', async ({ page }: { page: Page }) => {
		const salesReportPage = await openSalesReport(page);

		await compareColumnsWithAPI(salesReportPage);
	});

	// Ensures selecting all columns shows the full expected set of column names.
	test('report_builder_select_all_columns', async ({ page }: { page: Page }) => {
		const salesReportPage = await openSalesReport(page);

		await selectAllColumns(salesReportPage);
		await checkColumnNames(salesReportPage);
	});
});