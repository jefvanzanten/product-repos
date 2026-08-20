import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addPhysicalInventoryItems, getPhysicalInventoryItem, removePhysicalInventoryItem } from "../../data/inventory-api";
import { inventoryQueryKeys } from "../../data/inventory-query-keys";

type InventoryPackageQuantityCommand =
  | { readonly action: "increase"; readonly productId: string; readonly locationId: number; readonly expiryDate: string | null }
  | { readonly action: "decrease"; readonly itemId: string; readonly version?: number };

/** Package quantity controls exposed to detail rows on one inventory card. */
type InventoryPackageQuantityControls = {
  readonly isPending: boolean;
  readonly failed: boolean;
  readonly increase: (locationId: number, expiryDate: string | null) => void;
  readonly decrease: (itemId: string, version?: number) => void;
};

/** Add or remove one physical package through an inventory detail row. */
export function useInventoryPackageQuantity(productId: string): InventoryPackageQuantityControls {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: changePackageQuantity,
    onSuccess: async (succeeded) => {
      if (succeeded) await queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.itemLists() });
    },
  });

  /** Add one full package using the detail row's location and expiry date. */
  function increase(locationId: number, expiryDate: string | null): void {
    mutation.mutate({ action: "increase", productId, locationId, expiryDate });
  }

  /** Remove one physical package using a known or freshly loaded version. */
  function decrease(itemId: string, version?: number): void {
    mutation.mutate({ action: "decrease", itemId, version });
  }

  return { increase, decrease, isPending: mutation.isPending, failed: mutation.data === false };
}

/** Execute one detail-row package-count command and report whether it persisted. */
async function changePackageQuantity(command: InventoryPackageQuantityCommand): Promise<boolean> {
  if (command.action === "increase") {
    const result = await addPhysicalInventoryItems({
      productId: command.productId,
      quantity: 1,
      locationId: command.locationId,
      expiryDate: command.expiryDate,
    });
    return result.tag === "Success";
  }

  let version = command.version;
  if (version === undefined) {
    const itemResult = await getPhysicalInventoryItem(command.itemId);
    if (itemResult.tag === "Failure") return false;
    version = itemResult.value.version;
  }
  const result = await removePhysicalInventoryItem(command.itemId, version);
  return result.tag === "Success";
}
