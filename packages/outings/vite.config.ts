import { defineConfig } from "vitest/config";

// Dev harness for the Playwright + axe check (root = harness/). Unit tests run in node.
export default defineConfig({
  root: "harness",
  test: {
    root: ".",
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
