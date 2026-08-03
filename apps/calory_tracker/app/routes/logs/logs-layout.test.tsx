import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderRouteTree } from "../../test/calorie-tracker-test-harness";
import LogsLayout, { handle as logsHandle } from "./logs-layout";

vi.mock("./logs", () => ({
  default: () => <main>Gemount logboek</main>,
}));

/** Render an overlay child inside the real nested logbook layout. */
function Overlay(): React.ReactNode {
  return <section role="dialog">Log toevoegen</section>;
}

describe("nested logbook overlays", () => {
  it("keeps exactly one inert logbook mounted behind an overlay", () => {
    renderRouteTree([{
      path: "/logs",
      element: <LogsLayout />,
      handle: logsHandle,
      children: [{
        path: "new",
        element: <Overlay />,
        handle: { logPresentation: "overlay", showsTrackerNavbar: true },
      }],
    }], "/logs/new?date=2026-07-29&type=all");

    expect(screen.getAllByText("Gemount logboek")).toHaveLength(1);
    expect(screen.getByText("Gemount logboek").parentElement).toHaveAttribute("inert");
    expect(screen.getByRole("dialog", { name: "" })).toBeInTheDocument();
  });
});
