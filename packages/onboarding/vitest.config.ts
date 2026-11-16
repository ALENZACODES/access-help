import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "switch-first/src/**/*.test.ts", "first-run/src/**/*.test.ts"],
  },
});
