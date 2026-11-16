import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Tests that run axe-core over every screen in jsdom take a few seconds on a busy CI machine.
    testTimeout: 30_000,
    include: ["src/**/*.test.ts", "switch-first/src/**/*.test.ts", "first-run/src/**/*.test.ts"],
  },
});
