import { test, expect, type Page } from '@playwright/test';
import { login } from '../../helper/auth';
import { navigateToModule, waitForLoader, searchByFirstColumnValue, selectFirstCheckboxAndReceive, searchAndExpectNoRecords, selectAllCheckboxAndReceive, receivePartialQuantity, navigateToReceivingAndOpenOrder, makeSureGroupByAllAttachedDecorationInSingleProductIsSet, navigateToAdminConfig, verifyWorkOrderIsCorrect, performSearchInModule } from '../../helper/ui-helpers';
import { openActivitiesSidebar, clickAddActivityButton, fillAndSaveActivity, verifyGlobalActivity, openFirstActivityItem, editAndSaveActivity } from '../../helper/activities-helpers';
import { navigateToOrdersDirectly, clickAddOrder, selectExistingCustomer, selectExistingContact, fillOrderDetailsAndCreate, fillOrderDates, addStockProductToOrder, updateOrderShippingBilling, bookOrder, getOrderNumberFromScreen, toggleSourceOn, resourcingFromStockToDropship, addArtworkToFirstLineItem, duplicateFirstLineItem, changeArtworkLocation, expectTwoWorkOrdersToBeCreated, navigateToDocumentsInOrder, openNthWorkOrder, getOrderTestData } from '../../helper/orders';
import { openOrderDetailPageViaMenu } from '../../helper/order-helpers';
import { modifyModuleTags, modifyModuleTagsMachineView, searchByTagAndOrder, modifyModuleTagsStatusView } from '../../helper/production-helpers';

test.describe('receiving suite', () => {
  test.describe.configure({ timeout: 350000, retries: 0 });

  // Verifies the general search works by picking the first Order # from the table and searching it
  test('receiving_general_search', async ({ page }: { page: Page }) => {
    await login(page);
    await navigateToModule(page, 'receiving');
    await waitForLoader(page);
    await page.waitForTimeout(2000);
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
    await selectFirstCheckboxAndReceive(page);
    await waitForLoader(page);
    //search for the order and expecting to not find it
    await searchAndExpectNoRecords(page, orderNumber);

  });


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
    await toggleSourceOn(page);
    await resourcingFromStockToDropship(page, 'first', false);
    await resourcingFromStockToDropship(page, 1, true);
    await navigateToReceivingAndOpenOrder(page, orderNumber);
    await selectAllCheckboxAndReceive(page);
    await waitForLoader(page);
    //search for the order and expecting to not find it
    await searchAndExpectNoRecords(page, orderNumber);

  });
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
    await fillOrderDates(page, '22-09-2030', '28');
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
    await toggleSourceOn(page);
    console.log('toggleSourceOn done');
    await resourcingFromStockToDropship(page, 'first', false);
    console.log('resourcingFromStockToDropship done');
    await resourcingFromStockToDropship(page, 1, true);
    console.log('resourcingFromStockToDropship done');
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

  test.describe.serial('Production Tags', () => {
    const orderNumber = '55975';

    test('should add tags to production', async ({ page }: { page: Page }) => {
      await login(page);
      console.log('login done');
      await navigateToOrdersDirectly(page);
      console.log('navigateToOrdersDirectly done');
      // oawait searchByFirstColumnValue(page, "Order");
      const orderPage = await openOrderDetailPageViaMenu(page, orderNumber);
      console.log('searchAndOpenOrder done');
      await expect(orderPage.getByRole('heading', { name: 'Basic Order Info' })).toBeVisible({ timeout: 15000 });
      await orderPage.getByRole('button', { name: 'Actions' }).click();
      await orderPage.getByRole('menuitem', { name: 'Update Production' }).click();
      await orderPage.getByRole('button', { name: 'Production Refresh' }).click();
      await page.bringToFront();
      await navigateToModule(page, 'productions');
      await performSearchInModule(page, orderNumber);
      await modifyModuleTags(page, 'Add Module Tags', 'Fast Production', 'Add');
      console.log('performSearchInModule done');
      await searchByTagAndOrder(page, 'Fast Production', orderNumber);
      await expect(page.locator('tbody')).toContainText(orderNumber);
    });

    test('should remove tags from production', async ({ page }: { page: Page }) => {
      await login(page);
      await navigateToModule(page, 'productions');
      await performSearchInModule(page, orderNumber);
      await modifyModuleTags(page, 'Remove Module Tags', 'Fast Production', 'Save');
      await searchByTagAndOrder(page, 'Fast Production', orderNumber);
      await expect(page.locator('tbody')).not.toContainText(orderNumber);
    });

    const setupProductionTagsTest = async (page: Page) => {
      await login(page);
      console.log('login done');
      await navigateToModule(page, 'productions');
      await performSearchInModule(page, orderNumber);
      await page.waitForTimeout(6000);
    };

    const views = [
      { name: 'Machine View', modifyFunc: modifyModuleTagsMachineView, expectedRemoveText: 'Pending (8h) 0 Jobs 0 Pieces' },
      { name: 'Status View', modifyFunc: modifyModuleTagsStatusView, expectedRemoveText: 'Pending 0 Jobs 0 Pieces' }
    ];

    for (const { name, modifyFunc, expectedRemoveText } of views) {
      test(`should add tags to production in ${name}`, async ({ page }: { page: Page }) => {
        await setupProductionTagsTest(page);
        await modifyFunc(page, 'Add Module Tags', 'Fast Production', 'Add');
        console.log('performSearchInModule done');
        await searchByTagAndOrder(page, 'Fast Production', orderNumber);
        await expect(page.getByText('Order#').nth(1)).toBeVisible();
      });

      test(`should remove tags to production in ${name}`, async ({ page }: { page: Page }) => {
        await setupProductionTagsTest(page);
        await modifyFunc(page, 'Remove Module Tags', 'Fast Production', 'Save');
        console.log('performSearchInModule done');
        await searchByTagAndOrder(page, 'Fast Production', orderNumber);
        await expect(page.getByText(expectedRemoveText)).toBeVisible({ timeout: 25000 });
      });
    }
  });
});
