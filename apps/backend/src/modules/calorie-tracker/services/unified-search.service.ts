import type { UnifiedSearchResult } from "@product-repos/contracts/calorie-tracker";
import type { ConsumptionCatalogReader } from "../../catalog/repositories/consumption-catalog.repository.ts";
import type { DishRepository } from "../../recipes/repositories/dish.repository.ts";
import { createDishProjector, toProductSearchResult } from "./calorie-tracker-projections.ts";
import { failure, success, type CalorieTrackerResult } from "./calorie-tracker-service-support.ts";

/** Combined package-and-dish search use cases consumed by the log-flow routes. */
export type UnifiedSearchService = ReturnType<typeof createUnifiedSearchService>;

/** Create the combined package-and-dish search used exclusively by the log-addition flow. */
export function createUnifiedSearchService(dependencies: {
  readonly catalogReader: ConsumptionCatalogReader;
  readonly dishRepository: DishRepository;
}) {
  const { catalogReader, dishRepository } = dependencies;
  const dishProjector = createDishProjector(catalogReader, dishRepository);

  /** Search packages and dishes together, or return recently consumed items of both kinds. */
  function search(userId: string, query: string | undefined, limit: number): CalorieTrackerResult<ReadonlyArray<UnifiedSearchResult>> {
    if (query === undefined) {
      const recentPackages = catalogReader.findRecentActiveCatalogProducts(userId, limit)
        .map((row) => ({ recency: row.lastConsumedAt, result: { kind: "PRODUCT", ...toProductSearchResult(row.record) } satisfies UnifiedSearchResult }));
      const recentDishRows = dishRepository.findRecentConsumedDishes(userId, limit);
      const projectedDishes = dishProjector.projectDishSearchResults(recentDishRows.map((row) => row.dish), userId);
      const recencyByDishId = new Map(recentDishRows.map((row) => [row.dish.id, row.lastConsumedAt]));
      const recentDishes = projectedDishes
        .map((result) => ({ recency: recencyByDishId.get(result.id) ?? "", result: { kind: "DISH", ...result } satisfies UnifiedSearchResult }));
      return success([...recentPackages, ...recentDishes]
        .sort((left, right) => right.recency.localeCompare(left.recency))
        .map((entry) => entry.result)
        .slice(0, limit));
    }
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return failure("VALIDATION_ERROR", "Search query must contain at least two characters", { query: "Minimum length is 2" });
    const packages = catalogReader.searchActiveCatalogProducts(normalizedQuery, limit)
      .map((record): UnifiedSearchResult => ({ kind: "PRODUCT", ...toProductSearchResult(record) }));
    const dishes = dishProjector.projectDishSearchResults(dishRepository.searchAccessibleDishes(userId, normalizedQuery, limit), userId)
      .map((result): UnifiedSearchResult => ({ kind: "DISH", ...result }));
    return success([...packages, ...dishes]);
  }

  return { search };
}
