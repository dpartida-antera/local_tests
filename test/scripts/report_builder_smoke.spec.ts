import { test, type Page } from '@playwright/test';
import { login } from '../../helper/auth';
import {
	goToReportBuilder,
	openMenu,
	goToSalesReport,
	columnsSelectedCount,
	checkColumnNames,
} from '../../helper/report-builder-test-helpers';

const TEST_DELAY_MS = 10000;

async function openSalesReport(page: Page): Promise<Page> {
	await login(page);
	await openMenu(page);
	const reportBuilderPage = await goToReportBuilder(page);
	return goToSalesReport(reportBuilderPage);
}

test.describe('report builder suite', () => {
	test.describe.configure({ timeout: 480000 });

	test.beforeAll(async ({ }, testInfo) => {
		testInfo.setTimeout(120000);
		const delay = testInfo.workerIndex * TEST_DELAY_MS;
		if (delay > 0) {
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	});

	test('report_builder_smoke', async ({ page }: { page: Page }) => {
		const salesReportPage = await openSalesReport(page);

		await columnsSelectedCount(salesReportPage);
		await checkColumnNames(salesReportPage);
	});
});
