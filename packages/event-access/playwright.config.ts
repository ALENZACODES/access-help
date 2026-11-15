import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://localhost:4179" },
  webServer: {
    command: "npx vite --port 4179 --strictPort",
    url: "http://localhost:4179",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
