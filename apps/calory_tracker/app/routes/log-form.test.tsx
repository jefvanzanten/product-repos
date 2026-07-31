import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LogForm } from "./log-form";
import EditLogRoute from "./log-edit";
import {
  createLogFixture,
  createPackageFixture,
  createPackageUnitFixture,
  InMemoryCalorieTrackerServer,
  renderRoute,
} from "../test/calorie-tracker-test-harness";

let server: InMemoryCalorieTrackerServer;

/** Install a fresh HTTP adapter for each form route test. */
function prepareTest(): void {
  server = new InMemoryCalorieTrackerServer();
  server.install();
  window.sessionStorage.clear();
}

/** Unmount form state and restore the test process fetch boundary. */
function finishTest(): void {
  cleanup();
  server.restore();
  expect(server.unexpectedRequests).toEqual([]);
}

/** Wait longer than the product-search debounce interval. */
async function waitForSearchDebounce(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 350);
  });
}

beforeEach(prepareTest);
afterEach(finishTest);

describe("package search behavior", () => {
  it("uses recents for zero characters, waits at one, trims two, and renders no-results", async () => {
    server.enqueueJson("GET", "/calorie-tracker/packages/search", [createPackageFixture({ productName: "Recent product" })]);
    server.enqueueJson("GET", "/calorie-tracker/packages/search?query=ab", []);
    renderRoute(<LogForm mode={{ _tag: "Create" }} date="2024-02-29" type="all" />, "/logs/nieuw", "/logs/nieuw?date=2024-02-29&type=all");

    expect(await screen.findByRole("button", { name: /Recent product/ })).toBeInTheDocument();
    const search = screen.getByPlaceholderText("Zoek op product of merk");
    await userEvent.type(search, " a ");
    await waitForSearchDebounce();

    expect(screen.getByText("Typ minimaal twee tekens om te zoeken.")).toBeInTheDocument();
    expect(server.matchingRequests("GET", "/calorie-tracker/packages/search?query=a")).toHaveLength(0);

    await userEvent.clear(search);
    await userEvent.type(search, " ab ");
    expect(await screen.findByText("Product niet gevonden")).toBeInTheDocument();
    expect(server.matchingRequests("GET", "/calorie-tracker/packages/search?query=ab")).toHaveLength(1);
  });

  it("cancels an old debounced search and ignores its late response", async () => {
    server.enqueueJson("GET", "/calorie-tracker/packages/search", []);
    const stale = server.enqueueDeferred("GET", "/calorie-tracker/packages/search?query=cola");
    server.enqueueJson("GET", "/calorie-tracker/packages/search?query=water", [
      createPackageFixture({ packageId: 2, productName: "Actueel water", consumptionType: "DRINK" }),
    ]);
    renderRoute(<LogForm mode={{ _tag: "Create" }} date="2024-02-29" type="all" />, "/logs/nieuw", "/logs/nieuw?date=2024-02-29&type=all");
    const search = screen.getByPlaceholderText("Zoek op product of merk");

    await screen.findByText("Product niet gevonden");
    await userEvent.type(search, "cola");
    await waitFor(() => expect(server.matchingRequests("GET", "/calorie-tracker/packages/search?query=cola")).toHaveLength(1));
    await userEvent.clear(search);
    await userEvent.type(search, "water");

    expect(await screen.findByRole("button", { name: /Actueel water/ })).toBeInTheDocument();
    stale.resolve([createPackageFixture({ packageId: 3, productName: "Verouderde cola", consumptionType: "DRINK" })]);

    await waitFor(() => expect(screen.queryByRole("button", { name: /Verouderde cola/ })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Actueel water/ })).toBeInTheDocument();
  });
});

describe("archived package edit unit state", () => {
  it("retains only the existing archived unit until an active replacement supplies its own units", async () => {
    const archivedLog = createLogFixture({
      inputMode: "INDIVIDUAL_UNIT",
      quantity: "3",
      archived: true,
      productName: "Gearchiveerde crackers",
    });
    const replacement = createPackageFixture({ packageId: 2, productName: "Actieve crackers" });
    server.enqueueJson("GET", `/calorie-tracker/logs/${archivedLog.id}`, archivedLog);
    server.enqueueJson("GET", "/calorie-tracker/packages/search", [replacement]);
    server.enqueueJson("GET", "/calorie-tracker/logs?date=2024-02-29&type=all", {
      date: "2024-02-29",
      timezone: "UTC",
      type: "all",
      items: [],
    });
    server.enqueueJson("GET", "/calorie-tracker/packages/2/input-units", [createPackageUnitFixture()]);
    renderRoute(<EditLogRoute />, "/logs/:logId/bewerken", `/logs/${archivedLog.id}/bewerken?date=2024-02-29&type=all`);

    expect(await screen.findByText("Het huidige gearchiveerde product of de verpakking blijft beperkt bewerkbaar.")).toBeInTheDocument();
    const unitSelect = screen.getByRole("combobox", { name: "Eenheid" });
    expect(unitSelect).toBeEnabled();
    expect(unitSelect).toHaveValue("INDIVIDUAL_UNIT:package");
    expect(screen.getByRole("option", { name: "Cracker" })).toBeInTheDocument();
    expect(server.matchingRequests("GET", "/calorie-tracker/packages/1/input-units")).toHaveLength(0);

    await userEvent.click(await screen.findByRole("button", { name: /Actieve crackers/ }));
    await waitFor(() => expect(unitSelect).toHaveValue("PACKAGE:package"));
    expect(screen.getByRole("option", { name: "Hele verpakking" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Cracker" })).not.toBeInTheDocument();
    expect(server.matchingRequests("GET", "/calorie-tracker/packages/2/input-units")).toHaveLength(1);
  });
});
