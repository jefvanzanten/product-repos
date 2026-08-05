import { useLoaderData, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { LogDetailPage } from "../../features/consumption-logs/pages/log-detail-page/log-detail-page";
import type { LogDetailActionResult, LogDetailLoaderData } from "../../features/consumption-logs/types/log-detail.types";
import type { CalorieTrackerRouteHandle } from "../../routing/calorie-tracker-routes";
import { handleLogDetailRouteAction, loadLogDetailRoute } from "./log-detail-route.server";

/** Route metadata presents detail independently while retaining its parent route context. */
export const handle: CalorieTrackerRouteHandle = {
  showsTrackerNavbar: false,
  logPresentation: "detail",
};

/**
 * Return metadata for the refreshable consumption-log detail route.
 *
 * @returns The function result.
 */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Logdetail | Calorie Tracker" }];
}

/**
 * Load one protected, timezone-aware log detail.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function loader(args: LoaderFunctionArgs): Promise<LogDetailLoaderData | Response> {
  return loadLogDetailRoute(args);
}

/**
 * Delete one protected log.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function action(args: ActionFunctionArgs): Promise<LogDetailActionResult> {
  return handleLogDetailRouteAction(args);
}

/**
 * Render the log-detail feature page from route loader data.
 *
 * @returns The function result.
 */
export default function LogDetailRoute(): React.ReactNode {
  return <LogDetailPage loaderData={useLoaderData<LogDetailLoaderData>()} />;
}
