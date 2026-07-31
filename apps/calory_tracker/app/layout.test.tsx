import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LoaderFunction } from "react-router";
import BottomTabsLayout from "./layout";
import { renderRouteTree } from "./test/calorie-tracker-test-harness";

/** Supply an authenticated regular user to the protected layout under test. */
const loadAuthenticatedUser: LoaderFunction = () => ({
  user: {
    id: "10000000-0000-4000-8000-000000000001",
    email: "gebruiker@example.nl",
    name: "Gebruiker",
    role: "user",
  },
});

/** Verify that the host tab remains active on the nested logbook route. */
async function verifyActiveTrackerTabOnLogbook(): Promise<void> {
  renderRouteTree([
    {
      path: "/",
      element: <BottomTabsLayout />,
      loader: loadAuthenticatedUser,
      children: [{ path: "logs", element: <main>Consumptielogboek</main> }],
    },
  ], "/logs?date=2024-02-29&type=all");

  const primaryNavigation = await screen.findByRole("navigation", { name: "Hoofdnavigatie" });
  expect(within(primaryNavigation).getByRole("link", { name: "Calory Tracker" })).toHaveAttribute("aria-current", "page");
}

/** Register Calorie Tracker application-shell regression tests. */
function registerLayoutTests(): void {
  it("keeps Calory Tracker active while viewing the consumption logbook", verifyActiveTrackerTabOnLogbook);
}

describe("Calorie Tracker bottom tab state", registerLayoutTests);
