import { describe, expect, it } from "vitest";
import { deriveGoalProgress } from "./goal-progress";

describe("goal progress", () => {
  it("models no goal, exact goal, and an overflow segment separately", () => {
    expect(deriveGoalProgress(12, null)).toEqual({ tag: "NoGoal", current: 12 });
    expect(deriveGoalProgress(100, 100)).toMatchObject({ tag: "WithinGoal", percentage: 100, remaining: 0 });
    expect(deriveGoalProgress(125, 100)).toMatchObject({ tag: "AboveGoal", percentage: 125, excess: 25, goalSegmentPercentage: 80 });
  });

  it("keeps zero and very large values finite", () => {
    expect(deriveGoalProgress(0, 2400)).toMatchObject({ tag: "WithinGoal", percentage: 0, remaining: 2400 });
    expect(deriveGoalProgress(1_000_000, 1)).toMatchObject({ tag: "AboveGoal", percentage: 100_000_000 });
  });
});
