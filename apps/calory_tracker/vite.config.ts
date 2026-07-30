import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    noExternal: [
      "@product-repos/admin-dashboard",
      "@product-repos/auth-client",
      "@product-repos/shared",
    ],
  },
});
