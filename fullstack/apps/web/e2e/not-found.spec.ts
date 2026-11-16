import { expect, test } from '@playwright/test';

test('존재하지 않는 경로는 404 화면과 홈 링크를 반환한다', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다' }),
  ).toBeVisible();
  await expect(page.getByText('404', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '홈으로 이동' })).toHaveAttribute('href', '/');
});
