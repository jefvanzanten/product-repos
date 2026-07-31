import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import LogsRoute from "./logs";
import {
  createLogFixture,
  createLogListFixture,
  InMemoryCalorieTrackerServer,
  renderRoute,
} from "../test/calorie-tracker-test-harness";

let server: InMemoryCalorieTrackerServer;

/** Install an isolated protocol server and clear persisted logbook UI state. */
function prepareTest(): void {
  server = new InMemoryCalorieTrackerServer();
  server.install();
  window.sessionStorage.clear();
}

/** Remove rendered routes and restore the original fetch implementation. */
function finishTest(): void {
  cleanup();
  server.restore();
  expect(server.unexpectedRequests).toEqual([]);
}

beforeEach(prepareTest);
afterEach(finishTest);

describe("logbook view states and filtering", () => {
  it("renders loading, failure with retry, and an empty date as separate states", async () => {
    const initial = server.enqueueDeferred("GET", "/calorie-tracker/logs?date=2024-02-29&type=all");
    renderRoute(<LogsRoute />, "/logs", "/logs?date=2024-02-29&type=all");

    expect(screen.getByText("Logboek laden")).toBeInTheDocument();
    initial.resolve({ code: "INTERNAL_ERROR", message: "Tijdelijk niet beschikbaar" }, 500);
    expect(await screen.findByText("Logboek laden lukt niet")).toBeInTheDocument();

    server.enqueueJson("GET", "/calorie-tracker/logs?date=2024-02-29&type=all", createLogListFixture([]));
    await userEvent.click(screen.getByRole("button", { name: "Opnieuw proberen" }));

    expect(await screen.findByText("Nog geen consumpties")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Log toevoegen/ })).not.toHaveLength(0);
  });

  it("renders an empty filter with an accessible recovery action and one active chip", async () => {
    server.enqueueJson("GET", "/calorie-tracker/logs?date=2024-02-29&type=drink", createLogListFixture([], "drink"));
    server.enqueueJson("GET", "/calorie-tracker/logs?date=2024-02-29&type=all", createLogListFixture([]));
    const { router } = renderRoute(<LogsRoute />, "/logs", "/logs?date=2024-02-29&type=drink");

    expect(await screen.findByText("Geen resultaten binnen dit filter")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Consumptietypefilter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drinken" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("button").filter((button) => button.getAttribute("aria-pressed") === "true")).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Alles tonen" }));
    await waitFor(() => expect(router.state.location.search).toBe("?date=2024-02-29&type=all"));
    expect(screen.getByRole("button", { name: "Alles" })).toHaveAttribute("aria-pressed", "true");
  });

  it("sorts ready items, exposes archive status, and changes the only active filter by keyboard", async () => {
    const lateArchived = createLogFixture({
      id: "20000000-0000-4000-8000-000000000002",
      productName: "Late gearchiveerde drank",
      consumptionType: "DRINK",
      consumedAt: "2024-02-29T10:00:00.000Z",
      archived: true,
    });
    const earlyFood = createLogFixture({
      id: "20000000-0000-4000-8000-000000000003",
      productName: "Vroege cracker",
      consumedAt: "2024-02-29T07:00:00.000Z",
    });
    server.enqueueJson("GET", "/calorie-tracker/logs?date=2024-02-29&type=all", createLogListFixture([lateArchived, earlyFood]));
    server.enqueueJson("GET", "/calorie-tracker/logs?date=2024-02-29&type=food", createLogListFixture([earlyFood], "food"));
    const { container, router } = renderRoute(<LogsRoute />, "/logs", "/logs?date=2024-02-29&type=all");

    expect(await screen.findByText("Vroege cracker · Testmerk")).toBeInTheDocument();
    const items = [...container.querySelectorAll<HTMLElement>("[data-log-id]")];
    expect(items.map((item) => item.dataset.logId)).toEqual([earlyFood.id, lateArchived.id]);
    expect(screen.getByText("Gearchiveerd")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("120 kcal");

    const foodFilter = screen.getByRole("button", { name: "Voeding" });
    foodFilter.focus();
    await userEvent.keyboard(" ");
    await waitFor(() => expect(router.state.location.search).toBe("?date=2024-02-29&type=food"));
    expect(foodFilter).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("button").filter((button) => button.getAttribute("aria-pressed") === "true")).toHaveLength(1);
    expect(screen.queryByText("Late gearchiveerde drank · Testmerk")).not.toBeInTheDocument();
  });
});

describe("logbook stale-response protection", () => {
  it("aborts an older filter request so its late response cannot replace current results", async () => {
    const stale = server.enqueueDeferred("GET", "/calorie-tracker/logs?date=2024-02-29&type=all");
    const currentLog = createLogFixture({
      id: "20000000-0000-4000-8000-000000000004",
      productName: "Actueel water",
      consumptionType: "DRINK",
    });
    server.enqueueJson("GET", "/calorie-tracker/logs?date=2024-02-29&type=drink", createLogListFixture([currentLog], "drink"));
    renderRoute(<LogsRoute />, "/logs", "/logs?date=2024-02-29&type=all");

    await userEvent.click(screen.getByRole("button", { name: "Drinken" }));
    expect(await screen.findByText("Actueel water · Testmerk")).toBeInTheDocument();

    stale.resolve(createLogListFixture([
      createLogFixture({
        id: "20000000-0000-4000-8000-000000000005",
        productName: "Verouderde cracker",
      }),
    ]));

    await waitFor(() => expect(screen.queryByText("Verouderde cracker · Testmerk")).not.toBeInTheDocument());
    expect(screen.getByText("Actueel water · Testmerk")).toBeInTheDocument();
  });
});
