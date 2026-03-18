import { test, expect, type Page } from '@playwright/test';
import { login } from '../../helper/auth';
import { navigateToOrdersDirectly, clickAddOrder, selectExistingCustomer, selectExistingContact, fillOrderDetailsAndCreate, fillOrderDates, addStockProductToOrder, updateOrderShippingBilling, bookOrder, getOrderNumberFromScreen, ensureSourceDropshipIfNeeded, addArtworkToFirstLineItem, duplicateFirstLineItem, changeArtworkLocation, expectTwoWorkOrdersToBeCreated, navigateToDocumentsInOrder, openNthWorkOrder, getOrderTestData } from '../../helper/orders';
import { navigateToReceivingAndOpenOrder, makeSureGroupByAllAttachedDecorationInSingleProductIsSet, navigateToAdminConfig, verifyWorkOrderIsCorrect } from '../../helper/ui-helpers';

test.describe('receiving suite', () => {
  test.describe.configure({ timeout: 350000, retries: 0 });

  test('CorrectWorkOrderNumbersInReceiving', async ({ page }: { page: Page }) => {
    const { OrderNameF, testOrderO } = getOrderTestData();

    await login(page);
    console.log('login done');
    await navigateToAdminConfig(page);
    console.log('navigateToAdminConfig done');
    await makeSureGroupByAllAttachedDecorationInSingleProductIsSet(page);
    console.log('makeSureGroupByAllAttachedDecorationInSingleProductIsSet done');
    await navigateToOrdersDirectly(page);
    console.log('navigateToOrdersDirectly done');
    await clickAddOrder(page);
    console.log('clickAddOrder done');
    await selectExistingCustomer(page);
    console.log('selectExistingCustomer done');
    await selectExistingContact(page);
    console.log('selectExistingContact done');
    await fillOrderDetailsAndCreate(page, OrderNameF, testOrderO);
    console.log('fillOrderDetailsAndCreate done');
    await fillOrderDates(page, '22-09-2030', '28', '28');
    console.log('fillOrderDates done');
    await addStockProductToOrder(page, '50639720', '10', 'Black', 'quantity-input-0-0');
    console.log('addStockProductToOrder done');
    await addArtworkToFirstLineItem(page);
    console.log('addArtworkToFirstLineItem done');
    await duplicateFirstLineItem(page);
    console.log('duplicateFirstLineItem done');
    await changeArtworkLocation(page, 2, 'Apron Bottom Right');
    console.log('changeArtworkLocation done');
    await updateOrderShippingBilling(page);
    console.log('updateOrderShippingBilling done');
    await bookOrder(page);
    console.log('bookOrder done');
    const orderNumber = await getOrderNumberFromScreen(page);
    console.log('getOrderNumberFromScreen done');
    await page.waitForTimeout(2000);
    console.log('page.waitForTimeout done');
    await ensureSourceDropshipIfNeeded(page, [
      { sourceLocation: 'first', clickUpdate: true },
      { sourceLocation: 1, clickUpdate: true }
    ]);
    console.log('ensureSourceDropshipIfNeeded done');
    await page.reload();
    console.log('page.reload done');
    // await navigateToReceivingAndOpenOrder(page, orderNumber);
    await expect(page.getByText('Basic Order Info Edit Order')).toBeVisible({ timeout: 20000 });
    console.log('expect(page.getByText done');
    await navigateToDocumentsInOrder(page);
    console.log('navigateToDocumentsInOrder done');
    await expectTwoWorkOrdersToBeCreated(page);
    console.log('expectTwoWorkOrdersToBeCreated done');
    await openNthWorkOrder(page, 2);
    console.log('openNthWorkOrder done');
    await verifyWorkOrderIsCorrect(page, 1, 2, 'Left Arm');
    await page.reload();
    // await navigateToReceivingAndOpenOrder(page, orderNumber);
    await navigateToDocumentsInOrder(page);
    await openNthWorkOrder(page, 3);
    await verifyWorkOrderIsCorrect(page, 2, 2, 'Apron Bottom Right');
    await navigateToReceivingAndOpenOrder(page, orderNumber);
    await expect(page.getByRole('grid')).toContainText(`Work Order: #${orderNumber}-001`);
    await expect(page.getByRole('grid')).toContainText(`Work Order: #${orderNumber}-002`);
    await expect(page.getByRole('grid')).toContainText(`Long buttoned shirt DiegoP Stock SKU: 001FD00025 Inhouse ID: 50639720 Part Id: 985222 Work Order: #${orderNumber}-001 Item #: S658 Color: Black Size: S UOM: / Embroidery`);
    await expect(page.getByRole('grid')).toContainText(`Long buttoned shirt DiegoP Stock SKU: 001FD00025 Inhouse ID: 50639720 Part Id: 985222 Work Order: #${orderNumber}-002 Item #: S658 Color: Black Size: S UOM: / Embroidery`);

  });
});
