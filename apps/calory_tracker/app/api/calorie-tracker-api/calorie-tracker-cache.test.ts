import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { invalidateCalorieTrackerDate } from "./calorie-tracker-cache";
import { calorieTrackerQueryKeys } from "./calorie-tracker-query-keys";

describe("invalidateCalorieTrackerDate", () => {
  it("invalidates only date-scoped log lists and statistics", async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();

    await invalidateCalorieTrackerDate(queryClient, "2026-01-15");

    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenNthCalledWith(1, { queryKey: calorieTrackerQueryKeys.logListsForDate("2026-01-15") });
    expect(invalidate).toHaveBeenNthCalledWith(2, { queryKey: calorieTrackerQueryKeys.statisticsForDate("2026-01-15") });
  });
});
