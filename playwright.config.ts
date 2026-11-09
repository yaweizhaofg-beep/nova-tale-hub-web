import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:9193', reducedMotion: 'reduce' },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 9193 --strictPort',
    url: 'http://127.0.0.1:9193',
    reuseExistingServer: !process.env.CI,
  },
});
