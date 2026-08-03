import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import type { BackendConfig } from "../../../config.ts";
import type { BackendDatabase } from "../../../db/index.ts";
import * as authSchema from "../../../db/schemas/auth.schema.ts";

/** Create the Better Auth adapter from explicit database and configuration dependencies. */
export function createAuthAdapter(dependencies: {
  readonly database: BackendDatabase;
  readonly config: BackendConfig;
}) {
  const { database, config } = dependencies;
  return betterAuth({
    appName: "Product Repos",
    baseURL: config.auth.baseUrl,
    secret: config.auth.secret,
    trustedOrigins: [...config.auth.trustedOrigins],
    database: drizzleAdapter(database, { provider: "sqlite", schema: authSchema }),
    emailAndPassword: { enabled: true, disableSignUp: config.auth.disableSignUp },
    session: { expiresIn: 60 * 60 * 24, updateAge: 60 * 60 },
    plugins: [admin()],
    advanced: config.auth.cookieDomain
      ? { crossSubDomainCookies: { enabled: true, domain: config.auth.cookieDomain } }
      : undefined,
  });
}
