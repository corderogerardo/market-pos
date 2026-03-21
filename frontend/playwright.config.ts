import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:1420",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "cd ../backend && ./venv/bin/uvicorn app.main:app --port 8000",
      port: 8000,
      timeout: 10000,
      reuseExistingServer: true,
    },
    {
      command: "npx vite --port 1420",
      port: 1420,
      timeout: 10000,
      reuseExistingServer: true,
    },
  ],
});
