import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const port = Number(process.env.PORT ?? 5173);

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "the App",
        short_name: "the App",
        description: "Prototype help centre for the App. Not an official service.",
        lang: "en-CA",
        dir: "ltr",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0b3d91",
        start_url: "/",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,webmanifest}"],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.PORT ?? 4173),
  },
});
