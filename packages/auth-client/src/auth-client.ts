import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

/** Configuration for a Product Repos browser authentication client. */
export type AuthClientOptions = {
  /** Absolute URL of the Better Auth backend. */
  readonly baseURL: string;
};

/** Browser authentication client returned by the shared factory. */
export type ProductReposAuthClient = ReturnType<typeof createProductReposAuthClient>;

/** Create a browser authentication client configured for shared sessions and admin roles. */
export function createProductReposAuthClient(options: AuthClientOptions) {
  return createAuthClient({
    baseURL: options.baseURL.replace(/\/$/, ""),
    fetchOptions: {
      credentials: "include",
    },
    plugins: [adminClient()],
  });
}
