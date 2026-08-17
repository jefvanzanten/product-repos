import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDutchDecimal } from "@product-repos/shared/product-presentation";
import { getActiveLocations, getPhysicalInventoryItem, persistPhysicalInventoryItem, removePhysicalInventoryItem } from "../../../data/inventory-api";
import { inventoryQueryKeys } from "../../../data/inventory-query-keys";
import type { InventoryLocation, PhysicalInventoryItemDetail } from "../../../domain/inventory";
import { presentInventoryItemFailure } from "../../inventory-error-messages";
import { flattenLocationOptions } from "./location-options";
import styles from "./InventoryItemDialog.module.css";

/** Physical-package detail overlay props. */
type InventoryItemDialogProps = { readonly itemId: string; readonly onClose: () => void };

/**
 * Load and render the editor for one physical package.
 *
 * @param props - Selected package and close action.
 * @returns Physical-package detail dialog.
 */
export function InventoryItemDialog({ itemId, onClose }: InventoryItemDialogProps): ReactNode {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const itemQuery = useQuery({ queryKey: inventoryQueryKeys.item(itemId), queryFn: ({ signal }) => getPhysicalInventoryItem(itemId, signal), retry: false });
  const locationQuery = useQuery({ queryKey: inventoryQueryKeys.locations(), queryFn: ({ signal }) => getActiveLocations(signal), retry: false });
  const item = itemQuery.data?.tag === "Success" ? itemQuery.data.value : null;
  const locations = locationQuery.data?.tag === "Success" ? locationQuery.data.value : [];

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="item-detail-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className={styles.sheet}>
        <header><h2 id="item-detail-title">Fysieke verpakking</h2><button type="button" onClick={onClose} aria-label="Sluiten">×</button></header>
        {itemQuery.isPending && <p>Verpakking laden…</p>}
        {itemQuery.data?.tag === "Failure" && <p role="alert">Verpakking kon niet worden geladen.</p>}
        {item !== null && <InventoryItemForm key={`${item.id}:${item.version}`} item={item} locations={locations} onClose={onClose} />}
      </div>
    </dialog>
  );
}

/**
 * Edit a loaded package using state initialized once for its version.
 *
 * @param props - Loaded package, location options and close action.
 * @returns Explicit package-edit form.
 */
function InventoryItemForm({ item, locations, onClose }: { readonly item: PhysicalInventoryItemDetail; readonly locations: ReadonlyArray<InventoryLocation>; readonly onClose: () => void }): ReactNode {
  const queryClient = useQueryClient();
  const [remaining, setRemaining] = useState(item.remainingAmountBase);
  const [locationId, setLocationId] = useState(item.locationId);
  const [expiryDate, setExpiryDate] = useState(item.expiryDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const saveMutation = useMutation({
    mutationFn: () => persistPhysicalInventoryItem(item, { remainingAmountBase: remaining, locationId, expiryDate: expiryDate === "" ? null : expiryDate }),
  });
  const removeMutation = useMutation({ mutationFn: () => removePhysicalInventoryItem(item.id, item.version) });

  /** Confirm all staged fields and refresh grouped inventory. */
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    const result = await saveMutation.mutateAsync();
    if (result.tag === "Failure") { setError(presentInventoryItemFailure(result.error)); return; }
    await refreshInventory();
    onClose();
  }

  /** Confirm that this physical package is empty. */
  async function emptyItem(): Promise<void> {
    if (!window.confirm("Deze fysieke verpakking leegmaken?")) return;
    const result = await removeMutation.mutateAsync();
    if (result.tag === "Failure") { setError(presentInventoryItemFailure(result.error)); return; }
    await refreshInventory();
    onClose();
  }

  /** Invalidate list and detail data after a mutation. */
  async function refreshInventory(): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.itemLists() }),
      queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.item(item.id) }),
    ]);
  }

  const options = flattenLocationOptions(locations);
  const pending = saveMutation.isPending || removeMutation.isPending;
  return (
    <form className={styles.content} onSubmit={(event) => { void submit(event); }}>
      <strong>{item.product.displayName}</strong>
      <label><span>Resterende inhoud</span><output>{formatDutchDecimal(remaining)} / {formatDutchDecimal(item.maximumAmountBase)} {item.product.baseUnitSymbol}</output><input type="range" min="0" max={item.maximumAmountBase} step="1" value={remaining} onChange={(event) => setRemaining(event.target.value)} /></label>
      <div className={styles.progress}><span style={{ width: `${Number(remaining) / Number(item.maximumAmountBase) * 100}%` }} /></div>
      <label><span>Exacte hoeveelheid ({item.product.baseUnitSymbol})</span><input type="number" min="0" max={item.maximumAmountBase} step="1" value={remaining} onChange={(event) => setRemaining(event.target.value)} /></label>
      <label><span>Locatie</span><select value={locationId} onChange={(event) => setLocationId(Number(event.target.value))}>{options.map((location) => <option key={location.id} value={location.id}>{location.path}</option>)}</select></label>
      <label><span>THT</span><input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} /></label>
      {item.product.dimension === "COUNT" && <small>Aantallen veranderen per heel stuk.</small>}
      {error !== null && <p role="alert">{error}</p>}
      <button type="submit" disabled={pending}>Wijzigingen bevestigen</button>
      <button className={styles.danger} type="button" disabled={pending} onClick={() => { void emptyItem(); }}>Verpakking leegmaken</button>
    </form>
  );
}
