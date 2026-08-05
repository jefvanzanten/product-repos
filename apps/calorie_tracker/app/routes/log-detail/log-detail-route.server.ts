import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { CalorieTrackerApiError, deleteConsumptionLog, getConsumptionLog } from "../../api/calorie-tracker-api.server";
import { requireUser } from "../../auth/auth.server";
import { canonicalizeTrackerUrl } from "../../domain/consumption-types";
import { getTodayInTimezone } from "../../domain/dates-and-timezones";
import type { LogDetailActionResult, LogDetailLoaderData } from "../../features/consumption-logs/types/log-detail.types";
import { readBrowserTimezone } from "../../timezone.server";

/**
 * Load one protected log detail after canonicalizing its route context.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export async function loadLogDetailRoute({ request, params }: LoaderFunctionArgs): Promise<LogDetailLoaderData | Response> {
  await requireUser(request);
  const timezone = readBrowserTimezone(request);
  if (timezone === null) return emptyDetailData();
  const url = new URL(request.url);
  const canonical = canonicalizeTrackerUrl(url.searchParams.get("date"), url.searchParams.get("type"), getTodayInTimezone(timezone));
  if (canonical.requiresReplace) throw redirect(`${url.pathname}?${new URLSearchParams(canonical.state)}`);
  const logId = params.logId;
  if (logId === undefined) throw new Response("Log niet gevonden.", { status: 404 });

  try {
    return { timezone, routeState: canonical.state, log: await getConsumptionLog(logId, timezone, request), notFound: false, loadFailed: false };
  } catch (error: unknown) {
    const notFound = error instanceof CalorieTrackerApiError && error.status === 404;
    return { timezone, routeState: canonical.state, log: null, notFound, loadFailed: !notFound };
  }
}

/**
 * Delete one protected log through the detail route action.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export async function handleLogDetailRouteAction({ request, params }: ActionFunctionArgs): Promise<LogDetailActionResult> {
  await requireUser(request);
  const timezone = readBrowserTimezone(request);
  const logId = params.logId;
  if (timezone === null || logId === undefined) return { ok: false, error: "Verwijderen lukt niet. Probeer opnieuw." };
  try {
    return { ok: true, result: await deleteConsumptionLog(logId, timezone, request) };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof CalorieTrackerApiError
        ? error.response?.message ?? "Verwijderen lukt niet. Probeer opnieuw."
        : "Verwijderen lukt niet. Probeer opnieuw.",
    };
  }
}

/**
 * Create the timezone-pending detail loader state.
 *
 * @returns The function result.
 */
function emptyDetailData(): LogDetailLoaderData {
  return { timezone: null, routeState: null, log: null, notFound: false, loadFailed: false };
}
