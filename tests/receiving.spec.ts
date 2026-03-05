import { test, expect, type Page } from '@playwright/test';
import { login } from '../helper/auth';
import { navigateToModule, waitForLoader, searchByFirstColumnValue, openReceivingDialogByOrderNumber, selectFirstCheckboxAndReceive, searchAndExpectNoRecords, selectAllCheckboxAndReceive, receivePartialQuantity, navigateToReceivingAndOpenOrder } from '../helper/ui-helpers';
import { openActivitiesSidebar, clickAddActivityButton, fillAndSaveActivity, verifyGlobalActivity, openFirstActivityItem, editAndSaveActivity } from '../helper/activities-helpers';
import { generateRandomString, navigateToOrders, clickAddOrder, createNewCustomer, createNewContact, fillOrderDetailsAndCreate, fillOrderDates, addStockProductToOrder, updateOrderShippingBilling, bookOrder, getOrderNumberFromScreen, toggleSourceOn, resourcingFromStockToDropship } from '../helper/orders';

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
    const randomNameOr = generateRandomString(10);
    const OrderNameF = 'Firstname' + randomNameOr;
    const OrderNameL = 'Lastname' + randomNameOr;
    const emailLeadO = randomNameOr + '@anterasoftware.com';
    const testOrderO = 'test order' + randomNameOr;

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
    const randomNameOr = generateRandomString(10);
    const OrderNameF = 'Firstname' + randomNameOr;
    const OrderNameL = 'Lastname' + randomNameOr;
    const emailLeadO = randomNameOr + '@anterasoftware.com';
    const testOrderO = 'test order' + randomNameOr;

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
    const randomNameOr = generateRandomString(10);
    const OrderNameF = 'Firstname' + randomNameOr;
    const OrderNameL = 'Lastname' + randomNameOr;
    const emailLeadO = randomNameOr + '@anterasoftware.com';
    const testOrderO = 'test order' + randomNameOr;

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
});
