import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the SauceDemo E2E purchase-flow suite.
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  // tests/_review/ are personal, headed-mode walkthrough copies (see playwright.review.config.ts)
  // — gitignored, not part of the deliverable, and shouldn't slow down every `npm test` run.
  testIgnore: ['**/_review/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  /* Never pass --reporter on the CLI: it replaces (not merges) this array. */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    // Feeds scripts/generate-metrics.mjs (dashboard data) — see README "Métricas de la suite".
    ['json', { outputFile: 'results.json' }],
  ],

  use: {
    baseURL: 'https://www.saucedemo.com',
    viewport: { width: 1920, height: 1080 },

    /* Required by the exercise: keep trace + screenshot only for failed tests. */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Video is a screencast of the actual viewport, not an upscale of it — Playwright's own
    // default caps recorded video at ~800x800 unless an explicit size is given, so pairing a
    // 1920x1080 viewport with the bare 'retain-on-failure' string silently records a
    // downscaled, blurry video despite the viewport being real HD. Explicit size fixes that
    // (same bug already caught and documented in inspectoria/e2e/playwright.config.ts).
    video: { mode: 'retain-on-failure', size: { width: 1920, height: 1080 } },

    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      // devices['Desktop Chrome'] carries its own 1280x720 viewport, which wins over the
      // top-level `use.viewport` above because project-level `use` is more specific — so the
      // override has to be re-applied here too, or every run silently falls back to 720p.
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],
});
