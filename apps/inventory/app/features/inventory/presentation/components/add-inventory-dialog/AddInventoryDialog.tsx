import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addPhysicalInventoryItems, getActiveLocations } from "../../../data/inventory-api";
import { inventoryQueryKeys } from "../../../data/inventory-query-keys";
import { parsePackageQuantity } from "../../../domain/inventory-validation";
import { useInventoryProductSearch } from "../../hooks/use-inventory-product-search";
import { presentAddInventoryFailure } from "../../inventory-error-messages";
import { LocationSelector } from "./location-selector";
import { ProductSelector } from "./product-selector";
import styles from "./AddInventoryDialog.module.css";

/** Props controlling the mounted add-inventory overlay. */
type AddInventoryDialogProps = { readonly onClose: () => void };

/**
 * Coordinate the responsive add-inventory form.
 *
 * @param props - Close action supplied by the Inventory page.
 * @returns Modal add-inventory form.
 */
export function AddInventoryDialog({ onClose }: AddInventoryDialogProps): ReactNode {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const productSearch = useInventoryProductSearch();
  const [quantity, setQuantity] = useState("1");
  const [locationId, setLocationId] = useState<number | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const locationsQuery = useQuery({ queryKey: inventoryQueryKeys.locations(), queryFn: ({ signal }) => getActiveLocations(signal), retry: false });
  const addMutation = useMutation({ mutationFn: addPhysicalInventoryItems });
  const locations = locationsQuery.data?.tag === "Success" ? locationsQuery.data.value : [];
  const parsedQuantity = parsePackageQuantity(quantity);
  const canSubmit = productSearch.selectedProduct !== null && parsedQuantity !== null && locationId !== null && !addMutation.isPending;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  /** Submit valid form values and refresh every grouped list. */
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit || productSearch.selectedProduct === null || parsedQuantity === null || locationId === null) return;
    setSubmissionError(null);
    const result = await addMutation.mutateAsync({
      productId: productSearch.selectedProduct.productId,
      quantity: parsedQuantity,
      locationId,
      expiryDate: expiryDate === "" ? null : expiryDate,
    });
    if (result.tag === "Failure") {
      setSubmissionError(presentAddInventoryFailure(result.error));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.itemLists() });
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="add-inventory-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <form className={styles.sheet} onSubmit={(event) => { void submit(event); }}>
        <header className={styles.header}>
          <h2 id="add-inventory-title">Voorraad toevoegen</h2>
          <button className={styles.closeButton} type="button" aria-label="Sluiten" onClick={onClose}>×</button>
        </header>

        <div className={styles.content}>
          <ProductSelector search={productSearch} />
          <label className={styles.field}>
            <span>Aantal fysieke verpakkingen</span>
            <input type="number" min="1" step="1" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </label>
          <p>Elk exemplaar wordt afzonderlijk aanpasbaar toegevoegd.</p>
          <LocationSelector
            locations={locations}
            selectedId={locationId}
            isPending={locationsQuery.isPending}
            failed={locationsQuery.data?.tag === "Failure"}
            onSelect={setLocationId}
          />
          <label className={styles.field}>
            <span>Houdbaarheidsdatum <small>(optioneel)</small></span>
            <input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
          </label>
          {submissionError && <p className={styles.submitError} role="alert">{submissionError}</p>}
        </div>

        <footer className={styles.actions}>
          <button className={styles.submitButton} type="submit" disabled={!canSubmit}>{addMutation.isPending ? "Toevoegen…" : "Toevoegen"}</button>
          <button className={styles.cancelButton} type="button" onClick={onClose}>Annuleren</button>
        </footer>
      </form>
    </dialog>
  );
}
