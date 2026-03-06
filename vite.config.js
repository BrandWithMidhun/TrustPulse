import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
      appDirectory: "web/app",
    }),
  ],
  build: {
    assetsInlineLimit: 0,
  },
  server: {
    port: Number(process.env.PORT || 3000),
    host: "0.0.0.0",
  },
  optimizeDeps: {
    include: ["@shopify/polaris"],
  },
});
