import { parseUpsertNutritionGoal } from "../../features/statistics/data/nutrition-goal-command-parser";
import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { CalorieTrackerApiError, getDailyStatistics, putNutritionGoals } from "../../features/statistics/data/statistics-api.server";
import { requireUser } from "../../core/presentation/auth/auth.server";
import { canonicalizeTrackerUrl } from "../../core/presentation/routing/tracker-url-state";
import { getTodayDate } from "../../core/domain/dates-and-timezones";
import type { StatisticsActionResult, StatisticsLoaderData } from "../../features/statistics/presentation/types/statistics.types";
import { toCalorieTrackerInternalPath } from "../../core/presentation/routing/calorie-tracker-routes";
import { readBrowserTimezone } from "../../core/data/timezone.server";
import { createBackendRequestContext } from "../../core/presentation/backend-request-context.server";

/**
 * Load canonical daily statistics after authentication and timezone registration.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export async function loadStatisticsRoute({ request }: LoaderFunctionArgs): Promise<StatisticsLoaderData | Response> {
  await requireUser(request);
  const timezone = readBrowserTimezone(request);
  if (timezone === null) {
    return { timezone: null, routeState: null, statistics: null, loadFailed: false };
  }

  const url = new URL(request.url);
  const dateValue = url.searchParams.get("date");
  const typeValue = url.searchParams.get("type");
  const carriesDate = url.searchParams.has("date");
  const carriesType = url.searchParams.has("type");
  const canonical = canonicalizeTrackerUrl(dateValue, typeValue, getTodayDate(timezone));
  const requiresRedirect = (carriesDate && dateValue !== canonical.state.date)
    || (carriesType && typeValue !== canonical.state.type);
  if (requiresRedirect) {
    const search = new URLSearchParams();
    if (carriesDate && dateValue === canonical.state.date) search.set("date", canonical.state.date);
    if (carriesType) search.set("type", canonical.state.type);
    const query = search.toString();
    throw redirect(`${toCalorieTrackerInternalPath(url.pathname)}${query.length > 0 ? `?${query}` : ""}`);
  }

  try {
    return {
      timezone,
      routeState: canonical.state,
      statistics: await getDailyStatistics(canonical.state.date, createBackendRequestContext(request, timezone)),
      loadFailed: false,
    };
  } catch {
    return { timezone, routeState: canonical.state, statistics: null, loadFailed: true };
  }
}

/**
 * Validate and persist a complete nutrition-goal replacement.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export async function handleStatisticsRouteAction({ request }: ActionFunctionArgs): Promise<StatisticsActionResult> {
  await requireUser(request);
  const timezone = readBrowserTimezone(request);
  if (timezone === null) return { ok: false, error: "De browsertijdzone is nog niet beschikbaar." };
  const formData = await request.formData();
  const rawPayload = formData.get("goals");
  if (typeof rawPayload !== "string") return { ok: false, error: "Controleer de ingevulde doelen." };

  let input: unknown;
  try {
    input = JSON.parse(rawPayload);
  } catch {
    return { ok: false, error: "Controleer de ingevulde doelen." };
  }
  const parsed = parseUpsertNutritionGoal(input);
  if (parsed === null) return { ok: false, error: "Controleer de ingevulde doelen." };

  try {
    await putNutritionGoals(parsed, createBackendRequestContext(request, timezone));
    return { ok: true };
  } catch (error: unknown) {
    const fallbackMessage = "Doelen opslaan lukt niet. Probeer opnieuw.";
    return {
      ok: false,
      error: error instanceof CalorieTrackerApiError
        ? error.response?.message ?? fallbackMessage
        : fallbackMessage,
    };
  }
}
