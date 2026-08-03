import type { ReactNode } from "react";
import { Outlet, useMatches } from "react-router";
import type { CalorieTrackerRouteHandle } from "../../routing/calorie-tracker-routes";
import LogsRoute from "./logs";

/** Route metadata keeps logbook shell behavior out of pathname checks. */
export const handle: CalorieTrackerRouteHandle = {
  showsTrackerNavbar: true,
  showsDateHeader: true,
  logPresentation: "list",
};

/** Keep one logbook instance mounted behind create and edit overlays. */
export default function LogsLayout(): ReactNode {
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
        <LogsRoute />
      </div>
      {showsOverlay && <Outlet />}
    </>
  );
}
