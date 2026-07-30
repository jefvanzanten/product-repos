import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { db } from "../db/index.ts";
import * as authSchema from "../db/schemas/auth.schema.ts";

const developmentSecret = "development-only-better-auth-secret-change-me";

/** Split a comma-separated environment value into non-empty entries. */
function parseList(value: string): ReadonlyArray<string> {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

const trustedOrigins = parseList(
  process.env.AUTH_TRUSTED_ORIGINS ??
    process.env.CORS_ORIGIN ??
    "http://localhost:5173,http://localhost:3001",
);
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
const configuredSecret = process.env.BETTER_AUTH_SECRET?.trim();

if (process.env.NODE_ENV === "production" && !configuredSecret) {
  throw new Error("BETTER_AUTH_SECRET is required in production");
}

/** The single Better Auth server instance used by the Hono API. */
export const auth = betterAuth({
  appName: "Product Repos",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: configuredSecret ?? developmentSecret,
  trustedOrigins: [...trustedOrigins],
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.AUTH_DISABLE_SIGN_UP !== "false",
  },
  plugins: [admin()],
  advanced: cookieDomain
    ? {
        crossSubDomainCookies: {
          enabled: true,
          domain: cookieDomain,
        },
      }
    : undefined,
});
