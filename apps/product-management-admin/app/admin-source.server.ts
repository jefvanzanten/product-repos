import {
  parseAdminSource,
  parseAdminSourceFromSearch,
  type AdminSource,
} from "./admin-navigation";

const ADMIN_SOURCE_COOKIE_NAME = "product_management_admin_source";
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/** Source resolution and optional fallback-cookie update for an admin request. */
export type ResolvedAdminSource = {
  /** Explicit query source or valid cookie fallback. */
  readonly source: AdminSource | null;
  /** Cookie header emitted only when an explicit valid query source was received. */
  readonly setCookie: string | null;
};

/**
 * Resolve admin source with explicit query precedence over the fallback cookie.
 *
 * @param request - Incoming admin HTTP request.
 * @returns The resolved source and an optional cookie update.
 */
export function resolveAdminSource(request: Request): ResolvedAdminSource {
  const explicitSource = parseAdminSourceFromSearch(new URL(request.url).searchParams);
  if (explicitSource !== null) {
    return {
      source: explicitSource,
      setCookie: serializeAdminSourceCookie(explicitSource),
    };
  }

  return {
    source: readAdminSourceCookie(request.headers.get("cookie")),
    setCookie: null,
  };
}

/**
 * Read a validated admin source from an HTTP Cookie header.
 *
 * @param cookieHeader - Raw Cookie request header.
 * @returns The parsed cookie source, or `null` when absent or invalid.
 */
export function readAdminSourceCookie(cookieHeader: string | null): AdminSource | null {
  if (cookieHeader === null) return null;
  for (const cookiePart of cookieHeader.split(";")) {
    const separatorIndex = cookiePart.indexOf("=");
    if (separatorIndex < 0) continue;
    const name = cookiePart.slice(0, separatorIndex).trim();
    if (name !== ADMIN_SOURCE_COOKIE_NAME) continue;
    const rawValue = cookiePart.slice(separatorIndex + 1).trim();
    try {
      return parseAdminSource(decodeURIComponent(rawValue));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Serialize a validated source as the admin fallback cookie.
 *
 * @param source - Validated source to remember.
 * @returns A production-safe Set-Cookie header value.
 */
export function serializeAdminSourceCookie(source: AdminSource): string {
  const attributes = [
    `${ADMIN_SOURCE_COOKIE_NAME}=${encodeURIComponent(source)}`,
    "Path=/product-management-admin",
    `Max-Age=${ONE_YEAR_IN_SECONDS}`,
    "SameSite=Lax",
    "HttpOnly",
  ];
  if (process.env.NODE_ENV === "production") attributes.push("Secure");
  return attributes.join("; ");
}
