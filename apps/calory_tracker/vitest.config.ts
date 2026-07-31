import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@product-repos/contracts/calorie-tracker": new URL("../../packages/contracts/src/calorie-tracker.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: "./app/test/setup.ts",
  },
});
