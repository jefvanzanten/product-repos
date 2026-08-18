import {
  parseCreateConsumptionLog,
  parseUpdateConsumptionLog,
} from "../../features/consumption-logs/data/consumption-log-command-parser";
import { z } from "zod";
import {
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import {
  CalorieTrackerApiError,
  createConsumptionLog,
  getConsumableSearchResults,
  getConsumptionLog,
  updateConsumptionLog,
} from "../../features/consumption-logs/data/consumption-log-api.server";
import { requireUser } from "../../core/presentation/auth/auth.server";
import { canonicalizeTrackerUrl } from "../../core/presentation/routing/tracker-url-state";
import { getTodayDate } from "../../core/domain/dates-and-timezones";
import type {
  LogFormActionResult,
  LogFormLoaderData,
} from "../../features/consumption-logs/presentation/types/log-form.types";
import { toCalorieTrackerInternalPath } from "../../core/presentation/routing/calorie-tracker-routes";
import { readBrowserTimezone } from "../../core/data/timezone.server";
import { createBackendRequestContext } from "../../core/presentation/backend-request-context.server";

type LogFormRouteDependencies = {
  readonly requireUser: typeof requireUser;
  readonly createConsumptionLog: typeof createConsumptionLog;
  readonly getConsumptionLog: typeof getConsumptionLog;
  readonly getConsumableSearchResults: typeof getConsumableSearchResults;
  readonly updateConsumptionLog: typeof updateConsumptionLog;
};

const defaultDependencies: LogFormRouteDependencies = {
  requireUser,
  createConsumptionLog,
  getConsumableSearchResults,
  getConsumptionLog,
  updateConsumptionLog,
};

/**
 * Load canonical create-log form data after timezone registration.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function loadNewLogRoute(
  args: LoaderFunctionArgs,
  dependencies: LogFormRouteDependencies = defaultDependencies,
): Promise<LogFormLoaderData | Response> {
  return loadLogFormRoute(args, "Create", dependencies);
}

/**
 * Load canonical edit-log form data and the current log.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function loadEditLogRoute(
  args: LoaderFunctionArgs,
  dependencies: LogFormRouteDependencies = defaultDependencies,
): Promise<LogFormLoaderData | Response> {
  return loadLogFormRoute(args, "Edit", dependencies);
}

/**
 * Create one protected consumption log from a validated route payload.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function handleNewLogRouteAction(
  args: ActionFunctionArgs,
  dependencies: LogFormRouteDependencies = defaultDependencies,
): Promise<LogFormActionResult> {
  return handleLogFormRouteAction(args, "Create", dependencies);
}

/**
 * Update one protected consumption log from a validated route payload.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function handleEditLogRouteAction(
  args: ActionFunctionArgs,
  dependencies: LogFormRouteDependencies = defaultDependencies,
): Promise<LogFormActionResult> {
  return handleLogFormRouteAction(args, "Edit", dependencies);
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
  dependencies: LogFormRouteDependencies,
): Promise<LogFormLoaderData | Response> {
  await dependencies.requireUser(request);
  const timezone = readBrowserTimezone(request);
  if (timezone === null) return pendingFormData();
  const url = new URL(request.url);
  const canonical = canonicalizeTrackerUrl(
    url.searchParams.get("date"),
    url.searchParams.get("type"),
    getTodayDate(timezone),
  );
  if (canonical.requiresReplace) {
    throw redirect(
      `${toCalorieTrackerInternalPath(url.pathname)}?${new URLSearchParams(canonical.state)}`,
    );
  }

  try {
    const context = createBackendRequestContext(request, timezone);
    const initialResultsPromise = dependencies.getConsumableSearchResults(
      null,
      context,
    );
    if (mode === "Create") {
      return {
        timezone,
        routeState: canonical.state,
        mode: { tag: "Create" },
        initialResults: await initialResultsPromise,
        notFound: false,
        loadFailed: false,
      };
    }
    const logId = params.logId;
    if (logId === undefined)
      throw new Response("Log niet gevonden.", { status: 404 });
    const [initialResults, log] = await Promise.all([
      initialResultsPromise,
      dependencies.getConsumptionLog(logId, context),
    ]);
    return {
      timezone,
      routeState: canonical.state,
      mode: { tag: "Edit", log },
      initialResults,
      notFound: false,
      loadFailed: false,
    };
  } catch (error: unknown) {
    const notFound =
      error instanceof CalorieTrackerApiError && error.status === 404;
    return {
      timezone,
      routeState: canonical.state,
      mode: null,
      initialResults: [],
      notFound,
      loadFailed: !notFound,
    };
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
  dependencies: LogFormRouteDependencies,
): Promise<LogFormActionResult> {
  await dependencies.requireUser(request);
  const timezone = readBrowserTimezone(request);
  if (timezone === null)
    return { ok: false, error: "De browsertijdzone is nog niet beschikbaar." };
  const formData = await request.formData();
  const rawPayload = z.string().safeParse(formData.get("payload"));
  if (!rawPayload.success)
    return { ok: false, error: "Controleer de ingevulde gegevens." };
  let payload: Parameters<typeof parseCreateConsumptionLog>[0];
  try {
    payload = JSON.parse(rawPayload.data);
  } catch {
    return { ok: false, error: "Controleer de ingevulde gegevens." };
  }

  try {
    const context = createBackendRequestContext(request, timezone);
    if (mode === "Create") {
      const parsed = parseCreateConsumptionLog(payload);
      if (parsed === null)
        return { ok: false, error: "Controleer de ingevulde gegevens." };
      return {
        ok: true,
        log: await dependencies.createConsumptionLog(parsed, context),
      };
    }
    const logId = params.logId;
    const parsed = parseUpdateConsumptionLog(payload);
    if (logId === undefined || parsed === null)
      return { ok: false, error: "Controleer de ingevulde gegevens." };
    return {
      ok: true,
      log: await dependencies.updateConsumptionLog(logId, parsed, context),
    };
  } catch (error: unknown) {
    if (
      error instanceof CalorieTrackerApiError &&
      error.response?.code === "LOG_UPDATE_CONFLICT"
    ) {
      return {
        ok: false,
        error:
          "Dit log is intussen gewijzigd. Herlaad de actuele gegevens voordat je opnieuw opslaat.",
      };
    }
    const fallbackMessage =
      "Opslaan lukt niet. Je invoer is bewaard; probeer opnieuw.";
    return {
      ok: false,
      error:
        error instanceof CalorieTrackerApiError
          ? (error.response?.message ?? fallbackMessage)
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
  return {
    timezone: null,
    routeState: null,
    mode: null,
    initialResults: [],
    notFound: false,
    loadFailed: false,
  };
}
