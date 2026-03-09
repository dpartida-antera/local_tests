import { test, expect, type Page } from '@playwright/test';
import { login } from '../helper/auth';
import { navigateToModule, waitForLoader, searchByFirstColumnValue, openReceivingDialogByOrderNumber, selectFirstCheckboxAndReceive, searchAndExpectNoRecords, selectAllCheckboxAndReceive, receivePartialQuantity, navigateToReceivingAndOpenOrder, makeSureGroupByAllAttachedDecorationInSingleProductIsSet, navigateToAdminConfig, verifyFirstWorkOrderIsCorrect } from '../helper/ui-helpers';
import { openActivitiesSidebar, clickAddActivityButton, fillAndSaveActivity, verifyGlobalActivity, openFirstActivityItem, editAndSaveActivity } from '../helper/activities-helpers';
import { generateRandomString, generateOrderTestData, navigateToOrders, clickAddOrder, createNewCustomer, createNewContact, fillOrderDetailsAndCreate, fillOrderDates, addStockProductToOrder, updateOrderShippingBilling, bookOrder, getOrderNumberFromScreen, toggleSourceOn, resourcingFromStockToDropship, addArtworkToFirstLineItem, duplicateFirstLineItem, changeArtworkLocation, expectTwoWorkOrdersToBeCreated, navigateToDocumentsInOrder, openNthWorkOrder } from '../helper/orders';

test.describe('receiving suite', () => {
  test.describe.configure({ timeout: 480000, retries: 1 });

  // Verifies the general search works by picking the first Order # from the table and searching it
  test('receiving_general_search', async ({ page }: { page: Page }) => {
    await login(page);
    await navigateToModule(page, 'receiving');
    await waitForLoader(page);
    await searchByFirstColumnValue(page, 'Order #');
  });

  test.describe.serial('Order Activities', () => {
    let sharedOrderNum: string;

    test('should create an activity for an order in receiving', async ({ page }: { page: Page }) => {
      // 1. Login with specific user
      await login(page);

      // 2. Receiving & Row Selection
      sharedOrderNum = await navigateToReceivingAndOpenOrder(page);

      // 3. Open Activities Sidebar
      await openActivitiesSidebar(page);

      // 4. Add New Activity
      await clickAddActivityButton(page);

      // 5. Fill and Save
      const uniqueSubject = `Test Subject ${Date.now()}`;
      await fillAndSaveActivity(page, uniqueSubject);

      // 6. Verify Global Activities
      await verifyGlobalActivity(page, uniqueSubject);
    });

    test('should edit an activity for an order in receiving', async ({ page }: { page: Page }) => {
      // 1. Login with specific user
      await login(page);

      // 2. Receiving & Row Selection
      // Ensure we have a shared order number from the first test
      if (!sharedOrderNum) {
        throw new Error('sharedOrderNum is not set. The create test must run and succeed first.');
      }

      await navigateToReceivingAndOpenOrder(page, sharedOrderNum);

      // 3. Open Activities Sidebar
      await openActivitiesSidebar(page);

      // 4. Open the first activity
      await openFirstActivityItem(page);

      // 5. Edit and Save
      const editedSubject = `Edited Subject ${Date.now()}`;
      await editAndSaveActivity(page, editedSubject);

      // 6. Verify the edit
      // It should now be visible in the sidebar list with the new subject
      await expect(page.getByText(`${editedSubject}`).first()).toBeVisible();
    });
  });

  test('should receive by selecting individual checkbox', async ({ page }: { page: Page }) => {
    //order test
    const { OrderNameF, OrderNameL, emailLeadO, testOrderO } = generateOrderTestData();

    // 1. Login with specific user
    await login(page);

    // 2. Order Creation
    await navigateToOrders(page);
    await clickAddOrder(page);
    await createNewCustomer(page, OrderNameF);
    await createNewContact(page, OrderNameF, OrderNameL, emailLeadO);
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
    await selectFirstCheckboxAndReceive(page);
    await waitForLoader(page);
    //search for the order and expecting to not find it
    await searchAndExpectNoRecords(page, orderNumber);

  });


  test('should receive by selecting all checkbox', async ({ page }: { page: Page }) => {
    //order test
    const { OrderNameF, OrderNameL, emailLeadO, testOrderO } = generateOrderTestData();

    // 1. Login with specific user
    await login(page);

    // 2. Order Creation
    await navigateToOrders(page);
    await clickAddOrder(page);
    await createNewCustomer(page, OrderNameF);
    await createNewContact(page, OrderNameF, OrderNameL, emailLeadO);
    await fillOrderDetailsAndCreate(page, OrderNameF, testOrderO);
    await fillOrderDates(page, '22-09-2030', '28');
    await addStockProductToOrder(page, '50639720', '10', 'Black', 'quantity-input-0-0');
    await addStockProductToOrder(page, '50639720', '10', 'Green', 'quantity-input-1-0');
    await updateOrderShippingBilling(page);
    await bookOrder(page);
    const orderNumber = await getOrderNumberFromScreen(page);
    await page.waitForTimeout(2000);
    await toggleSourceOn(page);
    await resourcingFromStockToDropship(page, 'first');
    await resourcingFromStockToDropship(page, 1);
    await navigateToReceivingAndOpenOrder(page, orderNumber);
    await selectAllCheckboxAndReceive(page);
    await waitForLoader(page);
    //search for the order and expecting to not find it
    await searchAndExpectNoRecords(page, orderNumber);

  });
  test('PartialReceiving', async ({ page }: { page: Page }) => {
    //order test
    const { OrderNameF, OrderNameL, emailLeadO, testOrderO } = generateOrderTestData();

    // 1. Login with specific user
    await login(page);

    // 2. Order Creation
    await navigateToOrders(page);
    await clickAddOrder(page);
    await createNewCustomer(page, OrderNameF);
    await createNewContact(page, OrderNameF, OrderNameL, emailLeadO);
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
  test.only('CorrectWorkOrderNumbersInReceiving', async ({ page }: { page: Page }) => {
    const { OrderNameF, OrderNameL, emailLeadO, testOrderO } = generateOrderTestData();

    await login(page);
    // await navigateToAdminConfig(page);
    // await makeSureGroupByAllAttachedDecorationInSingleProductIsSet(page);
    // await clickAddOrder(page);
    // await createNewCustomer(page, OrderNameF);
    // await createNewContact(page, OrderNameF, OrderNameL, emailLeadO);
    // await fillOrderDetailsAndCreate(page, OrderNameF, testOrderO);
    // await fillOrderDates(page, '22-09-2030', '28');
    // await addStockProductToOrder(page, '50639720', '10', 'Black', 'quantity-input-0-0');
    // await addArtworkToFirstLineItem(page);
    // await duplicateFirstLineItem(page);
    // await changeArtworkLocation(page, 2, 'Apron Bottom Right');
    await page.goto('https://dev.anterasaas.com/e-commerce/orders/e4e97a63-1969-11f1-be08-02aa6a9eb851');
    await expect(page.getByText('Basic Order Info Edit Order')).toBeVisible({ timeout: 20000 });
    await navigateToDocumentsInOrder(page);
    await expectTwoWorkOrdersToBeCreated(page);
    await openNthWorkOrder(page, 1);
    await verifyFirstWorkOrderIsCorrect(page);

  })
});
