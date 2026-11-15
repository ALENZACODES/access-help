import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const packageRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  root: here,
  esbuild: { jsx: "automatic" },
  server: { fs: { allow: [packageRoot, fileURLToPath(new URL("../../..", import.meta.url))] } },
});
