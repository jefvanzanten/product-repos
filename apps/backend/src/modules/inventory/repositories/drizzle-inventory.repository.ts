import { and, asc, eq, gt, isNull } from "drizzle-orm";
import type { BackendDatabase } from "../../../db/index.ts";
import {
  brand,
  category,
  inventoryItem,
  location,
  packageType,
  product,
  productPackage,
  unitContent,
  unitType,
} from "../../../db/schema.ts";
import type { InventoryReader } from "./inventory-reader.ts";

/**
 * Create the read-side inventory persistence adapter for one injected database.
 *
 * @param database - Database used to read inventory and supporting catalog data.
 * @returns The inventory persistence reader.
 */
export function createDrizzleInventoryRepository(database: BackendDatabase): InventoryReader {
  /**
   * Read all stock batches with a positive quantity joined with catalog data.
   *
   * @returns Joined inventory stock rows.
   */
  function findStockRows() {
    return database
      .select({
        itemId: inventoryItem.id,
        quantity: inventoryItem.quantity,
        version: inventoryItem.version,
        expiryDate: inventoryItem.expiryDate,
        locationId: inventoryItem.locationId,
        productPackageId: inventoryItem.productPackageId,
        productId: product.id,
        productName: product.name,
        brandName: brand.name,
        packageTypeName: packageType.name,
        contentAmount: unitContent.amount,
        contentUnitName: unitType.name,
        packageImageUrl: productPackage.imageUrl,
        packageArchivedAt: productPackage.archivedAt,
        productArchivedAt: product.archivedAt,
        categoryId: product.categoryId,
      })
      .from(inventoryItem)
      .innerJoin(productPackage, eq(inventoryItem.productPackageId, productPackage.id))
      .innerJoin(product, eq(productPackage.productId, product.id))
      .leftJoin(brand, eq(product.brandId, brand.id))
      .innerJoin(packageType, eq(productPackage.packageTypeId, packageType.id))
      .innerJoin(unitContent, eq(productPackage.unitContentId, unitContent.id))
      .innerJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
      .where(gt(inventoryItem.quantity, 0))
      .orderBy(asc(inventoryItem.id))
      .all();
  }

  /** Read active product packages available for new inventory. */
  function findActivePackageRows() {
    return database
      .select({
        productPackageId: productPackage.id,
        productId: product.id,
        productName: product.name,
        brandName: brand.name,
        packageTypeName: packageType.name,
        contentAmount: unitContent.amount,
        contentUnitName: unitType.name,
        packageImageUrl: productPackage.imageUrl,
        categoryId: product.categoryId,
      })
      .from(productPackage)
      .innerJoin(product, eq(productPackage.productId, product.id))
      .leftJoin(brand, eq(product.brandId, brand.id))
      .innerJoin(packageType, eq(productPackage.packageTypeId, packageType.id))
      .innerJoin(unitContent, eq(productPackage.unitContentId, unitContent.id))
      .innerJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
      .where(and(isNull(product.archivedAt), isNull(productPackage.archivedAt)))
      .orderBy(asc(product.name), asc(productPackage.id))
      .all();
  }

  /**
   * Read all locations, including archived ones, so batch paths stay resolvable.
   *
   * @returns Location rows used for path derivation.
   */
  function findAllLocations() {
    return database
      .select({ id: location.id, parentId: location.parentId, name: location.name, archivedAt: location.archivedAt })
      .from(location)
      .orderBy(asc(location.id))
      .all();
  }

  /**
   * Read all categories for path derivation.
   *
   * @returns Category rows used for path derivation.
   */
  function findAllCategories() {
    return database
      .select({ id: category.id, parentId: category.parentId, name: category.name })
      .from(category)
      .orderBy(asc(category.id))
      .all();
  }

  return { findStockRows, findActivePackageRows, findAllLocations, findAllCategories };
}
