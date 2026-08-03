import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, type Connect, type Plugin } from "vite";

/** Redirect the slashless public app root before Vite's base-path middleware handles it. */
function redirectAppRoot(basePath: string): Plugin {
  return {
    name: "redirect-app-root",
    /** Register the development-only root redirect. */
    configureServer(server) {
      /** Preserve query parameters while redirecting the exact app root. */
      const redirectExactAppRoot: Connect.NextHandleFunction = (
        request,
        response,
        next,
      ) => {
        const requestUrl = request.url;
        if (requestUrl === undefined) return next();
        const queryStart = requestUrl.indexOf("?");
        const pathname = queryStart === -1 ? requestUrl : requestUrl.slice(0, queryStart);
        if (pathname !== basePath) return next();
        const search = queryStart === -1 ? "" : requestUrl.slice(queryStart);
        response.statusCode = 307;
        response.setHeader("Location", `${basePath}/${search}`);
        response.end();
      };
      server.middlewares.use(redirectExactAppRoot);
    },
  };
}

/** Proxy another React Router app's critical CSS before the current app can intercept it. */
function proxyCrossAppCriticalCss(publicBasePath: string, targetOrigin: string): Plugin {
  const criticalCssPath = `${publicBasePath}/@react-router/critical.css`;

  return {
    name: `proxy-${publicBasePath.slice(1)}-critical-css`,
    /** Register the critical-CSS proxy ahead of React Router's broad endpoint handler. */
    configureServer(server) {
      /** Forward only the target app's development-time critical stylesheet. */
      const proxyCriticalCss: Connect.NextHandleFunction = async (
        request,
        response,
        next,
      ) => {
        const requestUrl = request.url;
        if (requestUrl === undefined) return next();
        const queryStart = requestUrl.indexOf("?");
        const pathname = queryStart === -1 ? requestUrl : requestUrl.slice(0, queryStart);
        if (pathname !== criticalCssPath) return next();

        let upstreamResponse: Response;
        try {
          upstreamResponse = await fetch(`${targetOrigin}${requestUrl}`);
        } catch (cause: unknown) {
          return next(cause);
        }

        response.statusCode = upstreamResponse.status;
        for (const [name, value] of upstreamResponse.headers.entries()) {
          response.setHeader(name, value);
        }
        response.end(Buffer.from(await upstreamResponse.arrayBuffer()));
      };
      server.middlewares.use(proxyCriticalCss);
    },
  };
}

export default defineConfig({
  base: "/product-management-admin/",
  plugins: [
    redirectAppRoot("/product-management-admin"),
    proxyCrossAppCriticalCss("/calorie-tracker", "http://127.0.0.1:5173"),
    proxyCrossAppCriticalCss("/inventory", "http://127.0.0.1:5175"),
    reactRouter(),
  ],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/calorie-tracker": {
        target: "http://127.0.0.1:5173",
        ws: true,
      },
      "/inventory": {
        target: "http://127.0.0.1:5175",
        ws: true,
      },
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    noExternal: [
      "@product-repos/auth-client",
      "@product-repos/contracts",
      "@product-repos/shared",
    ],
  },
});
