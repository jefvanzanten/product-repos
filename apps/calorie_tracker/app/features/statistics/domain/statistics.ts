/** Optional nutrition goals configured by the user. */
export type NutritionGoal = {
  readonly caloriesKcal: number | null;
  readonly proteinG: string | null;
  readonly carbohydratesG: string | null;
  readonly fatG: string | null;
  readonly updatedAt: string | null;
};

/** Complete nutrition-goal replacement command. */
export type UpsertNutritionGoal = Omit<NutritionGoal, "updatedAt">;

/** Daily calorie and macro totals with current goals. */
export type DailyStatistics = {
  readonly date: string;
  readonly timezone: string;
  readonly totals: {
    readonly caloriesKcal: string | null;
    readonly proteinG: string | null;
    readonly carbohydratesG: string | null;
    readonly fatG: string | null;
  };
  readonly goals: NutritionGoal | null;
};
