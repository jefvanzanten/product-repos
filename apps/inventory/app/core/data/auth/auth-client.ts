import { createProductReposAuthClient } from "@product-repos/auth-client";

/** Inventory browser authentication client. */
export const authClient = createProductReposAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
});
