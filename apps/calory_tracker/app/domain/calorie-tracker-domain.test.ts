import { describe, expect, it } from "vitest";
import { canonicalizeTrackerUrl, getProductSearchMode } from "./consumption-types";
import {
  isLocalDate,
  parseEditedConsumptionMoment,
  parseLocalConsumptionMoment,
  sortChronologically,
} from "./dates-and-timezones";
import { deriveGoalProgress } from "./goals";
import {
  parsePositiveDecimal,
  selectInputUnitKey,
  shouldIncludeLegacyInputUnit,
} from "./quantities";

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

describe("edit input units", () => {
  it("includes a legacy unit only for the original package", () => {
    expect(shouldIncludeLegacyInputUnit(12, 12)).toBe(true);
    expect(shouldIncludeLegacyInputUnit(13, 12)).toBe(false);
  });

  it("resets an unavailable unit to the new package's first available unit", () => {
    expect(selectInputUnitKey("CONTENT_UNIT:2", ["PACKAGE:package", "CONTENT_UNIT:3"])).toBe("PACKAGE:package");
    expect(selectInputUnitKey("CONTENT_UNIT:3", ["PACKAGE:package", "CONTENT_UNIT:3"])).toBe("CONTENT_UNIT:3");
  });
});

describe("local consumption moment", () => {
  it("rejects a nonexistent DST spring-forward time in the explicit timezone", () => {
    expect(parseLocalConsumptionMoment("2026-03-29", "02:30", "Europe/Amsterdam", new Date("2026-03-29T04:00:00Z"))).toEqual({ _tag: "Failure", error: { _tag: "InvalidMoment" } });
  });

  it("rejects an ambiguous DST fall-back time instead of choosing an instant silently", () => {
    expect(parseLocalConsumptionMoment("2026-10-25", "02:30", "Europe/Amsterdam", new Date("2026-10-25T04:00:00Z"))).toEqual({ _tag: "Failure", error: { _tag: "AmbiguousMoment" } });
  });

  it("rejects normalized invalid calendar moments", () => {
    expect(parseLocalConsumptionMoment("2026-02-29", "12:00", "UTC", new Date("2026-03-01T00:00:00Z"))._tag).toBe("Failure");
  });

  it("resolves explicit timezone moments and rejects future instants", () => {
    const now = new Date("2026-07-29T12:00:00Z");
    expect(parseLocalConsumptionMoment("2026-07-29", "14:01", "Europe/Amsterdam", now)).toEqual({ _tag: "Failure", error: { _tag: "FutureMoment" } });
    expect(parseLocalConsumptionMoment("2026-07-29", "13:59", "Europe/Amsterdam", now)).toEqual({ _tag: "Success", value: "2026-07-29T11:59:00.000Z" });
  });

  it("preserves the exact original instant when edit fields remain unchanged", () => {
    const original = {
      date: "2026-10-25",
      time: "02:30",
      consumedAt: "2026-10-25T00:30:42.000Z",
    };
    expect(parseEditedConsumptionMoment("2026-10-25", "02:30", "Europe/Amsterdam", original, new Date("2026-10-25T04:00:00Z"))).toEqual({
      _tag: "Success",
      value: original.consumedAt,
    });
  });
});
