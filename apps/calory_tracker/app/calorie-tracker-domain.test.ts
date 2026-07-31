import { describe, expect, it } from "vitest";
import {
  canonicalizeTrackerUrl,
  deriveGoalProgress,
  getProductSearchMode,
  isLocalDate,
  parseLocalConsumptionMoment,
  parsePositiveDecimal,
  sortChronologically,
} from "./calorie-tracker-domain";

describe("Calorie Tracker URL state", () => {
  it("preserves a valid leap day and supported filter", () => {
    expect(canonicalizeTrackerUrl("2024-02-29", "drink", "2026-07-29")).toEqual({
      state: { date: "2024-02-29", type: "drink" },
      requiresReplace: false,
    });
  });

  it.each(["2023-02-29", "2026-13-01", "not-a-date"])("rejects invalid date %s", (date) => {
    expect(isLocalDate(date)).toBe(false);
  });

  it("canonicalizes missing, future, and unknown values", () => {
    expect(canonicalizeTrackerUrl("2026-07-30", "medicine", "2026-07-29")).toEqual({
      state: { date: "2026-07-29", type: "all" },
      requiresReplace: true,
    });
  });
});

describe("positive decimal parsing", () => {
  it.each([
    ["0,5", "0.5"],
    [" 1.50 ", "1.5"],
    ["0002.00", "2"],
  ])("parses %s as %s", (input, canonical) => {
    expect(parsePositiveDecimal(input)).toEqual({ _tag: "Success", value: { canonical } });
  });

  it.each(["0", "-1", "text", "1,2,3", " "])("rejects %s", (input) => {
    expect(parsePositiveDecimal(input)._tag).toBe("Failure");
  });

  it("preserves exceptionally large positive values", () => {
    expect(parsePositiveDecimal("999999999999999999.9")).toEqual({
      _tag: "Success",
      value: { canonical: "999999999999999999.9" },
    });
  });
});

describe("chronological ordering", () => {
  it("orders equal consumption instants by creation time", () => {
    const records = [
      { consumedAt: "2026-07-29T08:00:00Z", createdAt: "2026-07-29T10:00:00Z", id: "later-created" },
      { consumedAt: "2026-07-29T07:00:00Z", createdAt: "2026-07-29T11:00:00Z", id: "earlier" },
      { consumedAt: "2026-07-29T08:00:00Z", createdAt: "2026-07-29T09:00:00Z", id: "first-created" },
    ];
    expect(sortChronologically(records).map((record) => record.id)).toEqual(["earlier", "first-created", "later-created"]);
  });
});

describe("product search policy", () => {
  it("uses recents for an empty trimmed term", () => {
    expect(getProductSearchMode("  ")).toEqual({ _tag: "Recent" });
  });

  it("does not request one-character terms", () => {
    expect(getProductSearchMode(" a ")).toEqual({ _tag: "TooShort" });
  });

  it("searches from two trimmed characters", () => {
    expect(getProductSearchMode("  cola  ")).toEqual({ _tag: "Search", query: "cola" });
  });
});

describe("goal progress", () => {
  it("models no goal, exact goal, and an overflow segment separately", () => {
    expect(deriveGoalProgress(12, null)).toEqual({ _tag: "NoGoal", current: 12 });
    expect(deriveGoalProgress(100, 100)).toMatchObject({ _tag: "WithinGoal", percentage: 100, remaining: 0 });
    expect(deriveGoalProgress(125, 100)).toMatchObject({ _tag: "AboveGoal", percentage: 125, excess: 25, goalSegmentPercentage: 80 });
  });

  it("keeps zero and very large values finite", () => {
    expect(deriveGoalProgress(0, 2400)).toMatchObject({ _tag: "WithinGoal", percentage: 0, remaining: 2400 });
    expect(deriveGoalProgress(1_000_000, 1)).toMatchObject({ _tag: "AboveGoal", percentage: 100_000_000 });
  });
});

describe("local consumption moment", () => {
  it("rejects a nonexistent DST spring-forward time", () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = "Europe/Amsterdam";
    expect(parseLocalConsumptionMoment("2026-03-29", "02:30", new Date("2026-03-29T04:00:00Z"))).toEqual({ _tag: "Failure", error: { _tag: "InvalidMoment" } });
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  });

  it("rejects normalized invalid calendar moments", () => {
    expect(parseLocalConsumptionMoment("2026-02-29", "12:00", new Date("2026-03-01T00:00:00Z"))._tag).toBe("Failure");
  });

  it("rejects future moments and accepts past moments", () => {
    const now = new Date("2026-07-29T12:00:00");
    expect(parseLocalConsumptionMoment("2026-07-29", "12:01", now)).toEqual({ _tag: "Failure", error: { _tag: "FutureMoment" } });
    expect(parseLocalConsumptionMoment("2026-07-29", "11:59", now)._tag).toBe("Success");
  });
});
