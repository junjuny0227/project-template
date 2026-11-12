import { expect, test } from '@playwright/test';

test('web /backend/health reaches api and database', async ({ request }) => {
  const response = await request.get('/backend/health');

  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    status: 'ok',
    details: { database: { status: 'up' } },
  });
  expect(response.headers()['x-request-id']).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
});
