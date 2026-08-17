import { useLoaderData, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { LogFormPage } from "../../features/consumption-logs/presentation/pages/log-form-page";
import type { LogFormActionResult, LogFormLoaderData } from "../../features/consumption-logs/presentation/types/log-form.types";
import type { CalorieTrackerRouteHandle } from "../../core/presentation/routing/calorie-tracker-routes";
import { handleNewLogRouteAction, loadNewLogRoute } from "../log-form/log-form-route.server";

/** Route metadata keeps the mounted logbook inert behind this overlay. */
export const handle: CalorieTrackerRouteHandle = {
  showsTrackerNavbar: true,
  logPresentation: "overlay",
};

/**
 * Return metadata for the route-bound create-log flow.
 *
 * @returns The function result.
 */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Log toevoegen | Calorie Tracker" }];
}

/**
 * Load protected create-log form dependencies.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function loader(args: LoaderFunctionArgs): Promise<LogFormLoaderData | Response> {
  return loadNewLogRoute(args);
}

/**
 * Create one protected consumption log.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function action(args: ActionFunctionArgs): Promise<LogFormActionResult> {
  return handleNewLogRouteAction(args);
}

/**
 * Render the create-log feature page from route loader data.
 *
 * @returns The function result.
 */
export default function NewLogRoute(): React.ReactNode {
  return <LogFormPage loaderData={useLoaderData<LogFormLoaderData>()} />;
}
