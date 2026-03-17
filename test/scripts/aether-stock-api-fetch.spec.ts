import { test, expect } from '@playwright/test';

test('receiving_stock_api_fetch', async () => {
  const endpoint = 'https://dev-playwright.aether-stores.io/public/api/v1/advance/products/stock/6563';
  const payload = {
    meta: {
      offset: 0,
      limit: 30,
      orient: 'desc',
      type: true,
      completed: false,
      order: 'productId',
    },
    params: {
      color: 'No Color',
      live: 0,
    },
    advanceUrl: 'https://dev.anterasaas.com/protected',
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      priority: 'u=1, i',
    },
    referrer: 'https://dev-playwright.aether-stores.io/admin/products/6835cfa8145e50d51c9000c7',
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let responseBody: unknown;

  try {
    responseBody = JSON.parse(responseText);
  } catch {
    responseBody = responseText;
  }

  console.log('Stock API status:', response.status);
  console.log('Stock API body:', responseBody);

  const errorDetails = typeof responseBody === 'string'
    ? responseBody
    : JSON.stringify(responseBody);

  expect(
    response.ok,
    `Stock API request failed with status ${response.status}: ${errorDetails}`
  ).toBeTruthy();
});
