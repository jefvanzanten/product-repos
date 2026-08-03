/** Joined catalog package projection exposed only for consumption use cases. */
export type CatalogPackageRecord = {
  readonly packageId: number;
  readonly productId: string;
  readonly productName: string;
  readonly brandId: string | null;
  readonly brandName: string | null;
  readonly consumptionType: "FOOD" | "DRINK" | "SUPPLEMENT";
  readonly productArchivedAt: string | null;
  readonly packageArchivedAt: string | null;
  readonly packageTypeId: number;
  readonly packageTypeName: string;
  readonly contentAmount: string;
  readonly contentUnitId: number;
  readonly contentUnitName: string;
  readonly contentUnitSymbol: string;
  readonly contentUnitDimension: "MASS" | "VOLUME" | "COUNT";
  readonly contentUnitConversionToBase: string;
  readonly portionName: string | null;
  readonly portionContentAmount: string | null;
  readonly portionContentUnitId: number | null;
  readonly portionContentUnitName: string | null;
  readonly portionContentUnitSymbol: string | null;
  readonly portionContentUnitDimension: "MASS" | "VOLUME" | "COUNT" | null;
  readonly portionContentUnitConversionToBase: string | null;
  readonly portionsPerPackage: number | null;
  readonly macroProfile: ProductMacroProfileRecord | null;
};

/** Product macro profile projected for consumption calculations. */
export type ProductMacroProfileRecord = {
  readonly referenceBasis: "PER_100_G" | "PER_100_ML" | "PER_UNIT";
  readonly caloriesKcal: string | null;
  readonly proteinG: string | null;
  readonly carbohydratesG: string | null;
  readonly fatG: string | null;
};

/** Unit type projected for consumption quantity conversion. */
export type UnitTypeRecord = {
  readonly id: number;
  readonly name: string;
  readonly symbol: string;
  readonly dimension: "MASS" | "VOLUME" | "COUNT";
  readonly conversionToBase: string;
};

/** Catalog reads required by current Calorie Tracker use cases. */
export type ConsumptionCatalogReader = {
  readonly searchActiveCatalogPackages: (query: string, limit: number) => ReadonlyArray<CatalogPackageRecord>;
  readonly findRecentActiveCatalogPackages: (userId: string, limit: number) => ReadonlyArray<CatalogPackageRecord>;
  readonly findCatalogPackage: (packageId: number) => CatalogPackageRecord | undefined;
  readonly findCatalogPackagesByIds: (packageIds: ReadonlyArray<number>) => ReadonlyArray<CatalogPackageRecord>;
  readonly findCompatibleUnitTypes: (dimension: UnitTypeRecord["dimension"]) => ReadonlyArray<UnitTypeRecord>;
  readonly findUnitType: (unitTypeId: number) => UnitTypeRecord | undefined;
  readonly findUnitTypesByIds: (unitTypeIds: ReadonlyArray<number>) => ReadonlyArray<UnitTypeRecord>;
};
