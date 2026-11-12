import { expect, test } from '@playwright/test';

// 백엔드가 떠 있지 않으므로 mocked라는 값은 handler만 줄 수 있다.
test('모킹을 켜면 브라우저 요청이 handler 응답을 받는다', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('브라우저 요청: mocked')).toBeVisible();
});

test('모킹을 켜면 서버 컴포넌트 요청도 handler 응답을 받는다', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('서버 요청: mocked')).toBeVisible();
});
