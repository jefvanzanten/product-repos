import type {
  DailyStatistics as DailyStatisticsDto,
  NutritionGoal as NutritionGoalDto,
} from "@product-repos/contracts/calorie-tracker";
import type { DailyStatistics, NutritionGoal } from "../domain/statistics";

/** Map a validated daily-statistics DTO into the domain model. */
export function mapDailyStatistics(dto: DailyStatisticsDto): DailyStatistics {
  return dto;
}

/** Map a validated nutrition-goal DTO into the domain model. */
export function mapNutritionGoal(dto: NutritionGoalDto): NutritionGoal {
  return dto;
}
