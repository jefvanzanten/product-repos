import { createProductReposAuthClient } from "@product-repos/auth-client";

/** Browser authentication client shared by the recipe application. */
export const authClient = createProductReposAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
});
