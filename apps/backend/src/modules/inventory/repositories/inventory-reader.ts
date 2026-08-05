/** Joined stock row exposed to inventory services without persistence details. */
export type InventoryStockRow = {
  readonly itemId: string;
  readonly quantity: number;
  readonly version: number;
  readonly expiryDate: string | null;
  readonly locationId: number;
  readonly productPackageId: number;
  readonly productId: string;
  readonly productName: string;
  readonly brandName: string | null;
  readonly packageTypeName: string;
  readonly contentAmount: string;
  readonly contentUnitName: string;
  readonly packageImageUrl: string | null;
  readonly packageArchivedAt: string | null;
  readonly productArchivedAt: string | null;
  readonly categoryId: number;
};

/** Active package row exposed for Inventory product selection. */
export type InventoryPackageRow = {
  readonly productPackageId: number;
  readonly productId: string;
  readonly productName: string;
  readonly brandName: string | null;
  readonly packageTypeName: string;
  readonly contentAmount: string;
  readonly contentUnitName: string;
  readonly packageImageUrl: string | null;
  readonly categoryId: number;
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

/** Read-side inventory persistence port. */
export type InventoryReader = {
  /**
   * Read all stock batches with a positive quantity joined with catalog data.
   *
   * @returns Joined inventory stock rows.
   */
  readonly findStockRows: () => ReadonlyArray<InventoryStockRow>;
  /**
   * Read active catalog packages available for new inventory.
   *
   * @returns Active product-package rows with presentation fields.
   */
  readonly findActivePackageRows: () => ReadonlyArray<InventoryPackageRow>;
  /**
   * Read all locations, including archived ones, for path derivation.
   *
   * @returns Location tree rows.
   */
  readonly findAllLocations: () => ReadonlyArray<InventoryLocationRow>;
  /**
   * Read all categories for path derivation.
   *
   * @returns Category tree rows.
   */
  readonly findAllCategories: () => ReadonlyArray<InventoryCategoryRow>;
};
