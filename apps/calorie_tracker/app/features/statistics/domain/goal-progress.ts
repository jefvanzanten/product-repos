/** Goal-progress presentation model. */
export type GoalProgress =
  | { readonly tag: "NoGoal"; readonly current: number }
  | {
      readonly tag: "WithinGoal";
      readonly current: number;
      readonly goal: number;
      readonly percentage: number;
      readonly remaining: number;
    }
  | {
      readonly tag: "AboveGoal";
      readonly current: number;
      readonly goal: number;
      readonly percentage: number;
      readonly excess: number;
      readonly goalSegmentPercentage: number;
    };

/** Derive an explicit goal state for progress, remaining amount, and overflow segments. */
export function deriveGoalProgress(current: number, goal: number | null): GoalProgress {
  if (goal === null) return { tag: "NoGoal", current };
  const percentage = Math.round((current / goal) * 100);
  if (current <= goal) {
    return { tag: "WithinGoal", current, goal, percentage, remaining: goal - current };
  }
  return {
    tag: "AboveGoal",
    current,
    goal,
    percentage,
    excess: current - goal,
    goalSegmentPercentage: (goal / current) * 100,
  };
}
