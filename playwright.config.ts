import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: {
      SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret-change-me-in-production-32chars!!',
    },
  },
});
