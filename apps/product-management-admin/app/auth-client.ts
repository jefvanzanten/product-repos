import { createProductReposAuthClient } from "@product-repos/auth-client";

/** Product Management Admin browser authentication client. */
export const authClient = createProductReposAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
});
