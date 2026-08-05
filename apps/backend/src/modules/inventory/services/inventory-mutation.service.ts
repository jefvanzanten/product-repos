import type { AddInventoryItemRequest, InventoryItemRow } from "@product-repos/contracts/inventory";
import { err, ok, type Result } from "../../../result.ts";
import { projectLocationMetadata } from "../../locations/domain/location-domain.ts";
import type { InventoryMutationStore } from "../repositories/inventory-mutation-store.ts";

/** Expected add-inventory failures represented without exceptions. */
export type AddInventoryError =
  | "PRODUCT_PACKAGE_NOT_FOUND"
  | "PRODUCT_PACKAGE_ARCHIVED"
  | "LOCATION_NOT_FOUND"
  | "LOCATION_ARCHIVED";

/** Inventory write use cases exposed to the HTTP adapter. */
export type InventoryMutationService = {
  /**
   * Create or increase one package/location/date batch atomically.
   *
   * @param userId - Authenticated administrator applying the mutation.
   * @param input - Validated add-inventory request.
   * @returns The resulting batch or an expected reference-state failure.
   */
  readonly addInventory: (userId: string, input: AddInventoryItemRequest) => Result<InventoryItemRow, AddInventoryError>;
};

/**
 * Create Inventory mutation use cases from one atomic persistence boundary.
 *
 * @param store - Inventory mutation persistence capability.
 * @param now - Current timestamp provider.
 * @param createId - UUID provider for batches and audit rows.
 * @returns Inventory mutation operations.
 */
export function createInventoryMutationService(
  store: InventoryMutationStore,
  now: () => string = () => new Date().toISOString(),
  createId: () => string = () => crypto.randomUUID(),
): InventoryMutationService {
  /** Create or increase one batch and append its audit mutation in the same transaction. */
  function addInventory(userId: string, input: AddInventoryItemRequest): Result<InventoryItemRow, AddInventoryError> {
    return store.transaction((transaction) => {
      const packageStatus = transaction.findPackageStatus(input.productPackageId);
      if (packageStatus === undefined) return err("PRODUCT_PACKAGE_NOT_FOUND");
      if (packageStatus.productArchivedAt !== null || packageStatus.packageArchivedAt !== null) {
        return err("PRODUCT_PACKAGE_ARCHIVED");
      }

      const locationRows = transaction.findAllLocations();
      const location = locationRows.find((row) => row.id === input.locationId);
      if (location === undefined) return err("LOCATION_NOT_FOUND");
      const locationMetadata = projectLocationMetadata(locationRows).get(input.locationId);
      if (locationMetadata === undefined || locationMetadata.isEffectivelyArchived) return err("LOCATION_ARCHIVED");

      const timestamp = now();
      const current = transaction.findBatch(input.productPackageId, input.locationId, input.expiryDate);
      const batch = current === undefined
        ? transaction.insertBatch({
            id: createId(),
            productPackageId: input.productPackageId,
            locationId: input.locationId,
            expiryDate: input.expiryDate,
            quantity: input.quantity,
            version: 0,
            createdAt: timestamp,
            updatedAt: timestamp,
          })
        : transaction.incrementBatch(current.id, input.quantity, timestamp);

      transaction.insertMutation({
        id: createId(),
        inventoryItemId: batch.id,
        kind: "ADD",
        quantityDelta: input.quantity,
        resultingQuantity: batch.quantity,
        fromLocationId: null,
        toLocationId: input.locationId,
        fromExpiryDate: null,
        toExpiryDate: input.expiryDate,
        userId,
        createdAt: timestamp,
      });

      return ok({
        id: batch.id,
        locationId: batch.locationId,
        locationPath: locationMetadata.path,
        isLocationArchived: false,
        expiryDate: batch.expiryDate,
        quantity: batch.quantity,
        version: batch.version,
      });
    });
  }

  return { addInventory };
}
