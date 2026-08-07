import type { UnifiedSearchResult } from "@product-repos/contracts/calorie-tracker";
import type { ConsumptionCatalogReader } from "../../catalog/repositories/consumption-catalog-reader.ts";
import type { DishRepository } from "../repositories/calorie-tracker-store.ts";
import { createDishProjector, toPackageSearchResult } from "./calorie-tracker-projections.ts";
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
      const recentPackages = catalogReader.findRecentActiveCatalogPackages(userId, limit)
        .map((row) => ({ recency: row.lastConsumedAt, result: { kind: "PACKAGE", ...toPackageSearchResult(row.record) } as UnifiedSearchResult }));
      const recentDishRows = dishRepository.findRecentConsumedDishes(userId, limit);
      const projectedDishes = dishProjector.projectDishSearchResults(recentDishRows.map((row) => row.dish));
      const recencyByDishId = new Map(recentDishRows.map((row) => [row.dish.id, row.lastConsumedAt]));
      const recentDishes = projectedDishes
        .map((result) => ({ recency: recencyByDishId.get(result.id) ?? "", result: { kind: "DISH", ...result } as UnifiedSearchResult }));
      return success([...recentPackages, ...recentDishes]
        .sort((left, right) => right.recency.localeCompare(left.recency))
        .map((entry) => entry.result)
        .slice(0, limit));
    }
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return failure("VALIDATION_ERROR", "Search query must contain at least two characters", { query: "Minimum length is 2" });
    const packages = catalogReader.searchActiveCatalogPackages(normalizedQuery, limit)
      .map((record): UnifiedSearchResult => ({ kind: "PACKAGE", ...toPackageSearchResult(record) }));
    const dishes = dishProjector.projectDishSearchResults(dishRepository.searchActiveUserDishes(userId, normalizedQuery, limit))
      .map((result): UnifiedSearchResult => ({ kind: "DISH", ...result }));
    return success([...packages, ...dishes]);
  }

  return { search };
}
