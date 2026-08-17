import { browserTimezoneSchema } from "@product-repos/contracts/calorie-tracker";

const TIMEZONE_COOKIE_NAME = "calorie_tracker_timezone";
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/**
 * Read and validate the closed browser-timezone cookie from a request.
 *
 * @param request - The request value.
 * @returns The function result.
 */
export function readBrowserTimezone(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader === null) return null;
  const encodedValue = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${TIMEZONE_COOKIE_NAME}=`))
    ?.slice(TIMEZONE_COOKIE_NAME.length + 1);
  if (encodedValue === undefined) return null;
  try {
    return parseBrowserTimezone(decodeURIComponent(encodedValue));
  } catch {
    return null;
  }
}

/**
 * Validate an IANA timezone received from the browser.
 *
 * @param input - The input value.
 * @returns The function result.
 */
export function parseBrowserTimezone(input: unknown): string | null {
  const parsed = browserTimezoneSchema.safeParse(input);
  if (!parsed.success) return null;
  try {
    new Intl.DateTimeFormat("en", { timeZone: parsed.data }).format();
    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Serialize the validated browser timezone as an HTTP-only application cookie.
 *
 * @param timezone - The timezone value.
 * @param request - The request value.
 * @returns The function result.
 */
export function serializeBrowserTimezone(timezone: string, request: Request): string {
  const secure = new URL(request.url).protocol === "https:";
  return [
    `${TIMEZONE_COOKIE_NAME}=${encodeURIComponent(timezone)}`,
    "Path=/calorie-tracker",
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : null,
  ].filter((part) => part !== null).join("; ");
}
