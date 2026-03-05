import { type Page, expect } from '@playwright/test';

const TIMEOUT_NAVIGATION = 7000;

export async function navigateToOrders(page: Page): Promise<void> {
  // Open menu
  const menuButton = page.locator('mat-toolbar button', { hasText: 'menu' });
  await menuButton.click();

  // Navigate to Orders
  await page.getByText('view_listOrder').click();
  await page.getByRole('link', { name: /Orders/i }).click();

  // Close sidebar overlay
  const sidebarButton = page.locator('fuse-navbar').getByRole('button');
  await sidebarButton.click({ timeout: TIMEOUT_NAVIGATION });

  await page.locator('.fuse-sidebar-overlay').click();
  await page.waitForTimeout(5000);

  await page.waitForLoadState('networkidle');
}
export function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < length; i++) {
    randomString += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return randomString;
}

export async function clickAddOrder(page: Page): Promise<void> {
  await page.locator('p-speeddial').getByRole('button').click();
  await page.getByRole('menuitem', { name: '' }).click();
}

export async function createNewCustomer(page: Page, customerName: string): Promise<void> {
  await page.getByLabel('Customer Name *').click();
  await page.getByRole('combobox', { name: 'Customer Name' }).fill(customerName);
  await page.getByText('add Add Account').click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(customerName);
  await page.getByRole('textbox', { name: 'Name', exact: true }).click();
  await page.getByLabel('Save').click();
  await page.getByText(customerName).click();
}

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

export async function fillOrderDetailsAndCreate(page: Page, customerName: string, orderIdentity: string): Promise<void> {
  await page.getByText(customerName).click();
  await page.getByLabel('Order Identity *').click();
  await page.getByLabel('Order Identity *').fill(orderIdentity);
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.waitForTimeout(2000);
}

export async function fillOrderDates(page: Page, shipDate: string, dueDay: string): Promise<void> {
  await page.getByLabel('Customer Ship Date *').fill(shipDate);
  await page.locator('mat-form-field').filter({ hasText: 'Due Date *' }).getByLabel('Open calendar').click();
  await page.getByText(dueDay, { exact: true }).click();
  await page.getByRole('button', { name: 'Create' }).click();
}

export async function addStockProductToOrder(page: Page, productInHouseNumber: string, quantity: string, color: string, testIdQuantityLocation: string): Promise<void> {
  await page.getByRole('tab', { name: 'Products' }).locator('div').click();
  await page.getByPlaceholder('Add A New Product').click();
  await page.getByPlaceholder('Add A New Product').fill(productInHouseNumber);
  await page.getByText('+').click();
  await page.getByRole('button', { name: 'Add to Order' }).click();
  await page.waitForTimeout(5000);
  await page.locator('div').filter({ hasText: /^Color$/ }).first().click();
  await page.getByRole('option', { name: color }).click();
  await page.waitForTimeout(2000);
  await page.getByTestId(testIdQuantityLocation).fill(quantity);
  await page.waitForTimeout(4000);
  await page.getByRole('button', { name: 'Update' }).click();
  // await page.getByRole('button', { name: 'Yes' }).click();
  await page.waitForTimeout(7000);
  // await expect(page.locator('div').filter({ hasText: /^Price Break Confirmation$/ })).toBeVisible();
  // await page.getByRole('button', { name: 'No' }).click();
}

export async function updateOrderShippingBilling(page: Page): Promise<void> {
  await page.getByText('Order Details').click();
  await page.getByRole('button', { name: 'Edit' }).nth(1).click();

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

export async function bookOrder(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Book' }).click();
  await page.waitForTimeout(6000);
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

export async function toggleSourceOn(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Products' }).click();
  await page.locator('label').filter({ hasText: 'Source' }).click();
}

export async function resourcingFromStockToDropship(page: Page, sourceLocation: string | number): Promise<void> {

  if (sourceLocation === 'first') {
    await page.getByText('expand_more Source').first().click();
  } else {
    const index = typeof sourceLocation === 'number' ? sourceLocation : parseInt(sourceLocation, 10);
    await page.getByText('expand_more Source').nth(index).click();
  }

  await page.waitForTimeout(3000);
  await expect(page.getByText('Auto Assign').nth(2)).toBeVisible();
  await page.getByRole('button', { name: 'DropShip' }).click();
  await page.waitForTimeout(3000);
  await page.getByText('Auto Assign').nth(2).click();
  await page.waitForTimeout(3000);
  await expect(page.getByText('Save', { exact: true })).toBeVisible();
  await page.getByText('Save', { exact: true }).click();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByText('Order updated successfully')).toBeVisible({ timeout: 3000 });
}