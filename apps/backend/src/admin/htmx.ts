import type { Context } from "hono";

/** Return true when the request was issued by HTMX. */
export function isHtmxRequest(c: Context): boolean {
  return c.req.header("HX-Request") === "true";
}

/** Header set when a successful HTMX mutation should navigate the browser. */
export function htmxRedirect(path: string): Headers {
  return new Headers({ "HX-Redirect": path });
}
