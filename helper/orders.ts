import { type Page, expect } from '@playwright/test';
import { waitForLoader } from './ui-helpers';
import { BASE_URL } from './base-url';

const TIMEOUT_NAVIGATION = 7000;
/**
 * Navigates directly to the orders page URL and waits for the network to be idle.
 * @param page The Playwright Page object
 */
export async function navigateToOrdersDirectly(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/e-commerce/orders/v1`);
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigates to the orders page using the application menu and sidebar.
 * @param page The Playwright Page object
 */
export async function navigateToOrders(page: Page): Promise<void> {
  // Open menu
  const menuButton = page.locator('mat-toolbar button', { hasText: 'menu' });
  await menuButton.click();

  // Navigate to Orders
  await page.getByText('view_listOrder').click();
  await page.waitForTimeout(3000);
  await page.getByRole('link', { name: /Orders/i }).click();

  // Close sidebar overlay
  const sidebarButton = page.locator('fuse-navbar').getByRole('button');
  await sidebarButton.click({ timeout: TIMEOUT_NAVIGATION });

  await page.locator('.fuse-sidebar-overlay').click();
  await page.waitForTimeout(5000);

  await page.waitForLoadState('networkidle');
}
/**
 * Generates a random alphanumeric string of a specified length.
 * @param length The length of the string to generate
 * @returns The generated random string
 */
export function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let randomString = '';
  for (let i = 0; i < length; i++) {
    randomString += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return randomString;
}

/**
 * Interface representing test data for an order.
 */
export interface OrderTestData {
  randomNameOr: string;
  OrderNameF: string;
  OrderNameL: string;
  emailLeadO: string;
  testOrderO: string;
}

export interface OrderTestDataSimple {
  OrderNameF: string;
  testOrderO: string;
}

/**
 * Generates random test data for an order including names and a test email.
 * @returns The generated OrderTestData
 */
export function generateOrderTestData(): OrderTestData {
  const randomNameOr = generateRandomString(10);
  return {
    randomNameOr,
    OrderNameF: 'Firstname' + randomNameOr,
    OrderNameL: 'Lastname' + randomNameOr,
    emailLeadO: randomNameOr + '@anterasoftware.com',
    testOrderO: 'test order' + randomNameOr,
  };
}

/**
 * Generates random test data for an order including names and a test email.
 * @returns The generated OrderTestData
 */
export function getOrderTestData(): OrderTestDataSimple {
  return {
    OrderNameF: 'Diego PartidaContact',
    testOrderO: 'test order',
  };
}

/**
 * Clicks the speed dial button to initiate adding a new order.
 * @param page The Playwright Page object
 */
export async function clickAddOrder(page: Page): Promise<void> {
  await page.locator('p-speeddial').getByRole('button').click();
  await page.getByRole('menuitem', { name: '' }).click();
}

/**
 * Creates a new customer account with the specified name.
 * @param page The Playwright Page object
 * @param customerName The name of the customer to create
 */
export async function createNewCustomer(page: Page, customerName: string): Promise<void> {
  await page.getByLabel('Customer Name *').click();
  await page.getByRole('combobox', { name: 'Customer Name' }).fill(customerName);
  await page.getByText('add Add Account').click();
  await page.waitForTimeout(2000);
  await page.getByRole('textbox', { name: 'Name', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(customerName);
  await page.getByRole('textbox', { name: 'Name', exact: true }).click();
  await page.getByLabel('Save').click();
  await page.getByText(customerName).click();
}

/**
 * Creates a new contact with the provided first name, last name, and email address.
 * @param page The Playwright Page object
 * @param firstName The first name of the contact
 * @param lastName The last name of the contact
 * @param email The email address of the contact
 */
export async function createNewContact(page: Page, firstName: string, lastName: string, email: string): Promise<void> {
  await page.getByRole('combobox', { name: 'Contact Name' }).click();
  await page.getByRole('combobox', { name: 'Contact Name' }).fill(lastName);
  await page.getByText('add Add Contact').click();
  await page.getByLabel('First Name *').click();
  await page.getByPlaceholder('First Name').fill(firstName);
  await page.getByLabel('Last Name *').click();
  await page.getByPlaceholder('Last Name').fill(lastName);
  await page.getByLabel('SAVE').click();
  await page.getByLabel('All fields marked with an').getByLabel('Close dialog').click();
  await page.getByLabel('Email *').click();
  await page.getByPlaceholder('Email').fill(email);
  await page.getByLabel('SAVE').click();
  await page.waitForTimeout(2000);
}

/**
 * Shared helper that selects a value from a named combobox.
 * Waits for the combobox to be visible and enabled, types the search term,
 * then clicks the first matching option.
 */
async function selectFromCombobox(page: Page, comboboxName: string, searchTerm: string, optionText: string): Promise<void> {
  const combo = page.getByRole('combobox', { name: comboboxName });
  await expect(combo).toBeVisible({ timeout: 30_000 });
  await expect(combo).toBeEnabled({ timeout: 30_000 });
  await combo.fill(searchTerm);
  const option = page.getByRole('option', { name: optionText }).first();
  await expect(option).toBeVisible({ timeout: 30_000 });
  await option.click();
}

/**
 * Selects an existing customer from the Customer Name combobox.
 * @param page The Playwright Page object
 * @param customerName The text to type to filter results
 * @param contactName The option text to click
 */
export async function selectExistingCustomer(page: Page, customerName: string = 'Diego Partida Custome', contactName: string = 'Diego Partida Custome'): Promise<void> {
  await selectFromCombobox(page, 'Customer Name', customerName, contactName);
}

/**
 * Selects an existing contact from the Contact Name combobox.
 * @param page The Playwright Page object
 * @param searchTerm The text to type to filter results
 * @param optionText The option text to click
 */
export async function selectExistingContact(page: Page, searchTerm: string = 'Diego PartidaContac', optionText: string = 'Diego PartidaContact'): Promise<void> {
  await selectFromCombobox(page, 'Contact Name', searchTerm, optionText);
}

/**
 * Fills in the customer name and order identity, then creates the order.
 * @param page The Playwright Page object
 * @param customerName The name of the customer
 * @param orderIdentity The identity/reference for the order
 */
export async function fillOrderDetailsAndCreate(page: Page, customerName: string, orderIdentity: string): Promise<void> {
  await page.getByLabel('Order Identity *').click();
  await page.getByLabel('Order Identity *').fill(orderIdentity);
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.waitForTimeout(2000);
}

/**
 * Fills in the customer ship date, due date, and in-hands date for an order.
 * @param page The Playwright Page object
 * @param shipDate The ship date to set
 * @param dueDay The due day to set
 * @param inHandsDay The in-hands day to set
 */
export async function fillOrderDates(page: Page, shipDate: string, dueDay: string, inHandsDay: string): Promise<void> {
  const resolvedDueDay = resolveCalendarDay(dueDay, shipDate);
  const resolvedInHandsDay = resolveCalendarDay(inHandsDay, shipDate);

  await page.getByLabel('Customer Ship Date *').fill(shipDate);
  await page.locator('mat-form-field').filter({ hasText: 'Due Date *' }).getByLabel('Open calendar').click();
  await clickCalendarDay(page, resolvedDueDay);
  await page.locator('mat-form-field').filter({ hasText: 'Customer In-Hands Date' }).getByLabel('Open calendar').click();
  await clickCalendarDay(page, resolvedInHandsDay);
  await page.getByRole('button', { name: 'Create' }).click();
  await waitForLoader(page);

}

function resolveCalendarDay(day: string, fallbackDate: string): string {
  const normalizedDay = normalizeDay(day);
  if (normalizedDay) {
    return normalizedDay;
  }

  const fallbackDay = normalizeDay(extractDayFromDate(fallbackDate));
  if (fallbackDay) {
    return fallbackDay;
  }

  throw new Error(`Unable to resolve a valid calendar day. Received day="${day}" and fallbackDate="${fallbackDate}"`);
}

function extractDayFromDate(dateValue: string): string {
  const match = dateValue.match(/^(\d{1,2})[-/.]\d{1,2}[-/.]\d{2,4}$/);
  return match?.[1] ?? '';
}

function normalizeDay(dayValue: string): string {
  const trimmedDay = (dayValue ?? '').trim();
  if (!trimmedDay) {
    return '';
  }

  const parsedDay = Number.parseInt(trimmedDay, 10);
  if (Number.isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
    return '';
  }

  return String(parsedDay);
}

async function clickCalendarDay(page: Page, day: string): Promise<void> {
  if (!day) {
    throw new Error('Calendar day is required to select a date.');
  }

  await page.getByText(day, { exact: true }).first().click();
}

/**
 * Adds a stock product to an order, specifying color, quantity, and location.
 * @param page The Playwright Page object
 * @param productInHouseNumber The product number to add
 * @param quantity The quantity of the product
 * @param color The color of the product
 * @param testIdQuantityLocation The test ID for the quantity location input
 */
export async function addStockProductToOrder(page: Page, productInHouseNumber: string, quantity: string, color: string, testIdQuantityLocation: string): Promise<void> {
  console.log('calling ensureProductsTabOpen from addStockProductToOrder');
  await ensureProductsTabOpen(page);
  const addNewProduct = page.getByRole('textbox', { name: 'Add A New Product' });
  await addNewProduct.waitFor({ state: 'visible', timeout: 15000 });
  await addNewProduct.click();
  await addNewProduct.fill(productInHouseNumber);
  await page.getByText('+').click();
  await page.getByRole('button', { name: 'Add to Order' }).click();
  await waitForLoader(page, '.loading');
  await page.waitForTimeout(10000);
  // await page.locator('div').filter({ hasText: /^Color$/ }).first().click();
  const colorDropdown = page.locator('div').filter({ hasText: /^Color$/ }).first();
  await colorDropdown.waitFor({ state: 'visible', timeout: 25000 });
  await colorDropdown.click();
  await page.waitForTimeout(2000);
  const colorOption = page.getByRole('option', { name: color });
  await colorOption.waitFor({ state: 'visible', timeout: 25000 });
  await colorOption.click();
  await page.waitForTimeout(2000);
  await page.getByTestId(testIdQuantityLocation).fill(quantity);
  await page.waitForTimeout(4000);
  await clickUpdateButton(page);
  // await page.getByRole('button', { name: 'Yes' }).click();
  // await expect(page.locator('div').filter({ hasText: /^Price Break Confirmation$/ })).toBeVisible();
  // await page.getByRole('button', { name: 'No' }).click();
}

/**
 * Updates the shipping and billing address information for an order with test data.
 * @param page The Playwright Page object
 */
export async function updateOrderShippingBilling(page: Page): Promise<void> {
  await page.getByText('Order Details').click();

  // Wait explicitly for the second Edit button to be visible before clicking
  // const secondEditButton = page.getByRole('button', { name: 'Edit' }).nth(1);
  const secondEditButton = page.getByText('Account Details Edit').locator('button').first();
  await secondEditButton.waitFor({ state: 'visible', timeout: 15000 });
  await secondEditButton.click();

  await page.getByRole('combobox', { name: 'Billing Street' }).click();
  await page.getByRole('combobox', { name: 'Billing Street' }).fill('test');
  await page.getByRole('textbox', { name: 'Billing Street' }).click();
  await page.getByRole('textbox', { name: 'Billing Street' }).fill('test');

  await page.getByRole('textbox', { name: 'Billing City' }).click();
  await page.getByRole('textbox', { name: 'Billing City' }).fill('test');

  await page.getByRole('textbox', { name: 'Billing State/Province' }).click();
  await page.getByRole('textbox', { name: 'Billing State/Province' }).fill('texas');

  await page.getByRole('textbox', { name: 'Billing Postal Code' }).click();
  await page.getByRole('textbox', { name: 'Billing Postal Code' }).fill('75632');

  await page.getByRole('combobox', { name: 'Shipping Street' }).click();
  await page.getByRole('combobox', { name: 'Shipping Street' }).fill('test');
  await page.getByRole('combobox', { name: 'Shipping Street' }).press('Tab');
  await page.getByRole('textbox', { name: 'Shipping Street' }).fill('test');
  await page.getByRole('textbox', { name: 'Shipping Street' }).press('Tab');

  await page.getByRole('textbox', { name: 'Shipping City' }).fill('test');
  await page.getByRole('textbox', { name: 'Shipping City' }).press('Tab');

  await page.getByRole('textbox', { name: 'Shipping State/Province' }).fill('texas');
  await page.getByRole('textbox', { name: 'Shipping State/Province' }).press('Tab');

  await page.getByRole('textbox', { name: 'Shipping Postal Code' }).fill('75465');

  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(3000);
}


/**
 * Navigates to orders page via menu and searches for an order
 * @param page - The main page
 * @param orderNumber - The order number to search for
 * @returns The opened order detail page
 */
export async function openOrderDetailPageViaMenu(
  page: Page,
  orderNumber: string
): Promise<Page> {
  await page.bringToFront();
  await page.reload();
  await navigateToOrdersDirectly(page);
  await page.waitForLoadState('networkidle');

  const searchBox = page.getByRole('textbox', { name: 'Search', exact: true });
  await searchBox.click();
  await searchBox.fill(orderNumber);

  return await searchAndOpenOrder(page, orderNumber);
}

/**
 * Navigates to orders page via direct URL and searches for an order
 * @param page - The main page
 * @param orderNumber - The order number to search for
 * @returns The opened order detail page
 */
export async function openOrderDetailPageDirectly(
  page: Page,
  orderNumber: string
): Promise<Page> {
  await page.bringToFront();
  await page.goto(`${BASE_URL}/e-commerce/orders/v1`);
  await page.waitForLoadState('networkidle');

  const searchBox = page.getByRole('textbox', { name: 'Search', exact: true });
  await expect(searchBox).toBeVisible({ timeout: TIMEOUT_NAVIGATION });
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
export async function searchAndOpenOrder(page: Page, orderNumber: string): Promise<Page> {
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
 * Clicks the book button and waits for the order to be marked as booked.
 * @param page The Playwright Page object
 */
export async function bookOrder(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Book' }).click();
  // await page.waitForTimeout(6000);
  await waitForLoader(page);
  await page.getByText('Booked', { exact: true }).click();
  await page.waitForTimeout(5000);
}

/**
 * Extracts the dynamically generated Order # text from the screen and parses it into a string
 * @param page The Playwright Page object
 * @returns The parsed order number
 */
export async function getOrderNumberFromScreen(page: Page): Promise<string> {
  // Finds the text like "Order #xxxx for Firstnamexx" and extracts the number
  const orderTitleElement = page.getByText(/Order #\d+ for/);
  await orderTitleElement.waitFor({ state: 'visible' });
  const orderText = await orderTitleElement.textContent();

  // orderText should look like "Order #55833 for..."
  // Match "Order #<number>" and extract the <number> group
  const match = orderText?.match(/Order #(\d+)/);

  if (!match || !match[1]) {
    throw new Error(`Could not parse order number from text: ${orderText}`);
  }

  return match[1];
}

/**
 * Ensures the Products tab is open before interacting with product-level controls.
 * Clicks only when the tab is not already selected.
 * @param page The Playwright Page object
 */
export async function ensureProductsTabOpen(page: Page): Promise<void> {
  const productsTab = page.getByRole('tab', { name: 'Products' });
  await productsTab.click();
}

/**
 * Toggles the source filter on the products tab.
 * @param page The Playwright Page object
 */
export async function toggleSourceOn(page: Page): Promise<void> {
  console.log('calling ensureProductsTabOpen from toggleSourceOn');
  await ensureProductsTabOpen(page);
  await page.locator('label').filter({ hasText: 'Source' }).click();
}

async function openSourceMenu(page: Page, sourceLocation: string | number): Promise<void> {
  if (sourceLocation === 'first') {
    await page.getByText('expand_more Source').first().click();
  } else {
    const index = typeof sourceLocation === 'number' ? sourceLocation : parseInt(sourceLocation, 10);
    const expandButtons = page.getByText('expand_more Source').nth(index);
    await expandButtons.waitFor({ state: 'visible', timeout: 15000 });
    await expect(expandButtons).toBeEnabled({ timeout: 15000 });
    await expandButtons.click();
  }
}

/**
 * Changes the resourcing of a product from stock to dropship.
 * @param page The Playwright Page object
 * @param sourceLocation The source location index or 'first' to select
 * @param clickUpdate Whether to click the update button after saving (default: true)
 */
export async function resourcingFromStockToDropship(page: Page, sourceLocation: string | number, clickUpdate: boolean = true): Promise<void> {

  await openSourceMenu(page, sourceLocation);

  await page.waitForTimeout(3000);
  // Explicitly wait for "Auto Assign" to be visible before DropShip action
  // const autoAssignOption = page.getByText('Auto Assign').nth(2);
  // await autoAssignOption.waitFor({ state: 'visible', timeout: 15000 });
  await expect(page.getByText('Stock ReleaseDropShip')).toBeVisible({ timeout: 15000 });

  await page.getByText('Unreserve', { exact: true }).click();
  await page.getByRole('button', { name: 'Yes' }).click();
  await expect(page.locator('.loading')).toBeVisible();
  await expect(page.locator('.loading')).toBeHidden({ timeout: 20000 });
  await page.waitForTimeout(3000);
  await openSourceMenu(page, sourceLocation);
  await page.getByRole('button', { name: 'DropShip' }).click();
  await page.waitForTimeout(3000);
  await page.getByText('Auto Assign').nth(2).click();
  await page.waitForTimeout(3000);
  await expect(page.getByText('Save', { exact: true })).toBeVisible();
  await expect(page.getByText('Save', { exact: true })).toBeEnabled();
  await page.getByText('Save', { exact: true }).click();
  if (clickUpdate) {
    const updateButton = page.getByRole('button', { name: 'Update' });
    await updateButton.waitFor({ state: 'visible', timeout: 30000 });

    await updateButton.click();
    await page.waitForTimeout(6000);
    // await expect(await page.getByText('Group by all attached Decoration in single Product (Common Variation + Location)')).toBeVisible({ timeout: 30000 });
    // await expect(await page.getByText('Order updated successfully').first()).toBeVisible({ timeout: 15000 });
    const orderUpdated = await page.getByText('Order updated successfully').first();
    await orderUpdated.waitFor({ state: 'visible', timeout: 15000 });
    await orderUpdated.waitFor({ state: 'hidden', timeout: 15000 });
  } else {
    // Just wait briefly for the modal to close and the page to process
    await page.waitForTimeout(2000);
  }
}

export interface ResourcingStep {
  sourceLocation: string | number;
  clickUpdate?: boolean;
}

/**
 * Runs source toggle + resourcing only when "Source: Dropship" is not already visible.
 * @param page The Playwright Page object
 * @param steps One or more resourcing steps (default: first line with update)
 */
export async function ensureSourceDropshipIfNeeded(page: Page, steps: ResourcingStep[] = [{ sourceLocation: 'first' }]): Promise<void> {
  
  console.log('calling ensureProductsTabOpen from ensureSourceDropshipIfNeeded');
  await ensureProductsTabOpen(page);
  await expect(page.getByText('Source:').first()).toBeVisible({ timeout: 15000 });

  const sourceDropshipVisible = await page.getByText('Source: Dropship').first().isVisible();
  if (sourceDropshipVisible) {
    return;
  }

  await toggleSourceOn(page);
  for (const step of steps) {
    await resourcingFromStockToDropship(page, step.sourceLocation, step.clickUpdate ?? true);
  }
}

/**
 * Selects the checkbox for the first line item in the grid.
 * @param page The Playwright Page object
 */
export async function selectFirstLineItem(page: Page): Promise<void> {
  await page.locator('.mat-grid-tile-content span.mat-checkbox-inner-container').click();
  await page.waitForTimeout(4000);

}

/**
 * Clicks the artwork icon for the selected item.
 * @param page The Playwright Page object
 */
export async function selectArtworkIcon(page: Page): Promise<void> {
  await page.locator('#action-artwork').getByText('palette').click();
  await page.waitForTimeout(4000);
}

/**
 * Adds an existing artwork to the first selected line item.
 * @param page The Playwright Page object
 * @param artworkNumber The artwork number to search for and add (default: 'D007833')
 */
export async function addArtworkToFirstLineItem(page: Page, artworkNumber: string = 'D007833'): Promise<void> {
  await selectFirstLineItem(page);
  await selectArtworkIcon(page);
  await page.getByText('photoSelect Existing').click();
  await page.locator('#mat-slide-toggle-6 div').nth(2).click();
  await page.getByText('list', { exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search' }).fill(artworkNumber);
  await page.locator('#antera-order-form-details-sidenav').getByText('search').click();
  await page.locator('.preview-card-checkbox span.mat-checkbox-inner-container').first().click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForTimeout(3000);
  await page.getByText('Add To Selected Only add this').click();
  await page.waitForTimeout(5000);
}

/**
 * Duplicates the first line item in the order.
 * @param page The Playwright Page object
 */
export async function duplicateFirstLineItem(page: Page): Promise<void> {
  await page.getByText('more_vert').first().click();
  await page.getByRole('menuitem', { name: 'Duplicate Line' }).click();
  await page.waitForTimeout(4000);
}

/**
 * Clicks the update button and waits for the action to complete.
 * @param page The Playwright Page object
 */
export async function clickUpdateButton(page: Page): Promise<void> {
  const updateButton = page.getByRole('button', { name: 'Update' });
  await updateButton.waitFor({ state: 'visible', timeout: 15000 });
  await updateButton.click();
  await page.waitForTimeout(9000);
}

/**
 * Edits the specified artwork to change its location and saves the update.
 * @param page The Playwright Page object
 * @param nthArtwork The index for the artwork to edit (1-based, default: 1)
 * @param location The new location text for the artwork (default: 'Apron Bottom Right')
 */
export async function changeArtworkLocation(page: Page, nthArtwork: number = 1, location: string = 'Apron Bottom Right'): Promise<void> {
  await page.getByText('palette').nth(nthArtwork).click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByText(/Location:.*.{2}/).click();
  await page.getByText(location).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await clickUpdateButton(page);
}

/**
 * Asserts that two work orders have been created by checking for the visibility of "Work Order 002".
 * @param page The Playwright Page object
 */
export async function expectTwoWorkOrdersToBeCreated(page: Page): Promise<void> {
  await expect(page.getByText('Work Order 002')).toBeVisible();
}

/**
 * Navigates to the documents tab in an order and verifies the quote document is visible.
 * @param page The Playwright Page object
 */
export async function navigateToDocumentsInOrder(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Documents' }).click();
  await expect(page.getByText('Quote', { exact: true })).toBeVisible();
}

/**
 * Opens a specific work order from the documents sidebar and verifies it is loaded.
 * @param page The Playwright Page object
 * @param nthWorkOrder The index of the work order to open (default: 2)
 */
export async function openNthWorkOrder(page: Page, nthWorkOrder: number = 2): Promise<void> {
  console.log(`Opening work order ${nthWorkOrder}`);
  console.log(`div:nth-child(2) > .documentTypeSidebar_documents_pdf > div:nth-child(${nthWorkOrder})`);
  await page.locator(`div:nth-child(2) > .documentTypeSidebar_documents_pdf > div:nth-child(${nthWorkOrder})`).click();
  await expect(page.getByText(`Work Order (${nthWorkOrder - 1} of 2)`)).toBeVisible({ timeout: 15000 });
}