import type { AvailableInputUnit, ProductSearchResult } from "@product-repos/contracts/calorie-tracker";
import type { CatalogProductRecord, ConsumptionCatalogReader } from "../../catalog/repositories/consumption-catalog.repository.ts";
import { toProductSearchResult, toUnitType } from "./calorie-tracker-projections.ts";
import { failure, success, type CalorieTrackerResult } from "./calorie-tracker-service-support.ts";

/** Package-selection use cases consumed by Calorie Tracker routes. */
export type PackageSelectionService = ReturnType<typeof createPackageSelectionService>;

/** Create package search and quantity-input selection use cases. */
export function createPackageSelectionService(catalogReader: ConsumptionCatalogReader) {
  /** Search active packages or return the user's recently consumed active packages. */
  function searchPackages(userId: string, query: string | undefined, limit: number): CalorieTrackerResult<ReadonlyArray<ProductSearchResult>> {
    if (query === undefined) {
      return success(catalogReader.findRecentActiveCatalogProducts(userId, limit).map((row) => toProductSearchResult(row.record)));
    }
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return failure("VALIDATION_ERROR", "Search query must contain at least two characters", { query: "Minimum length is 2" });
    return success(catalogReader.searchActiveCatalogProducts(normalizedQuery, limit).map(toProductSearchResult));
  }

  /** Return quantity input modes and compatible units for an active package. */
  function getAvailableInputUnits(productId: string): CalorieTrackerResult<ReadonlyArray<AvailableInputUnit>> {
    const productRecord = catalogReader.findCatalogProduct(productId);
    if (productRecord === undefined || !isActiveProduct(productRecord)) return failure("PRODUCT_NOT_FOUND", "Product not found");
    const values: AvailableInputUnit[] = [{ inputMode: "FULL_PRODUCT", unitType: null, label: productRecord.packageTypeName }];
    if (productRecord.portionName !== null) values.push({ inputMode: "PRODUCT_PORTION", unitType: null, label: productRecord.portionName });
    for (const unit of catalogReader.findCompatibleUnitTypes(productRecord.contentUnitDimension)) {
      values.push({ inputMode: "CONTENT_UNIT", unitType: toUnitType(unit), label: unit.name });
    }
    return success(values);
  }

  return { searchPackages, getAvailableInputUnits };
}

/** Determine whether one concrete product is actively selectable. */
function isActiveProduct(row: CatalogProductRecord): boolean {
  return row.productArchivedAt === null;
}
