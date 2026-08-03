/** Goal-progress presentation model. */
export type GoalProgress =
  | { readonly _tag: "NoGoal"; readonly current: number }
  | {
      readonly _tag: "WithinGoal";
      readonly current: number;
      readonly goal: number;
      readonly percentage: number;
      readonly remaining: number;
    }
  | {
      readonly _tag: "AboveGoal";
      readonly current: number;
      readonly goal: number;
      readonly percentage: number;
      readonly excess: number;
      readonly goalSegmentPercentage: number;
    };

/** Derive an explicit goal state for progress, remaining amount, and overflow segments. */
export function deriveGoalProgress(current: number, goal: number | null): GoalProgress {
  if (goal === null) return { _tag: "NoGoal", current };
  const percentage = Math.round((current / goal) * 100);
  if (current <= goal) {
    return { _tag: "WithinGoal", current, goal, percentage, remaining: goal - current };
  }
  return {
    _tag: "AboveGoal",
    current,
    goal,
    percentage,
    excess: current - goal,
    goalSegmentPercentage: (goal / current) * 100,
  };
}
