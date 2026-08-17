import { describe, expect, it } from "vitest";
import { canonicalizeTrackerUrl } from "./tracker-url-state";

describe("Calorie Tracker URL state", () => {
  it("preserves a valid leap day and supported filter", () => {
    expect(canonicalizeTrackerUrl("2024-02-29", "drink", "2026-07-29")).toEqual({
      state: { date: "2024-02-29", type: "drink" },
      requiresReplace: false,
    });
  });

  it("canonicalizes missing, future, and unknown values", () => {
    expect(canonicalizeTrackerUrl("2026-07-30", "medicine", "2026-07-29")).toEqual({
      state: { date: "2026-07-29", type: "all" },
      requiresReplace: true,
    });
  });
});
