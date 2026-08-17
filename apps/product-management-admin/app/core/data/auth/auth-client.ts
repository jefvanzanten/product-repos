import { createProductReposAuthClient } from "@product-repos/auth-client";

const configuredApiUrl: unknown = import.meta.env.VITE_API_URL;
const apiUrl = typeof configuredApiUrl === "string" ? configuredApiUrl : "http://localhost:3000";

/** Product Management Admin browser authentication client. */
export const authClient = createProductReposAuthClient({
  baseURL: apiUrl,
});
