import { createConsumptionLogSchema, updateConsumptionLogSchema } from "@product-repos/contracts/calorie-tracker";
import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { CalorieTrackerApiError, createConsumptionLog, getConsumptionLog, getLoggablePackages, updateConsumptionLog } from "../../api/calorie-tracker-api.server";
import { requireUser } from "../../auth/auth.server";
import { canonicalizeTrackerUrl } from "../../domain/consumption-types";
import { getTodayInTimezone } from "../../domain/dates-and-timezones";
import type { LogFormActionResult, LogFormLoaderData } from "../../features/consumption-logs/types/log-form.types";
import { readBrowserTimezone } from "../../timezone.server";

/**
 * Load canonical create-log form data after timezone registration.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function loadNewLogRoute(args: LoaderFunctionArgs): Promise<LogFormLoaderData | Response> {
  return loadLogFormRoute(args, "Create");
}

/**
 * Load canonical edit-log form data and the current log.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function loadEditLogRoute(args: LoaderFunctionArgs): Promise<LogFormLoaderData | Response> {
  return loadLogFormRoute(args, "Edit");
}

/**
 * Create one protected consumption log from a validated route payload.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function handleNewLogRouteAction(args: ActionFunctionArgs): Promise<LogFormActionResult> {
  return handleLogFormRouteAction(args, "Create");
}

/**
 * Update one protected consumption log from a validated route payload.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function handleEditLogRouteAction(args: ActionFunctionArgs): Promise<LogFormActionResult> {
  return handleLogFormRouteAction(args, "Edit");
}

/**
 * Load shared create/edit form dependencies at the route boundary.
 *
 * @param properties - Function arguments.
 * @param mode - The mode value.
 * @returns The function result.
 */
async function loadLogFormRoute(
  { request, params }: LoaderFunctionArgs,
  mode: "Create" | "Edit",
): Promise<LogFormLoaderData | Response> {
  await requireUser(request);
  const timezone = readBrowserTimezone(request);
  if (timezone === null) return pendingFormData();
  const url = new URL(request.url);
  const canonical = canonicalizeTrackerUrl(url.searchParams.get("date"), url.searchParams.get("type"), getTodayInTimezone(timezone));
  if (canonical.requiresReplace) throw redirect(`${url.pathname}?${new URLSearchParams(canonical.state)}`);

  try {
    const initialPackagesPromise = getLoggablePackages(null, timezone, request);
    if (mode === "Create") {
      return {
        timezone,
        routeState: canonical.state,
        mode: { _tag: "Create" },
        initialPackages: await initialPackagesPromise,
        notFound: false,
        loadFailed: false,
      };
    }
    const logId = params.logId;
    if (logId === undefined) throw new Response("Log niet gevonden.", { status: 404 });
    const [initialPackages, log] = await Promise.all([
      initialPackagesPromise,
      getConsumptionLog(logId, timezone, request),
    ]);
    return { timezone, routeState: canonical.state, mode: { _tag: "Edit", log }, initialPackages, notFound: false, loadFailed: false };
  } catch (error: unknown) {
    const notFound = error instanceof CalorieTrackerApiError && error.status === 404;
    return { timezone, routeState: canonical.state, mode: null, initialPackages: [], notFound, loadFailed: !notFound };
  }
}

/**
 * Validate and dispatch one create/edit form command.
 *
 * @param properties - Function arguments.
 * @param mode - The mode value.
 * @returns The function result.
 */
async function handleLogFormRouteAction(
  { request, params }: ActionFunctionArgs,
  mode: "Create" | "Edit",
): Promise<LogFormActionResult> {
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

  try {
    if (mode === "Create") {
      const parsed = createConsumptionLogSchema.safeParse(payload);
      if (!parsed.success) return { ok: false, error: "Controleer de ingevulde gegevens." };
      return { ok: true, log: await createConsumptionLog(parsed.data, timezone, request) };
    }
    const logId = params.logId;
    const parsed = updateConsumptionLogSchema.safeParse(payload);
    if (logId === undefined || !parsed.success) return { ok: false, error: "Controleer de ingevulde gegevens." };
    return { ok: true, log: await updateConsumptionLog(logId, parsed.data, timezone, request) };
  } catch (error: unknown) {
    if (error instanceof CalorieTrackerApiError && error.response?.code === "LOG_UPDATE_CONFLICT") {
      return { ok: false, error: "Dit log is intussen gewijzigd. Herlaad de actuele gegevens voordat je opnieuw opslaat." };
    }
    const fallbackMessage = "Opslaan lukt niet. Je invoer is bewaard; probeer opnieuw.";
    return {
      ok: false,
      error: error instanceof CalorieTrackerApiError
        ? error.response?.message ?? fallbackMessage
        : fallbackMessage,
    };
  }
}

/**
 * Create the timezone-pending form loader state.
 *
 * @returns The function result.
 */
function pendingFormData(): LogFormLoaderData {
  return { timezone: null, routeState: null, mode: null, initialPackages: [], notFound: false, loadFailed: false };
}
