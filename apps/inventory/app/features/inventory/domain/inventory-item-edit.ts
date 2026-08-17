import type { InventoryItemDraft, PhysicalInventoryItemDetail } from "./inventory";
import { isInventoryDecimal } from "./inventory-validation";

/** Ordered changes needed to persist an item draft with optimistic concurrency. */
export type InventoryItemChange =
  | { readonly tag: "Move"; readonly locationId: number }
  | { readonly tag: "ChangeExpiry"; readonly expiryDate: string | null }
  | { readonly tag: "ChangeContent"; readonly remainingAmountBase: string };

/**
 * Create editable form state from a loaded physical package.
 *
 * @param item - Loaded physical package detail.
 * @returns Its editable values.
 */
export function createInventoryItemDraft(item: PhysicalInventoryItemDetail): InventoryItemDraft {
  return {
    remainingAmountBase: item.remainingAmountBase,
    locationId: item.locationId,
    expiryDate: item.expiryDate,
  };
}

/**
 * Derive the ordered API changes required by an item draft.
 *
 * @param item - Current persisted package.
 * @param draft - Staged editable values.
 * @returns Ordered changes, or null when the draft is invalid.
 */
export function deriveInventoryItemChanges(item: PhysicalInventoryItemDetail, draft: InventoryItemDraft): ReadonlyArray<InventoryItemChange> | null {
  if (!isInventoryDecimal(draft.remainingAmountBase) || Number(draft.remainingAmountBase) > Number(item.maximumAmountBase)) return null;
  const changes: InventoryItemChange[] = [];
  if (draft.locationId !== item.locationId) changes.push({ tag: "Move", locationId: draft.locationId });
  if (draft.expiryDate !== item.expiryDate) changes.push({ tag: "ChangeExpiry", expiryDate: draft.expiryDate });
  if (draft.remainingAmountBase !== item.remainingAmountBase) changes.push({ tag: "ChangeContent", remainingAmountBase: draft.remainingAmountBase });
  return changes;
}
