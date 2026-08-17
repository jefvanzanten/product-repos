import { useLoaderData, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { LogFormPage } from "../../features/consumption-logs/presentation/pages/log-form-page";
import type { LogFormActionResult, LogFormLoaderData } from "../../features/consumption-logs/presentation/types/log-form.types";
import type { CalorieTrackerRouteHandle } from "../../core/presentation/routing/calorie-tracker-routes";
import { handleEditLogRouteAction, loadEditLogRoute } from "../log-form/log-form-route.server";

/** Route metadata keeps one inert logbook mounted behind the edit overlay. */
export const handle: CalorieTrackerRouteHandle = {
  showsTrackerNavbar: true,
  logPresentation: "overlay",
};

/**
 * Return metadata for the refreshable edit-log route.
 *
 * @returns The function result.
 */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Log bewerken | Calorie Tracker" }];
}

/**
 * Load protected edit-log form dependencies.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function loader(args: LoaderFunctionArgs): Promise<LogFormLoaderData | Response> {
  return loadEditLogRoute(args);
}

/**
 * Update one protected consumption log.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function action(args: ActionFunctionArgs): Promise<LogFormActionResult> {
  return handleEditLogRouteAction(args);
}

/**
 * Render the edit-log feature page from route loader data.
 *
 * @returns The function result.
 */
export default function EditLogRoute(): React.ReactNode {
  return <LogFormPage loaderData={useLoaderData<LogFormLoaderData>()} />;
}
