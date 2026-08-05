import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRouteTree } from "../../test/calorie-tracker-test-harness";
import LogsLayout, { handle as logsHandle } from "./logs-layout";

/**
 * Render an overlay child inside the real nested logbook layout.
 *
 * @returns The function result.
 */
function Overlay(): React.ReactNode {
  return <section role="dialog">Log toevoegen</section>;
}

describe("nested logbook overlays", () => {
  it("keeps exactly one inert logbook mounted behind an overlay", async () => {
    const { container } = renderRouteTree([{
      path: "/logs",
      element: <LogsLayout />,
      loader: () => ({ timezone: null, routeState: null, content: null, loadFailed: false }),
      handle: logsHandle,
      children: [{
        path: "new",
        element: <Overlay />,
        handle: { logPresentation: "overlay", showsTrackerNavbar: true },
      }],
    }], "/logs/new?date=2026-07-29&type=all");

    expect(await screen.findByText("Logboek laden")).toBeInTheDocument();
    const inertLogbook = container.querySelector("[inert]");
    expect(inertLogbook).not.toBeNull();
    expect(inertLogbook).toHaveTextContent("Logboek laden");
    expect(screen.getByRole("dialog", { name: "" })).toBeInTheDocument();
  });
});
