import { expect, test } from '@playwright/test';

/**
 * Niyet — happy path smoke test.
 *
 * Ana kullanıcı akışını uçtan uca doğrular:
 *  1. Home (/) → otomatik /onboarding redirect
 *  2. Onboarding 3 slide → "Demo modunda dene" → /dashboard
 *  3. Dashboard yüklenir, kullanıcı ismi ve aylık fırsat görünür
 *  4. /radar tab'ına geç, kategori dağılımı yüklenir
 *  5. /goals tab'ına geç, aktif hedef görünür
 *  6. /notifications tab'ına geç
 */

test('Happy path: onboarding → demo → dashboard → radar → goals → notifications', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByText('Niyet')).toBeVisible();
  await expect(page.getByText('Harcamadığını')).toBeVisible();

  // "Demo modunda dene" → /dashboard
  await page.getByRole('button', { name: 'Demo modunda dene' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText('Merhaba Ayşe')).toBeVisible();
  await expect(page.getByText(/2\.450\s*₺/)).toBeVisible();

  // Radar tab
  await page.getByRole('link', { name: /Radar/ }).first().click();
  await expect(page).toHaveURL(/\/radar/);
  await expect(page.getByText('Tasarruf Radarı')).toBeVisible();

  // Goals tab
  await page
    .getByRole('link', { name: /Hedefler/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/goals/);
  await expect(page.getByText('Hedefler')).toBeVisible();

  // Notifications tab
  await page
    .getByRole('link', { name: /Bildirim/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/notifications/);
});

test('Onboarding slides ileri-geri navigasyonu', async ({ page }) => {
  await page.goto('/onboarding');
  await expect(page.getByText('Niyet').first()).toBeVisible();

  // İkinci slide
  await page.getByRole('button', { name: 'Devam' }).click();
  await expect(page.getByText('Nasıl çalışır')).toBeVisible();

  // Üçüncü slide
  await page.getByRole('button', { name: 'Devam' }).click();
  await expect(page.getByText('Karar senin')).toBeVisible();

  // "Başla" butonu → consent
  await page.getByRole('button', { name: 'Başla' }).click();
  await expect(page).toHaveURL(/\/consent/);
});
