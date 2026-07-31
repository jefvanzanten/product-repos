import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import LogDetailRoute from "./log-detail";
import LogsRoute from "./logs";
import {
  createLogFixture,
  createLogListFixture,
  InMemoryCalorieTrackerServer,
  renderRouteTree,
} from "../test/calorie-tracker-test-harness";

let server: InMemoryCalorieTrackerServer;

/** Install a fresh protocol adapter and clear previous undo notices. */
function prepareTest(): void {
  server = new InMemoryCalorieTrackerServer();
  server.install();
  window.sessionStorage.clear();
}

/** Unmount the route tree and restore the original fetch boundary. */
function finishTest(): void {
  cleanup();
  server.restore();
  expect(server.unexpectedRequests).toEqual([]);
}

beforeEach(prepareTest);
afterEach(finishTest);

describe("delete and undo accessibility", () => {
  it("announces delete and restore while both actions remain keyboard operable", async () => {
    const log = createLogFixture({ productName: "Herstelbare cracker" });
    const detailPath = `/calorie-tracker/logs/${log.id}`;
    server.enqueueJson("GET", detailPath, log);
    server.enqueueJson("DELETE", detailPath, {
      id: log.id,
      deletedAt: new Date().toISOString(),
      restoreUntil: new Date(Date.now() + 30_000).toISOString(),
    });
    server.enqueueJson("GET", detailPath, { code: "LOG_NOT_FOUND", message: "Log niet gevonden" }, 404);
    server.enqueueJson("GET", "/calorie-tracker/logs?date=2024-02-29&type=all", createLogListFixture([]));
    server.enqueueJson("POST", `${detailPath}/restore`, log);
    server.enqueueJson("GET", "/calorie-tracker/logs?date=2024-02-29&type=all", createLogListFixture([log]));
    renderRouteTree([
      { path: "/logs/:logId", element: <LogDetailRoute /> },
      { path: "/logs", element: <LogsRoute /> },
    ], `/logs/${log.id}?date=2024-02-29&type=all`);

    const deleteButton = await screen.findByRole("button", { name: "Verwijderen" });
    deleteButton.focus();
    await userEvent.keyboard("{Enter}");

    const liveRegion = await screen.findByRole("status");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveTextContent("Log verwijderd.");
    const undoButton = screen.getByRole("button", { name: "Ongedaan maken" });
    undoButton.focus();
    expect(undoButton).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Log hersteld."));
    expect(await screen.findByText("Herstelbare cracker · Testmerk")).toBeInTheDocument();
    expect(window.sessionStorage.getItem("calorie-tracker-undo")).toBeNull();
    expect(server.matchingRequests("POST", `${detailPath}/restore`)).toHaveLength(1);
  });
});
