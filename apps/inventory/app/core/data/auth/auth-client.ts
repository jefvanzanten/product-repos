import { createProductReposAuthClient } from "@product-repos/auth-client";

const configuredApiUrl: unknown = import.meta.env.VITE_API_URL;

/** Inventory browser authentication client. */
export const authClient = createProductReposAuthClient({
  baseURL: typeof configuredApiUrl === "string" ? configuredApiUrl : "http://localhost:3000",
});
