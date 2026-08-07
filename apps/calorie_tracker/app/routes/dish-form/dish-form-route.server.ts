import { createDishSchema } from "@product-repos/contracts/calorie-tracker";
import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { CalorieTrackerApiError, createDish, getLoggablePackages } from "../../api/calorie-tracker-api.server";
import { requireUser } from "../../auth/auth.server";
import { canonicalizeTrackerUrl } from "../../domain/consumption-types";
import { getTodayInTimezone } from "../../domain/dates-and-timezones";
import type { DishFormActionResult, DishFormLoaderData } from "../../features/dishes/types/dish-form.types";
import { toCalorieTrackerInternalPath } from "../../routing/calorie-tracker-routes";
import { readBrowserTimezone } from "../../timezone.server";

/**
 * Load protected create-dish form dependencies.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function loadNewDishRoute({ request }: LoaderFunctionArgs): Promise<DishFormLoaderData | Response> {
  await requireUser(request);
  const timezone = readBrowserTimezone(request);
  if (timezone === null) return pendingFormData();
  const url = new URL(request.url);
  const canonical = canonicalizeTrackerUrl(url.searchParams.get("date"), url.searchParams.get("type"), getTodayInTimezone(timezone));
  if (canonical.requiresReplace) {
    throw redirect(`${toCalorieTrackerInternalPath(url.pathname)}?${new URLSearchParams(canonical.state)}`);
  }
  try {
    const initialPackages = await getLoggablePackages(null, timezone, request);
    return { timezone, routeState: canonical.state, initialPackages, loadFailed: false };
  } catch {
    return { timezone, routeState: canonical.state, initialPackages: [], loadFailed: true };
  }
}

/**
 * Create one protected user-owned dish from a validated route payload.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function handleNewDishRouteAction({ request }: ActionFunctionArgs): Promise<DishFormActionResult> {
  await requireUser(request);
  const timezone = readBrowserTimezone(request);
  if (timezone === null) return { ok: false, error: "De browsertijdzone is nog niet beschikbaar." };
  const formData = await request.formData();
  const rawPayload = formData.get("payload");
  if (typeof rawPayload !== "string") return { ok: false, error: "Controleer de ingevulde gegevens." };
  let payload: unknown;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return { ok: false, error: "Controleer de ingevulde gegevens." };
  }
  const parsed = createDishSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "Controleer de ingevulde gegevens." };
  try {
    return { ok: true, dish: await createDish(parsed.data, timezone, request) };
  } catch (error: unknown) {
    const fallbackMessage = "Opslaan lukt niet. Je invoer is bewaard; probeer opnieuw.";
    if (error instanceof CalorieTrackerApiError && error.response?.code === "DISH_ALREADY_EXISTS") {
      return { ok: false, error: "Er bestaat al een gerecht met deze naam." };
    }
    return {
      ok: false,
      error: error instanceof CalorieTrackerApiError
        ? error.response?.message ?? fallbackMessage
        : fallbackMessage,
    };
  }
}

/**
 * Create the timezone-pending dish form loader state.
 *
 * @returns The function result.
 */
function pendingFormData(): DishFormLoaderData {
  return { timezone: null, routeState: null, initialPackages: [], loadFailed: false };
}
