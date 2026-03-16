import { test, expect, type Page } from '@playwright/test';
import { login } from '../../helper/auth';
import { navigateToOrdersDirectly, clickAddOrder, selectExistingCustomer, selectExistingContact, fillOrderDetailsAndCreate, fillOrderDates, addStockProductToOrder, updateOrderShippingBilling, bookOrder, getOrderNumberFromScreen, toggleSourceOn, resourcingFromStockToDropship, getOrderTestData } from '../../helper/orders';
import { navigateToReceivingAndOpenOrder, receivePartialQuantity } from '../../helper/ui-helpers';

test.describe('receiving suite', () => {
  test.describe.configure({ timeout: 350000, retries: 0 });

  test('PartialReceiving', async ({ page }: { page: Page }) => {
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
    await updateOrderShippingBilling(page);
    await bookOrder(page);
    const orderNumber = await getOrderNumberFromScreen(page);
    await page.waitForTimeout(2000);
    await toggleSourceOn(page);
    await resourcingFromStockToDropship(page, 'first');
    await navigateToReceivingAndOpenOrder(page, orderNumber);
    await receivePartialQuantity(page, '1');
    await navigateToReceivingAndOpenOrder(page, orderNumber);
    await expect(page.locator('mat-row')).toContainText('Balance 9');
    await receivePartialQuantity(page, '4');
    await navigateToReceivingAndOpenOrder(page, orderNumber);
    await expect(page.locator('mat-row')).toContainText('Balance 5');
    // await waitForLoader(page);
    //search for the order and expecting to not find it

  });
});
