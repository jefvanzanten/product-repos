import type { ReactNode } from "react";
import { Outlet, useLoaderData, useMatches, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { LogbookPage } from "../../features/consumption-logs/presentation/pages/logbook-page/logbook-page";
import type { LogbookActionResult, LogbookLoaderData } from "../../features/consumption-logs/presentation/types/logbook.types";
import type { CalorieTrackerRouteHandle } from "../../core/presentation/routing/calorie-tracker-routes";
import { handleLogsRouteAction, loadLogsRoute } from "./logs-route.server";

/** Route metadata keeps logbook shell behavior out of pathname checks. */
export const handle: CalorieTrackerRouteHandle = {
  showsTrackerNavbar: true,
  showsDateHeader: true,
  logPresentation: "list",
};

/**
 * Load protected canonical logbook data for the persistent route shell.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function loader(args: LoaderFunctionArgs): Promise<LogbookLoaderData | Response> {
  return loadLogsRoute(args);
}

/**
 * Handle protected logbook-level mutations.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function action(args: ActionFunctionArgs): Promise<LogbookActionResult> {
  return handleLogsRouteAction(args);
}

/**
 * Keep one loaded logbook instance mounted behind create and edit overlays.
 *
 * @returns The function result.
 */
export default function LogsLayout(): ReactNode {
  const loaderData = useLoaderData<LogbookLoaderData>();
  const matches = useMatches();
  const presentation = [...matches]
    .reverse()
    .map((match) => match.handle as CalorieTrackerRouteHandle | undefined)
    .find((candidate) => candidate?.logPresentation !== undefined)
    ?.logPresentation ?? "list";

  if (presentation === "detail") return <Outlet />;

  const showsOverlay = presentation === "overlay";
  return (
    <>
      <div inert={showsOverlay} aria-hidden={showsOverlay || undefined}>
        <LogbookPage loaderData={loaderData} />
      </div>
      {showsOverlay && <Outlet />}
    </>
  );
}
