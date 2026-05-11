import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — happy path smoke test.
 * Tek browser (Chromium); ana akışın kırılmadığını garanti eder.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3030',
    trace: 'on-first-retry',
    locale: 'tr-TR',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Dev sunucusunu test öncesi başlat (lokal)
  webServer: process.env.CI
    ? undefined
    : {
        command: 'bun run dev',
        url: 'http://localhost:3030',
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
