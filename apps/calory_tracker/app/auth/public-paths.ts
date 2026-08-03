import { CALORY_TRACKER_BASE_PATH } from "../routing/calorie-tracker-routes";

export { CALORY_TRACKER_BASE_PATH };

const safeReturnPathPattern = /^\/logs(?:\/(?:new|nieuw)|\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\/(?:edit|bewerken))?)?$/i;

/**
 * Normalize an app-internal path for a React Router server redirect.
 *
 * React Router applies the configured basename to redirect responses.
 */
export function toCaloryTrackerRedirectPath(internalPath: string): string {
  return internalPath === "/" ? "/" : `/${internalPath.replace(/^\/+/, "")}`;
}

/** Parse an untrusted post-login destination into a supported app-internal path. */
export function parseCaloryTrackerReturnPath(input: string | null | undefined): string {
  if (!input || !input.startsWith("/") || input.startsWith("//")) return "/";
  const candidate = new URL(input, "https://calorie-tracker.internal");
  if (candidate.origin !== "https://calorie-tracker.internal") return "/";
  if (candidate.pathname !== "/" && !safeReturnPathPattern.test(candidate.pathname)) return "/";
  return `${candidate.pathname}${candidate.search}${candidate.hash}`;
}

/** Derive a validated app-internal return path from a protected public request. */
export function returnPathFromRequest(request: Request): string {
  const url = new URL(request.url);
  if (url.pathname !== CALORY_TRACKER_BASE_PATH && !url.pathname.startsWith(`${CALORY_TRACKER_BASE_PATH}/`)) {
    return "/";
  }
  const internalPath = url.pathname.slice(CALORY_TRACKER_BASE_PATH.length) || "/";
  return parseCaloryTrackerReturnPath(`${internalPath}${url.search}${url.hash}`);
}
