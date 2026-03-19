import { expect, type Page } from '@playwright/test';
import { navigateToOrders, navigateToOrdersDirectly } from './orders';
import { waitForLoader } from './ui-helpers';
import { BASE_URL } from './base-url';

// Timeout for navigation
const TIMEOUT_NAVIGATION = 50000;

// Global variable to store the current order's total for validation calculations
let orderTotal = 0;

/**
 * Normalizes numeric strings for comparison by removing currency symbols and commas
 * @param value - The string value to normalize (e.g., "$1,234.56")
 * @returns Normalized numeric string (e.g., "1234.56") or "0" if empty
 */
export function normalizeNumericString(value: string): string {
  let normalized = value.replace(/[$,]/g, '').trim();
  if (normalized === '') normalized = '0';
  const isNumeric = !isNaN(parseFloat(normalized));
  if (isNumeric) {
    return parseFloat(normalized).toString();
  }
  return normalized;
}

/**
 * Extracts a value from text that follows a specific label
 * Handles pipe-separated format: "Label: value | OtherLabel: value"
 * @param fullText - The full text containing the label and value
 * @param label - The label to search for (e.g., "Order Total:")
 * @returns The extracted value, or "0" if value starts with pipe, or "" if label not found
 */
export function extractValueAfterLabel(fullText: string, label: string): string {
  if (!fullText.includes(label)) {
    console.log(`[extractValueAfterLabel] Label not found, returning empty string`);
    return '';
  }

  const startIndex = fullText.indexOf(label) + label.length;
  let remainingText = fullText.substring(startIndex).trim();
  console.log(`[extractValueAfterLabel] Remaining text after label: "${remainingText}"`);

  if (remainingText.startsWith('|')) {
    console.log(`[extractValueAfterLabel] Starts with pipe, returning "0"`);
    return '0';
  }

  if (remainingText.includes('|')) {
    const extractedValue = remainingText.split('|')[0].trim();
    console.log(`[extractValueAfterLabel] Extracted value (before pipe): "${extractedValue}"`);
    return extractedValue;
  }

  console.log(`[extractValueAfterLabel] Extracted value: "${remainingText}"`);
  return remainingText;
}

/**
 * Extracts numeric order total value from formatted text
 * @param text - Text containing "Order Total: $X,XXX.XX"
 * @returns Numeric order total value
 */
export function extractOrderTotalValue(text: string): number {
  const value = extractValueAfterLabel(text, 'Order Total:');
  return parseFloat(value.replace(/[$,]/g, '')) || 0;
}

/**
 * Generic helper to extract a numeric field value from the order detail page
 * @param orderPage - The order detail page
 * @param fieldLabel - The field label to search for (e.g., "Subtotal", "Gross Profit")
 * @returns The numeric value, or null if not found
 */
export async function extractNumericFieldValue(orderPage: Page, fieldLabel: string): Promise<number | null> {
  const fieldElement = orderPage.getByText(new RegExp(`${fieldLabel}:`));
  const hasField = await fieldElement.count() > 0;

  if (!hasField) {
    return null;
  }

  const fieldText = (await fieldElement.first().innerText()).trim();
  const fieldStringValue = extractValueAfterLabel(fieldText, `${fieldLabel}:`);
  const fieldValue = parseFloat(fieldStringValue.replace(/[$,]/g, '')) || 0;

  return fieldValue;
}

/**
 * Extracts the Subtotal value from the order detail page
 * @param orderPage - The order detail page
 * @returns The subtotal value, or null if not found
 */
export async function extractSubtotal(orderPage: Page): Promise<number | null> {
  return extractNumericFieldValue(orderPage, 'Subtotal');
}

/**
 * Calculates Total Cost from order detail page (Subtotal - Gross Profit)
 * @param orderPage - The order detail page
 * @returns The calculated total cost value, or null if required fields not found
 */
export async function calculateTotalCost(orderPage: Page): Promise<number | null> {
  console.log('[calculateTotalCost] Starting Total Cost calculation');

  const subtotal = await extractSubtotal(orderPage);
  const grossProfit = await extractNumericFieldValue(orderPage, 'Gross Profit');

  console.log(`[calculateTotalCost] Subtotal exists: ${subtotal !== null}, Gross Profit exists: ${grossProfit !== null}`);

  if (subtotal !== null && grossProfit !== null) {
    const totalCost = subtotal - grossProfit;

    console.log(`[calculateTotalCost] Subtotal: ${subtotal}, Gross Profit: ${grossProfit}, Total Cost: ${totalCost}`);

    return totalCost;
  }

  console.log('[calculateTotalCost] Required fields not found, returning null');
  return null;
}

/**
 * Calculates Sales Tax from order detail page (Order Total - Subtotal)
 * @param orderPage - The order detail page
 * @returns The calculated sales tax value, or null if required fields not found
 */
export async function calculateSalesTax(orderPage: Page): Promise<number | null> {
  console.log('[calculateSalesTax] Starting Sales Tax calculation');

  const subtotal = await extractSubtotal(orderPage);

  console.log(`[calculateSalesTax] Subtotal exists: ${subtotal !== null}, Order Total: ${orderTotal}`);

  if (subtotal !== null && orderTotal > 0) {
    const salesTax = Math.round((orderTotal - subtotal) * 100) / 100;

    console.log(`[calculateSalesTax] Order Total: ${orderTotal}, Subtotal: ${subtotal}, Sales Tax: ${salesTax}`);

    return salesTax;
  }

  console.log('[calculateSalesTax] Required fields not found, returning null');
  return null;
}

/**
 * Determines payment status based on balance relative to order total
 */
export function derivePaymentStatus(balance: number, total: number): string {
  if (balance === 0) return 'Paid';
  if (balance > 0 && balance < total) return 'Partial';
  return 'Unpaid';
}

/**
 * Resolves a payment-related field value given computed payment data
 */
export function resolvePaymentField(fieldName: string, status: string, paymentAmount: number, balance: number): string {
  if (fieldName === 'Payment Status') return status;
  if (fieldName === 'Payment Amount') return paymentAmount.toString();
  return balance.toString(); // Balance
}

/**
 * Reads a field value from the order detail page, including derived payment fields
 * @param orderPage - The order detail page
 * @param detailPageFieldName - The label name to look for
 * @returns Whether the field was found and its value
 */
export async function getOrderDetailFieldValue(
  orderPage: Page,
  detailPageFieldName: string
): Promise<{ found: boolean; value: string }> {
  let fieldValue = '';
  let fieldCount = 0;

  // Handle Name field specially since it's extracted from the page title
  if (detailPageFieldName === 'Name') {
    const titleElement = orderPage.getByText(/Order\s+#.*\s+for\s+/i);
    if (await titleElement.count() > 0) {
      const titleText = (await titleElement.first().innerText()).trim();
      // Expected format: "Order #23264 for Eric Demo Web Store (Do Not Edit) - Webstore Order"
      const match = titleText.match(/for\s+(.*?)(?:\s+-|$)/i);
      if (match && match[1]) {
        fieldValue = match[1].trim();
        fieldCount = 1;
      }
    }
  } else if (detailPageFieldName === 'Total Cost') {
    const totalCost = await calculateTotalCost(orderPage);
    if (totalCost !== null) {
      fieldValue = totalCost.toString();
      fieldCount = 1;
    }
  } else if (detailPageFieldName === 'Sales Tax') {
    // Handle Sales Tax as calculated field (Order Total - Subtotal)
    const salesTax = await calculateSalesTax(orderPage);
    if (salesTax !== null) {
      fieldValue = salesTax.toString();
      fieldCount = 1;
    }
  } else if (detailPageFieldName === 'Payment Status' || detailPageFieldName === 'Payment Amount' || detailPageFieldName === 'Balance') {
    // Read order status from the detail page to determine payment logic shortcuts
    const statusElement = orderPage.getByText(/Status:/);
    let orderStatus = '';
    if (await statusElement.count() > 0) {
      const statusText = (await statusElement.first().innerText()).trim();
      orderStatus = extractValueAfterLabel(statusText, 'Status:').split(' ')[0].trim();
    }
    console.log(`[Payment] Order Status: "${orderStatus}", Order Total: ${orderTotal}`);

    const isPendingOrBooked = orderStatus === 'Pending' || orderStatus === 'Booked';
    const isBilledOrVoided = orderStatus === 'Billed' || orderStatus === 'Voided';

    // Shortcut: $0 total with known status → skip payment table
    // Pending/Booked + $0 → Unpaid | Billed/Voided + $0 → Paid
    if (orderTotal === 0 && (isPendingOrBooked || isBilledOrVoided)) {
      const status = isPendingOrBooked ? 'Unpaid' : 'Paid';
      console.log(`[Payment] Shortcut: ${orderStatus} + $0 total → ${status}`);
      fieldValue = resolvePaymentField(detailPageFieldName, status, 0, 0);
      fieldCount = 1;

      // Otherwise, check the payments table
    } else {
      let balanceNum: number | null = null;

      const balanceHeader = orderPage.getByRole('columnheader', { name: 'Balance' });
      if (await balanceHeader.count() > 0) {
        const table = balanceHeader.locator('xpath=ancestor::table').first();
        const rows = table.locator('tbody tr');
        const rowCount = await rows.count();

        if (rowCount > 0) {
          const headers = await table.locator('thead th, thead td').allTextContents();
          const balanceColIndex = headers.findIndex(h => h.trim().includes('Balance'));
          if (balanceColIndex !== -1) {
            const balanceCell = rows.last().locator('td').nth(balanceColIndex);
            const balanceValue = (await balanceCell.innerText()).trim();
            balanceNum = parseFloat(balanceValue.replace(/[$,]/g, ''));
          }
        }
      }

      // If no balance data found, assume full balance equals order total (no payments made)
      const effectiveBalance = balanceNum ?? orderTotal;
      const paymentStatus = derivePaymentStatus(effectiveBalance, orderTotal);
      const paymentAmount = orderTotal - effectiveBalance;
      fieldValue = resolvePaymentField(detailPageFieldName, paymentStatus, paymentAmount, effectiveBalance);
      fieldCount = 1;
    }
  } else {
    const fieldElement = orderPage.getByText(new RegExp(`${detailPageFieldName}:`));
    fieldCount = await fieldElement.count();

    if (fieldCount > 0) {
      const fieldText = (await fieldElement.first().innerText()).trim();
      fieldValue = extractValueAfterLabel(fieldText, `${detailPageFieldName}:`);
    }
  }

  return { found: fieldCount > 0, value: fieldValue };
}

/**
 * Extracts the order total from the order detail page and updates the global variable
 * @param orderPage - The order detail page
 * @returns The extracted order total value
 */
export async function extractAndSetOrderTotal(orderPage: Page): Promise<number> {
  const orderTotalElement = orderPage.getByText(/Order Total:/);
  const orderTotalCount = await orderTotalElement.count();
  orderTotal = 0;

  if (orderTotalCount > 0) {
    const orderTotalText = (await orderTotalElement.first().innerText()).trim();
    orderTotal = extractOrderTotalValue(orderTotalText);
  }

  console.log(`Order Total extracted: $${orderTotal}`);
  return orderTotal;
}
