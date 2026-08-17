import { useLoaderData, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { StatisticsPage } from "../../features/statistics/presentation/pages/statistics-page/statistics-page";
import type { StatisticsActionResult, StatisticsLoaderData } from "../../features/statistics/presentation/types/statistics.types";
import type { CalorieTrackerRouteHandle } from "../../core/presentation/routing/calorie-tracker-routes";
import { handleStatisticsRouteAction, loadStatisticsRoute } from "./statistics-route.server";

/** Route metadata enables the shared tracker date header without path matching. */
export const handle: CalorieTrackerRouteHandle = {
  showsTrackerNavbar: true,
  showsDateHeader: true,
};

/**
 * Return metadata for the Calorie Tracker statistics route.
 *
 * @returns The function result.
 */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Caloriestatistieken | Calorie Tracker" }];
}

/**
 * Load protected, timezone-aware daily statistics.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function loader(args: LoaderFunctionArgs): Promise<StatisticsLoaderData | Response> {
  return loadStatisticsRoute(args);
}

/**
 * Persist a protected nutrition-goal replacement.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function action(args: ActionFunctionArgs): Promise<StatisticsActionResult> {
  return handleStatisticsRouteAction(args);
}

/**
 * Render the statistics feature page from route-boundary data.
 *
 * @returns The function result.
 */
export default function StatisticsRoute(): React.ReactNode {
  return (
    <StatisticsPage loaderData={useLoaderData<StatisticsLoaderData>()} />
  );
}
