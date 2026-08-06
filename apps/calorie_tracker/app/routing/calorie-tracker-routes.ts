import type { ConsumptionTypeFilter } from "@product-repos/contracts/calorie-tracker";
import { toPublicAppPath } from "@product-repos/shared/public-app-path";

/** Public basename retained for the current Calorie Tracker deployment. */
export const CALORIE_TRACKER_BASE_PATH = "/calorie-tracker";

/** Route segments shared by the route tree and path builders. */
export const calorieTrackerRoutePatterns = {
  login: "login",
  logs: "logs",
  newLog: "new",
  legacyNewLog: "nieuw",
  logDetail: ":logId",
  editLog: ":logId/edit",
  legacyEditLog: ":logId/bewerken",
} as const;

/** Canonical date and filter context carried by logbook routes. */
export type LogbookRouteState = {
  readonly date: string;
  readonly type: ConsumptionTypeFilter;
};

/** Metadata consumed by app layouts instead of matching path strings. */
export type CalorieTrackerRouteHandle = {
  readonly showsTrackerNavbar?: boolean;
  readonly showsDateHeader?: boolean;
  readonly logPresentation?: "list" | "overlay" | "detail";
};

/** Build the statistics route and optionally retain the last logbook filter. */
export function statisticsPath(date: string, type?: ConsumptionTypeFilter): string {
  const search = new URLSearchParams({ date });
  if (type !== undefined) search.set("type", type);
  return `/?${search}`;
}

/** Build the canonical logbook route. */
export function logbookPath(state: LogbookRouteState): string {
  return `/logs?${createLogbookSearch(state)}`;
}

/** Build the canonical create-log route. */
export function newLogPath(state: LogbookRouteState): string {
  return `/logs/new?${createLogbookSearch(state)}`;
}

/** Build a canonical private log-detail route. */
export function logDetailPath(logId: string, state: LogbookRouteState): string {
  return `/logs/${encodeURIComponent(logId)}?${createLogbookSearch(state)}`;
}

/** Build a canonical edit-log route. */
export function editLogPath(logId: string, state: LogbookRouteState): string {
  return `/logs/${encodeURIComponent(logId)}/edit?${createLogbookSearch(state)}`;
}

/** Build the login route with an optional app-internal post-login destination. */
export function loginPath(returnTo?: string): string {
  if (returnTo === undefined || returnTo === "/") return "/login";
  return `/login?${new URLSearchParams({ returnTo })}`;
}

/** Build the independently deployed Product Management Admin destination. */
export function productManagementAdminPath(): string {
  return "/product-management-admin/product-catalogus?source=calorie-tracker";
}

/** Prefix an app-internal route with the retained public basename. */
export function toCalorieTrackerPublicPath(internalPath: string): string {
  return toPublicAppPath(CALORIE_TRACKER_BASE_PATH, internalPath);
}

/**
 * Remove the public basename from a Calorie Tracker request pathname.
 *
 * @param publicPathname - The public request pathname.
 * @returns The app-internal pathname used by React Router redirects.
 */
export function toCalorieTrackerInternalPath(publicPathname: string): string {
  if (publicPathname === CALORIE_TRACKER_BASE_PATH) return "/";
  if (publicPathname.startsWith(`${CALORIE_TRACKER_BASE_PATH}/`)) {
    return publicPathname.slice(CALORIE_TRACKER_BASE_PATH.length);
  }
  return "/";
}

/** Build canonical logbook query parameters in stable order. */
function createLogbookSearch(state: LogbookRouteState): URLSearchParams {
  return new URLSearchParams({ date: state.date, type: state.type });
}
