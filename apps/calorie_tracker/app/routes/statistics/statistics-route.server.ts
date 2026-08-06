import { upsertNutritionGoalSchema } from "@product-repos/contracts/calorie-tracker";
import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { CalorieTrackerApiError, getDailyStatistics, putNutritionGoals } from "../../api/calorie-tracker-api.server";
import { requireUser } from "../../auth/auth.server";
import { canonicalizeTrackerUrl } from "../../domain/consumption-types";
import { getTodayInTimezone } from "../../domain/dates-and-timezones";
import type { StatisticsActionResult, StatisticsLoaderData } from "../../features/statistics/types/statistics.types";
import { toCalorieTrackerInternalPath } from "../../routing/calorie-tracker-routes";
import { readBrowserTimezone } from "../../timezone.server";

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
  const carriesType = url.searchParams.has("type");
  const canonical = canonicalizeTrackerUrl(
    url.searchParams.get("date"),
    url.searchParams.get("type"),
    getTodayInTimezone(timezone),
  );
  const requiresRedirect = url.searchParams.get("date") !== canonical.state.date
    || (carriesType && url.searchParams.get("type") !== canonical.state.type);
  if (requiresRedirect) {
    const search = new URLSearchParams({ date: canonical.state.date });
    if (carriesType) search.set("type", canonical.state.type);
    throw redirect(`${toCalorieTrackerInternalPath(url.pathname)}?${search}`);
  }

  try {
    return {
      timezone,
      routeState: canonical.state,
      statistics: await getDailyStatistics(canonical.state.date, timezone, request),
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
  const parsed = upsertNutritionGoalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Controleer de ingevulde doelen." };

  try {
    await putNutritionGoals(parsed.data, timezone, request);
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
