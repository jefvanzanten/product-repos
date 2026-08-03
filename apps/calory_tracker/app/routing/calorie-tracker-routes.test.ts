import { describe, expect, it } from "vitest";
import { matchRoutes, type RouteObject } from "react-router";
import {
  calorieTrackerRoutePatterns as patterns,
  editLogPath,
  logbookPath,
  logDetailPath,
  newLogPath,
  statisticsPath,
} from "./calorie-tracker-routes";

const routeTree: RouteObject[] = [{
  path: "/",
  children: [
    { index: true },
    {
      path: patterns.logs,
      children: [
        { path: patterns.newLog },
        { path: patterns.logDetail },
        { path: patterns.editLog },
      ],
    },
  ],
}];

/** Remove a builder's query before matching it against the configured route shape. */
function pathname(path: string): string {
  return new URL(path, "https://calorie-tracker.internal").pathname;
}

describe("Calorie Tracker route contracts", () => {
  it("builds canonical date and filter URLs in stable order", () => {
    const state = { date: "2026-07-29", type: "drink" as const };
    expect(statisticsPath(state.date, state.type)).toBe("/?date=2026-07-29&type=drink");
    expect(logbookPath(state)).toBe("/logs?date=2026-07-29&type=drink");
    expect(newLogPath(state)).toBe("/logs/new?date=2026-07-29&type=drink");
    expect(logDetailPath("10000000-0000-4000-8000-000000000001", state)).toContain("/logs/10000000-0000-4000-8000-000000000001?");
    expect(editLogPath("10000000-0000-4000-8000-000000000001", state)).toContain("/edit?");
  });

  it("matches every generated canonical path against the shared route patterns", () => {
    const state = { date: "2026-07-29", type: "all" as const };
    const paths = [
      statisticsPath(state.date),
      logbookPath(state),
      newLogPath(state),
      logDetailPath("10000000-0000-4000-8000-000000000001", state),
      editLogPath("10000000-0000-4000-8000-000000000001", state),
    ];
    expect(paths.every((path) => matchRoutes(routeTree, pathname(path)) !== null)).toBe(true);
  });
});
