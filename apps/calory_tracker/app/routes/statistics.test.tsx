import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import StatisticsRoute from "./statistics";
import {
  createStatisticsFixture,
  InMemoryCalorieTrackerServer,
  renderRoute,
} from "../test/calorie-tracker-test-harness";

const emptyTotals = {
  caloriesKcal: "0",
  proteinG: "0",
  carbohydratesG: "0",
  fatG: "0",
} as const;

let server: InMemoryCalorieTrackerServer;

/** Install a fresh HTTP adapter and clear browser mutation state before each route test. */
function prepareTest(): void {
  server = new InMemoryCalorieTrackerServer();
  server.install();
  window.sessionStorage.clear();
}

/** Unmount route state and restore the process fetch boundary after each route test. */
function finishTest(): void {
  cleanup();
  server.restore();
  expect(server.unexpectedRequests).toEqual([]);
}

beforeEach(prepareTest);
afterEach(finishTest);

describe("statistics route states", () => {
  it("renders stable loading and empty-day states from a parsed aggregate", async () => {
    const response = server.enqueueDeferred("GET", "/calorie-tracker/statistics?date=2024-02-29");
    renderRoute(<StatisticsRoute />, "/", "/?date=2024-02-29");

    expect(screen.getByLabelText("Statistieken laden")).toBeInTheDocument();

    response.resolve(createStatisticsFixture(emptyTotals));

    expect(await screen.findByText("Nog geen consumpties op deze dag")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Calorieën" })).toBeInTheDocument();
    expect(screen.getAllByText(/0 (?:kcal|g)/)).toHaveLength(4);
  });

  it("offers retry after failure and then renders mixed ready and overflow states", async () => {
    server.enqueueJson("GET", "/calorie-tracker/statistics?date=2024-02-29", {
      code: "INTERNAL_ERROR",
      message: "Niet beschikbaar",
    }, 500);
    server.enqueueJson("GET", "/calorie-tracker/statistics?date=2024-02-29", createStatisticsFixture(
      { caloriesKcal: "2250", proteinG: "80", carbohydratesG: "210", fatG: "60" },
      {
        caloriesKcal: 2000,
        proteinG: "80",
        carbohydratesG: null,
        fatG: "70",
        updatedAt: "2024-02-29T07:00:00.000Z",
      },
    ));
    renderRoute(<StatisticsRoute />, "/", "/?date=2024-02-29");

    expect(await screen.findByText("Statistieken laden lukt niet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Opnieuw proberen" }));

    expect(await screen.findAllByText("250 kcal boven doel")).not.toHaveLength(0);
    expect(screen.getByRole("progressbar", { name: /Calorieën: 113%/ })).toHaveAttribute("aria-valuetext", "2.250 kcal; 250 kcal boven doel");
    expect(screen.getByRole("progressbar", { name: /Eiwit: 100%/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Koolhydraten" }).closest("article")).toHaveTextContent("210 g");
  });
});

describe("nutrition goals dialog", () => {
  it("supports toggles, disabled fields, cancellation, keyboard trapping, Escape, and opener focus restoration", async () => {
    server.enqueueJson("GET", "/calorie-tracker/statistics?date=2024-02-29", createStatisticsFixture(emptyTotals));
    renderRoute(<StatisticsRoute />, "/", "/?date=2024-02-29");
    const opener = await screen.findByRole("button", { name: "Doelen instellen" });
    opener.focus();

    await userEvent.click(opener);
    const caloriesToggle = screen.getAllByRole("checkbox")[0];
    const caloriesInput = screen.getByRole("textbox", { name: "Calorieën doel" });
    if (caloriesToggle === undefined) throw new Error("Expected the calories goal toggle");
    expect(caloriesToggle).toHaveFocus();
    expect(caloriesInput).toBeDisabled();

    await userEvent.click(caloriesToggle);
    expect(caloriesInput).toBeEnabled();
    await userEvent.type(caloriesInput, "2100");
    await userEvent.click(screen.getByRole("button", { name: "Annuleren" }));

    expect(screen.queryByRole("dialog", { name: "Persoonlijke dagdoelen" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    await userEvent.click(opener);
    const firstToggle = screen.getAllByRole("checkbox")[0];
    if (firstToggle === undefined) throw new Error("Expected a focusable goal toggle");
    expect(firstToggle).not.toBeChecked();
    expect(firstToggle).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Opslaan" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Persoonlijke dagdoelen" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("keeps the concept after a server error and applies disabled goals only after a successful save", async () => {
    const initialGoals = {
      caloriesKcal: null,
      proteinG: "90",
      carbohydratesG: null,
      fatG: null,
      updatedAt: "2024-02-29T07:00:00.000Z",
    } as const;
    server.enqueueJson("GET", "/calorie-tracker/statistics?date=2024-02-29", createStatisticsFixture(emptyTotals, initialGoals));
    server.enqueueJson("PUT", "/calorie-tracker/goals", { code: "INTERNAL_ERROR", message: "Opslag tijdelijk niet beschikbaar" }, 500);
    server.enqueueJson("PUT", "/calorie-tracker/goals", {
      caloriesKcal: 2200,
      proteinG: null,
      carbohydratesG: null,
      fatG: null,
      updatedAt: "2024-02-29T09:00:00.000Z",
    });
    server.enqueueJson("GET", "/calorie-tracker/statistics?date=2024-02-29", createStatisticsFixture(
      emptyTotals,
      {
        caloriesKcal: 2200,
        proteinG: null,
        carbohydratesG: null,
        fatG: null,
        updatedAt: "2024-02-29T09:00:00.000Z",
      },
    ));
    renderRoute(<StatisticsRoute />, "/", "/?date=2024-02-29");

    await userEvent.click(await screen.findByRole("button", { name: "Doelen wijzigen" }));
    const caloriesToggle = screen.getAllByRole("checkbox")[0];
    const proteinToggle = screen.getAllByRole("checkbox")[1];
    if (caloriesToggle === undefined || proteinToggle === undefined) throw new Error("Expected calorie and protein toggles");
    await userEvent.click(caloriesToggle);
    await userEvent.type(screen.getByRole("textbox", { name: "Calorieën doel" }), "2200");
    await userEvent.click(proteinToggle);
    expect(screen.getByRole("textbox", { name: "Eiwit doel" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Opslaan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Opslag tijdelijk niet beschikbaar");
    expect(screen.getByRole("textbox", { name: "Calorieën doel" })).toHaveValue("2200");
    expect(screen.getByRole("dialog", { name: "Persoonlijke dagdoelen" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Opslaan" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Persoonlijke dagdoelen" })).not.toBeInTheDocument());

    expect(server.matchingRequests("PUT", "/calorie-tracker/goals")).toHaveLength(2);
    expect(server.matchingRequests("PUT", "/calorie-tracker/goals")[1]?.body).toEqual({
      caloriesKcal: 2200,
      proteinG: null,
      carbohydratesG: null,
      fatG: null,
    });
    expect(await screen.findByRole("progressbar", { name: /Calorieën: 0%/ })).toHaveAttribute("aria-valuemax", "2200");
  });
});
