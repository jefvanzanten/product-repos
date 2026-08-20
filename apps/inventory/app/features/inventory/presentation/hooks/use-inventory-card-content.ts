import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getPhysicalInventoryItem, persistPhysicalInventoryItem, type InventoryApiOutcome } from "../../data/inventory-api";
import { inventoryQueryKeys } from "../../data/inventory-query-keys";
import type { PhysicalInventoryItemDetail } from "../../domain/inventory";

type InventoryItemContentCommand = {
  readonly itemId: string;
  readonly remainingAmountBase: string;
  readonly item?: PhysicalInventoryItemDetail;
};

/** Detail-row remaining-content update state exposed to an inventory card. */
type InventoryItemContentUpdate = {
  readonly isPending: boolean;
  readonly updateRemainingAmount: (itemId: string, remainingAmountBase: string, item?: PhysicalInventoryItemDetail) => Promise<boolean>;
};

/** Persist editable progress sliders for individual expanded inventory rows. */
export function useInventoryItemContent(): InventoryItemContentUpdate {
  const queryClient = useQueryClient();
  const mutation = useMutation({ mutationFn: updateItemContent });

  /** Update one package and refresh grouped and detail projections when successful. */
  async function updateRemainingAmount(itemId: string, remainingAmountBase: string, item?: PhysicalInventoryItemDetail): Promise<boolean> {
    const result = await mutation.mutateAsync({ itemId, remainingAmountBase, item });
    if (result.tag === "Failure") return false;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.itemLists() }),
      queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.item(itemId) }),
    ]);
    return true;
  }

  return { isPending: mutation.isPending, updateRemainingAmount };
}

/** Resolve a full-item detail when needed and persist its changed content. */
async function updateItemContent(command: InventoryItemContentCommand): Promise<InventoryApiOutcome<PhysicalInventoryItemDetail | null>> {
  let item = command.item;
  if (item === undefined) {
    const itemResult = await getPhysicalInventoryItem(command.itemId);
    if (itemResult.tag === "Failure") return itemResult;
    item = itemResult.value;
  }
  return persistPhysicalInventoryItem(item, {
    remainingAmountBase: command.remainingAmountBase,
    locationId: item.locationId,
    expiryDate: item.expiryDate,
  });
}
