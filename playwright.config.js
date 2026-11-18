import { defineConfig, devices } from '@playwright/test';

const E2E_PORT = 4174;
const E2E_URL = `http://127.0.0.1:${E2E_PORT}`;

const projects = [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'firefox',
    testMatch: /(compatibility|auth-permissions)\.spec\.js/,
    use: { ...devices['Desktop Firefox'] },
  },
];

if (process.env.PLAYWRIGHT_EDGE === 'true') {
  projects.push({
    name: 'edge',
    testMatch: /(compatibility|auth-permissions)\.spec\.js/,
    use: { ...devices['Desktop Edge'], channel: 'msedge' },
  });
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  timeout: 30000,
  expect: {
    timeout: 12000,
  },
  use: {
    baseURL: E2E_URL,
    trace: 'on-first-retry',
    acceptDownloads: true,
  },
  projects,
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${E2E_PORT}`,
    url: E2E_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
