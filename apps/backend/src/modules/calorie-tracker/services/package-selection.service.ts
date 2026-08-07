import type { AvailableInputUnit, PackageSearchResult } from "@product-repos/contracts/calorie-tracker";
import type { CatalogPackageRecord, ConsumptionCatalogReader } from "../../catalog/repositories/consumption-catalog-reader.ts";
import { toPackageSearchResult, toUnitType } from "./calorie-tracker-projections.ts";
import { failure, success, type CalorieTrackerResult } from "./calorie-tracker-service-support.ts";

/** Package-selection use cases consumed by Calorie Tracker routes. */
export type PackageSelectionService = ReturnType<typeof createPackageSelectionService>;

/** Create package search and quantity-input selection use cases. */
export function createPackageSelectionService(catalogReader: ConsumptionCatalogReader) {
  /** Search active packages or return the user's recently consumed active packages. */
  function searchPackages(userId: string, query: string | undefined, limit: number): CalorieTrackerResult<ReadonlyArray<PackageSearchResult>> {
    if (query === undefined) {
      return success(catalogReader.findRecentActiveCatalogPackages(userId, limit).map((row) => toPackageSearchResult(row.record)));
    }
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return failure("VALIDATION_ERROR", "Search query must contain at least two characters", { query: "Minimum length is 2" });
    return success(catalogReader.searchActiveCatalogPackages(normalizedQuery, limit).map(toPackageSearchResult));
  }

  /** Return quantity input modes and compatible units for an active package. */
  function getAvailableInputUnits(packageId: number): CalorieTrackerResult<ReadonlyArray<AvailableInputUnit>> {
    const packageRecord = catalogReader.findCatalogPackage(packageId);
    if (packageRecord === undefined || !isActivePackage(packageRecord)) return failure("PRODUCT_PACKAGE_NOT_FOUND", "Product package not found");
    const values: AvailableInputUnit[] = [{ inputMode: "PACKAGE", unitType: null, label: packageRecord.packageTypeName }];
    if (packageRecord.portionName !== null) values.push({ inputMode: "INDIVIDUAL_UNIT", unitType: null, label: packageRecord.portionName });
    for (const unit of catalogReader.findCompatibleUnitTypes(packageRecord.contentUnitDimension)) {
      values.push({ inputMode: "CONTENT_UNIT", unitType: toUnitType(unit), label: unit.name });
    }
    return success(values);
  }

  return { searchPackages, getAvailableInputUnits };
}

/** Determine whether both product and package are actively selectable. */
function isActivePackage(row: CatalogPackageRecord): boolean {
  return row.productArchivedAt === null && row.packageArchivedAt === null;
}
