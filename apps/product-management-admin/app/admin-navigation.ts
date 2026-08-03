import { toPublicAppPath } from "@product-repos/shared/public-app-path";

/** Public basename used by Product Management Admin. */
export const ADMIN_BASE_PATH = "/product-management-admin";

/** A validated application from which Product Management Admin was opened. */
export type AdminSource = "inventory" | "calorie-tracker";

/** Navigation details belonging to a validated admin source. */
export type AdminSourceDetails = {
  /** Label rendered in the admin bottom tab bar. */
  readonly label: string;
  /** Closed, public destination used to return to the source application. */
  readonly publicPath: "/inventory" | "/calorie-tracker";
};

const sourceDetails: Readonly<Record<AdminSource, AdminSourceDetails>> = {
  inventory: {
    label: "Inventarisatie",
    publicPath: "/inventory",
  },
  "calorie-tracker": {
    label: "Calorie Tracker",
    publicPath: "/calorie-tracker",
  },
};

const safeReturnPathPatterns: ReadonlyArray<RegExp> = [
  /^\/$/,
  /^\/product-catalogus(?:\/.*)?$/,
  /^\/locations$/,
];

/**
 * Parse untrusted input into the closed admin-source union.
 *
 * @param input - Untrusted query or cookie input.
 * @returns The parsed source, or `null` for unknown input.
 */
export function parseAdminSource(input: string | null | undefined): AdminSource | null {
  return input === "inventory" || input === "calorie-tracker" ? input : null;
}

/**
 * Look up navigation details for a parsed admin source.
 *
 * @param source - A validated source.
 * @returns The exhaustive navigation mapping for that source.
 */
export function getAdminSourceDetails(source: AdminSource): AdminSourceDetails {
  return sourceDetails[source];
}

/**
 * Read and parse the admin source from URL search parameters.
 *
 * @param searchParams - Search parameters at an HTTP or router boundary.
 * @returns The parsed source, or `null` when it is absent or invalid.
 */
export function parseAdminSourceFromSearch(searchParams: URLSearchParams): AdminSource | null {
  return parseAdminSource(searchParams.get("source"));
}

/**
 * Merge a validated source into a target while retaining functional query parameters.
 *
 * @param target - App-internal path, query, and optional fragment.
 * @param source - Validated source to retain, or `null` to omit it.
 * @returns The app-internal target with the source query merged in.
 */
export function withAdminSource(target: string, source: AdminSource | null): string {
  const targetUrl = new URL(target, "https://admin.internal");
  if (source === null) targetUrl.searchParams.delete("source");
  else targetUrl.searchParams.set("source", source);
  return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
}

/**
 * Convert an app-internal admin path into a basename-safe public path.
 *
 * @param internalPath - A path rooted inside the admin router.
 * @returns The path prefixed with the public admin basename.
 */
export function toAdminPublicPath(internalPath: string): string {
  return toPublicAppPath(ADMIN_BASE_PATH, internalPath);
}

/**
 * Parse an untrusted post-login destination into a safe app-internal admin path.
 *
 * @param input - Untrusted `returnTo` query input.
 * @returns A supported internal path, or `/product-catalogus` as the safe fallback.
 */
export function parseAdminReturnPath(input: string | null | undefined): string {
  if (!input || !input.startsWith("/") || input.startsWith("//")) return "/product-catalogus";
  const candidate = new URL(input, "https://admin.internal");
  if (candidate.origin !== "https://admin.internal") return "/product-catalogus";
  const isSafePath = safeReturnPathPatterns.some((pattern) => pattern.test(candidate.pathname));
  if (!isSafePath) return "/product-catalogus";
  candidate.searchParams.delete("source");
  return `${candidate.pathname}${candidate.search}${candidate.hash}`;
}

/**
 * Derive a safe app-internal return path from an incoming public admin request.
 *
 * @param requestUrl - The current public request URL.
 * @returns A validated internal path containing functional query context.
 */
export function getAdminReturnPath(requestUrl: URL): string {
  const internalPath = requestUrl.pathname.startsWith(ADMIN_BASE_PATH)
    ? requestUrl.pathname.slice(ADMIN_BASE_PATH.length) || "/"
    : "/product-catalogus";
  const searchParams = new URLSearchParams(requestUrl.searchParams);
  searchParams.delete("source");
  const candidate = `${internalPath}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`;
  return parseAdminReturnPath(candidate);
}

/**
 * Build an app-internal server redirect while retaining a validated source.
 *
 * React Router applies the configured basename to redirect responses.
 *
 * @param internalPath - Safe app-internal destination.
 * @param source - Validated source to retain, or `null`.
 * @returns A source-preserving path for a React Router redirect response.
 */
export function toAdminRedirectPath(internalPath: string, source: AdminSource | null): string {
  return withAdminSource(internalPath, source);
}
