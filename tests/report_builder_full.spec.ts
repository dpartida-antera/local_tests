import { test, type Page } from '@playwright/test';
import { login } from '../helper/auth';
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
} from '../helper/report-builder-test-helpers';

const PAGE_SIZE = 100;
const TEST_DELAY_MS = 10000;

test.describe('report builder suite', () => {
	test.describe.configure({ timeout: 480000 });

	test.beforeAll(async ({}, testInfo) => {
		testInfo.setTimeout(240000); //
		const delay = testInfo.workerIndex * TEST_DELAY_MS;
		if (delay > 0) {
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	});

	test('report_builder_full', async ({ page }: { page: Page }) => {
		await login(page);
		await openMenu(page);

		const reportBuilderPage = await goToReportBuilder(page);
		const salesReportPage = await goToSalesReport(reportBuilderPage);

		await testPaginationWithPageSize(salesReportPage, PAGE_SIZE);

		const rowsWithOrders = await getRandomOrderNumbers(salesReportPage, 5);
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
	});
});
