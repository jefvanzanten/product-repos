/** Environment values read while loading backend configuration. */
export type BackendEnvironment = Readonly<Record<string, string | undefined>>;

/** Validated configuration used by the backend composition root. */
export type BackendConfig = {
  readonly environment: "development" | "test" | "production";
  readonly host: string;
  readonly port: number;
  readonly databasePath: string;
  readonly corsOrigins: ReadonlyArray<string>;
  readonly auth: {
    readonly baseUrl: string;
    readonly secret: string;
    readonly trustedOrigins: ReadonlyArray<string>;
    readonly cookieDomain: string | undefined;
    readonly disableSignUp: boolean;
  };
};

const developmentSecret = "development-only-better-auth-secret-change-me";
const defaultOrigins = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3001";

/**
 * Split a comma-separated value into non-empty entries.
 *
 * @param value - Comma-separated configuration value.
 * @returns Trimmed non-empty entries.
 */
function parseList(value: string): ReadonlyArray<string> {
  return value.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0);
}

/**
 * Parse a valid TCP port or throw a configuration defect.
 *
 * @param value - Optional configured port value.
 * @returns A valid TCP port.
 */
function parsePort(value: string | undefined): number {
  const port = Number(value ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("PORT must be an integer between 1 and 65535");
  return port;
}

/**
 * Load and validate all environment values currently used by the backend runtime.
 *
 * @param env - Environment values supplied to the backend.
 * @returns Validated backend configuration.
 */
export function loadBackendConfig(env: BackendEnvironment): BackendConfig {
  const environment = env.NODE_ENV === "production" || env.NODE_ENV === "test" ? env.NODE_ENV : "development";
  const configuredSecret = env.BETTER_AUTH_SECRET?.trim();
  if (environment === "production" && !configuredSecret) throw new Error("BETTER_AUTH_SECRET is required in production");
  const corsOrigins = parseList(env.CORS_ORIGIN ?? defaultOrigins);
  const trustedOrigins = parseList(env.AUTH_TRUSTED_ORIGINS ?? env.CORS_ORIGIN ?? defaultOrigins);
  if (corsOrigins.length === 0) throw new Error("CORS_ORIGIN must contain at least one origin");
  if (trustedOrigins.length === 0) throw new Error("AUTH_TRUSTED_ORIGINS must contain at least one origin");

  return {
    environment,
    host: env.HOST?.trim() || "0.0.0.0",
    port: parsePort(env.PORT),
    databasePath: env.DATABASE_URL?.trim() || "./db/sqlite.db",
    corsOrigins,
    auth: {
      baseUrl: env.BETTER_AUTH_URL?.trim() || "http://localhost:3000",
      secret: configuredSecret || developmentSecret,
      trustedOrigins,
      cookieDomain: env.AUTH_COOKIE_DOMAIN?.trim() || undefined,
      disableSignUp: env.AUTH_DISABLE_SIGN_UP !== "false",
    },
  };
}
