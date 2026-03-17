import { test, type Page } from '@playwright/test';
import { login } from '../../helper/auth';
import { navigateToOrdersDirectly, clickAddOrder, selectExistingCustomer, selectExistingContact, fillOrderDetailsAndCreate, fillOrderDates, addStockProductToOrder, updateOrderShippingBilling, bookOrder, getOrderNumberFromScreen, ensureSourceDropshipIfNeeded, getOrderTestData } from '../../helper/orders';
import { navigateToReceivingAndOpenOrder, selectAllCheckboxAndReceive, waitForLoader, searchAndExpectNoRecords } from '../../helper/ui-helpers';

test.describe('receiving suite', () => {
  test.describe.configure({ timeout: 350000, retries: 0 });

  test('should receive by selecting all checkbox', async ({ page }: { page: Page }) => {
    //order test
    const { OrderNameF, testOrderO } = getOrderTestData();

    // 1. Login with specific user
    await login(page);

    // 2. Order Creation
    await navigateToOrdersDirectly(page);
    await clickAddOrder(page);
    await selectExistingCustomer(page);
    await selectExistingContact(page);
    await fillOrderDetailsAndCreate(page, OrderNameF, testOrderO);
    await fillOrderDates(page, '22-09-2030', '28');
    await addStockProductToOrder(page, '50639720', '10', 'Black', 'quantity-input-0-0');
    await addStockProductToOrder(page, '50639720', '10', 'Green', 'quantity-input-1-0');
    await updateOrderShippingBilling(page);
    await bookOrder(page);
    const orderNumber = await getOrderNumberFromScreen(page);
    await page.waitForTimeout(2000);
    await ensureSourceDropshipIfNeeded(page, [
      { sourceLocation: 'first', clickUpdate: true },
      { sourceLocation: 1, clickUpdate: true }
    ]);
    await navigateToReceivingAndOpenOrder(page, orderNumber);
    await selectAllCheckboxAndReceive(page);
    await waitForLoader(page);
    //search for the order and expecting to not find it
    await searchAndExpectNoRecords(page, orderNumber);

  });
});
