import { and, asc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import type { BackendDatabase } from "../../../db/index.ts";
import { brand, category, concreteProduct, location, packageType, physicalInventoryItem, productComposition, productStockThreshold, unitContent, unitType } from "../../../db/schema.ts";


/** Concrete product fields required by inventory projections. */
export type InventoryProductRow = {
  readonly productId: string;
  readonly compositionName: string;
  readonly brandName: string | null;
  readonly packageTypeName: string;
  readonly contentAmount: string;
  readonly contentUnitSymbol: string;
  readonly dimension: "MASS" | "VOLUME" | "COUNT";
  readonly conversionToBase: string;
  readonly imageUrl: string | null;
  readonly archivedAt: string | null;
  readonly categoryId: number;
};

/** One physical stock row joined with its concrete product. */
export type PhysicalInventoryStockRow = InventoryProductRow & {
  readonly itemId: string;
  readonly remainingAmountBase: string;
  readonly version: number;
  readonly expiryDate: string | null;
  readonly locationId: number;
};

/** Location tree node used to build root-to-location paths. */
export type InventoryLocationRow = {
  readonly id: number;
  readonly parentId: number | null;
  readonly name: string;
  readonly archivedAt: string | null;
};

/** Category tree node used to build root-to-category paths. */
export type InventoryCategoryRow = {
  readonly id: number;
  readonly parentId: number | null;
  readonly name: string;
};

/** Stored low-stock threshold joined into the read projection. */
export type InventoryThresholdRow = {
  readonly productId: string;
  readonly lowStockAmountBase: string;
  readonly movementClass: "SLOW" | "MEDIUM" | "FAST" | null;
};

/** Read-side physical inventory persistence port. */
export type InventoryReader = {
  readonly findStockRows: () => ReadonlyArray<PhysicalInventoryStockRow>;
  readonly findProductsWithKnownContent: () => ReadonlyArray<InventoryProductRow>;
  readonly findAllLocations: () => ReadonlyArray<InventoryLocationRow>;
  readonly findAllCategories: () => ReadonlyArray<InventoryCategoryRow>;
  readonly findThresholds: () => ReadonlyArray<InventoryThresholdRow>;
};

/** Create the physical-inventory read adapter. */
export function createInventoryRepository(database: BackendDatabase): InventoryReader {
  /** Read active physical items with concrete-product metadata. */
  function findStockRows() {
    return database.select({
      itemId: physicalInventoryItem.id,
      remainingAmountBase: physicalInventoryItem.remainingAmountBase,
      version: physicalInventoryItem.version,
      expiryDate: physicalInventoryItem.expiryDate,
      locationId: physicalInventoryItem.locationId,
      ...productSelection,
    }).from(physicalInventoryItem)
      .innerJoin(concreteProduct, eq(physicalInventoryItem.productId, concreteProduct.id))
      .innerJoin(productComposition, eq(concreteProduct.productCompositionId, productComposition.id))
      .leftJoin(brand, eq(productComposition.brandId, brand.id))
      .innerJoin(packageType, eq(concreteProduct.packageTypeId, packageType.id))
      .innerJoin(unitContent, eq(concreteProduct.unitContentId, unitContent.id))
      .innerJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
      .where(gt(physicalInventoryItem.remainingAmountBase, "0"))
      .orderBy(asc(physicalInventoryItem.id)).all();
  }

  /** Read selectable active concrete products with measurable content. */
  function findProductsWithKnownContent() {
    return database.select(productSelection).from(concreteProduct)
      .innerJoin(productComposition, eq(concreteProduct.productCompositionId, productComposition.id))
      .leftJoin(brand, eq(productComposition.brandId, brand.id))
      .innerJoin(packageType, eq(concreteProduct.packageTypeId, packageType.id))
      .innerJoin(unitContent, eq(concreteProduct.unitContentId, unitContent.id))
      .innerJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
      .where(and(isNull(concreteProduct.archivedAt), isNotNull(concreteProduct.unitContentId)))
      .orderBy(asc(productComposition.name), asc(concreteProduct.id)).all();
  }

  /** Read all locations for paths and archive inheritance. */
  function findAllLocations() {
    return database.select({ id: location.id, parentId: location.parentId, name: location.name, archivedAt: location.archivedAt })
      .from(location).orderBy(asc(location.id)).all();
  }

  /** Read all categories for paths. */
  function findAllCategories() {
    return database.select({ id: category.id, parentId: category.parentId, name: category.name })
      .from(category).orderBy(asc(category.id)).all();
  }

  /** Read manual low-stock thresholds. */
  function findThresholds() {
    return database.select().from(productStockThreshold).orderBy(asc(productStockThreshold.productId)).all();
  }

  return { findStockRows, findProductsWithKnownContent, findAllLocations, findAllCategories, findThresholds };
}

const productSelection = {
  productId: concreteProduct.id,
  compositionName: productComposition.name,
  brandName: brand.name,
  packageTypeName: packageType.singularName,
  contentAmount: unitContent.amount,
  contentUnitSymbol: unitType.symbol,
  dimension: unitType.dimension,
  conversionToBase: unitType.conversionToBase,
  imageUrl: concreteProduct.imageUrl,
  archivedAt: concreteProduct.archivedAt,
  categoryId: productComposition.categoryId,
} as const;
