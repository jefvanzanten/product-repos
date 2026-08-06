import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { CalorieTrackerApiError, getConsumptionLogs, restoreConsumptionLog } from "../../api/calorie-tracker-api.server";
import { requireUser } from "../../auth/auth.server";
import { canonicalizeTrackerUrl } from "../../domain/consumption-types";
import { getTodayInTimezone, sortChronologically } from "../../domain/dates-and-timezones";
import type { LogbookActionResult, LogbookLoaderData } from "../../features/consumption-logs/types/logbook.types";
import { toCalorieTrackerInternalPath } from "../../routing/calorie-tracker-routes";
import { readBrowserTimezone } from "../../timezone.server";

/**
 * Load one canonical date- and filter-scoped logbook projection.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export async function loadLogsRoute({ request }: LoaderFunctionArgs): Promise<LogbookLoaderData | Response> {
  await requireUser(request);
  const timezone = readBrowserTimezone(request);
  if (timezone === null) {
    return { timezone: null, routeState: null, content: null, loadFailed: false };
  }

  const url = new URL(request.url);
  const canonical = canonicalizeTrackerUrl(
    url.searchParams.get("date"),
    url.searchParams.get("type"),
    getTodayInTimezone(timezone),
  );
  if (canonical.requiresReplace) {
    throw redirect(`${toCalorieTrackerInternalPath(url.pathname)}?${new URLSearchParams(canonical.state)}`);
  }

  try {
    const logs = await getConsumptionLogs(canonical.state.date, canonical.state.type, timezone, request);
    if (logs.items.length > 0) {
      return {
        timezone,
        routeState: canonical.state,
        content: { _tag: "Ready", items: sortChronologically(logs.items) },
        loadFailed: false,
      };
    }
    if (canonical.state.type === "all") {
      return { timezone, routeState: canonical.state, content: { _tag: "EmptyDate" }, loadFailed: false };
    }
    const unfiltered = await getConsumptionLogs(canonical.state.date, "all", timezone, request);
    return {
      timezone,
      routeState: canonical.state,
      content: { _tag: unfiltered.items.length === 0 ? "EmptyDate" : "EmptyFilter" },
      loadFailed: false,
    };
  } catch {
    return { timezone, routeState: canonical.state, content: null, loadFailed: true };
  }
}

/**
 * Restore one recently deleted log through a closed route action.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export async function handleLogsRouteAction({ request }: ActionFunctionArgs): Promise<LogbookActionResult> {
  await requireUser(request);
  const timezone = readBrowserTimezone(request);
  if (timezone === null) return { ok: false, error: "De browsertijdzone is nog niet beschikbaar." };
  const formData = await request.formData();
  const logId = formData.get("logId");
  if (formData.get("_action") !== "restore" || typeof logId !== "string" || !isUuid(logId)) {
    return { ok: false, error: "De log kan niet worden hersteld." };
  }
  try {
    return { ok: true, log: await restoreConsumptionLog(logId, timezone, request) };
  } catch (error: unknown) {
    const fallbackMessage = "Herstellen lukt niet meer.";
    return {
      ok: false,
      error: error instanceof CalorieTrackerApiError
        ? error.response?.message ?? fallbackMessage
        : fallbackMessage,
    };
  }
}

/**
 * Determine whether an untrusted value is a canonical UUID.
 *
 * @param value - The value value.
 * @returns The function result.
 */
function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
