import type { QueryClient } from "@tanstack/react-query";
import { calorieTrackerQueryKeys } from "./calorie-tracker-query-keys";

/** Invalidate every log-list and statistics projection for one local date. */
export async function invalidateCalorieTrackerDate(queryClient: QueryClient, date: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: calorieTrackerQueryKeys.logListsForDate(date) }),
    queryClient.invalidateQueries({ queryKey: calorieTrackerQueryKeys.statisticsForDate(date) }),
  ]);
}
