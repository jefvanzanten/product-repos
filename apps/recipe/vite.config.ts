import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, type Connect, type Plugin } from "vite";
import { RECIPE_BASE_PATH } from "./app/core/presentation/routing/recipe-routes";

/**
 * Create a development redirect for the slashless public application root.
 *
 * @param basePath - Public Recipe application basename.
 * @returns A Vite development redirect plugin.
 */
function redirectAppRoot(basePath: string): Plugin {
  return {
    name: "redirect-recipe-root",
    /** Register the exact-path redirect middleware. */
    configureServer(server) {
      /** Redirect only /recepten while preserving its query string. */
      const redirect: Connect.NextHandleFunction = (request, response, next) => {
        const url = request.url;
        if (url === undefined || (url !== basePath && !url.startsWith(`${basePath}?`))) return next();
        response.statusCode = 307;
        response.setHeader("Location", url.replace(basePath, `${basePath}/`));
        response.end();
      };
      server.middlewares.use(redirect);
    },
  };
}

export default defineConfig({
  base: `${RECIPE_BASE_PATH}/`,
  plugins: [redirectAppRoot(RECIPE_BASE_PATH), reactRouter()],
  server: { port: 5176, strictPort: true },
  resolve: { tsconfigPaths: true },
  ssr: { noExternal: ["@product-repos/auth-client", "@product-repos/contracts", "@product-repos/shared"] },
});
