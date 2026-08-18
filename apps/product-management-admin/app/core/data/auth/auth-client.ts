import { createProductReposAuthClient } from "@product-repos/auth-client";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

/** Product Management Admin browser authentication client. */
export const authClient = createProductReposAuthClient({
  baseURL: apiUrl,
});
