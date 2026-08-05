import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InventoryPackageSearchResult } from "@product-repos/contracts/inventory";
import type { LocationTreeNode } from "@product-repos/contracts/locations";
import { addInventoryItem, getActiveLocations, searchInventoryPackages, type InventoryApiFailure } from "../../../../api/inventory-api";
import { inventoryQueryKeys } from "../../inventory-query-keys";
import styles from "./AddInventoryDialog.module.css";

/** Props controlling the mounted add-inventory overlay. */
type AddInventoryDialogProps = {
  readonly onClose: () => void;
};

/**
 * Render the complete responsive add-inventory flow.
 *
 * @param props - Close action supplied by the Inventory page.
 * @returns The modal dialog and add-inventory form.
 */
export function AddInventoryDialog({ onClose }: AddInventoryDialogProps): ReactNode {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchTimerRef = useRef<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [requestQuery, setRequestQuery] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<InventoryPackageSearchResult | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [locationId, setLocationId] = useState<number | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      if (searchTimerRef.current !== null) window.clearTimeout(searchTimerRef.current);
      dialog?.close();
    };
  }, []);

  const locationsQuery = useQuery({
    queryKey: inventoryQueryKeys.locations(),
    queryFn: ({ signal }) => getActiveLocations(signal),
    retry: false,
  });
  const packageQuery = useQuery({
    queryKey: inventoryQueryKeys.packageSearch(requestQuery),
    queryFn: ({ signal }) => searchInventoryPackages(requestQuery, signal),
    enabled: requestQuery.length >= 2,
    retry: false,
  });
  const addMutation = useMutation({ mutationFn: addInventoryItem });

  const locations = locationsQuery.data?._tag === "Success" ? locationsQuery.data.value : [];
  const packageResults = packageQuery.data?._tag === "Success" ? packageQuery.data.value : [];
  const parsedQuantity = Number(quantity);
  const quantityIsValid = /^\d+$/.test(quantity) && Number.isSafeInteger(parsedQuantity) && parsedQuantity > 0;
  const canSubmit = selectedPackage !== null && quantityIsValid && locationId !== null && !addMutation.isPending;

  /** Update search text and debounce the external package query. */
  function updateSearch(value: string): void {
    setSearchInput(value);
    if (searchTimerRef.current !== null) window.clearTimeout(searchTimerRef.current);
    const normalized = value.trim();
    if (normalized.length < 2) {
      setRequestQuery("");
      return;
    }
    searchTimerRef.current = window.setTimeout(() => {
      searchTimerRef.current = null;
      setRequestQuery(normalized);
    }, 250);
  }

  /** Select one concrete product package from the search results. */
  function selectPackage(value: InventoryPackageSearchResult): void {
    setSelectedPackage(value);
    setSearchInput("");
    setRequestQuery("");
    setSubmissionError(null);
  }

  /** Submit valid form values and refresh every cached Inventory list. */
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit || selectedPackage === null || locationId === null) return;
    setSubmissionError(null);
    const result = await addMutation.mutateAsync({
      productPackageId: selectedPackage.productPackageId,
      quantity: parsedQuantity,
      locationId,
      expiryDate: expiryDate === "" ? null : expiryDate,
    });
    if (result._tag === "Failure") {
      setSubmissionError(describeFailure(result.error));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["inventory", "items"] });
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="add-inventory-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className={styles.sheet} onSubmit={submit}>
        <header className={styles.header}>
          <h2 id="add-inventory-title">Voorraad toevoegen</h2>
          <button className={styles.closeButton} type="button" aria-label="Sluiten" onClick={onClose}>×</button>
        </header>

        <div className={styles.content}>
          <label className={styles.field}>
            <span>Product</span>
            <input
              type="search"
              value={searchInput}
              placeholder="Zoek product of verpakking"
              autoComplete="off"
              maxLength={200}
              autoFocus
              onChange={(event) => updateSearch(event.target.value)}
            />
          </label>

          {searchInput.trim().length >= 2 && (
            <div className={styles.results} aria-live="polite">
              {(packageQuery.isPending || requestQuery !== searchInput.trim()) && <p>Producten zoeken…</p>}
              {!packageQuery.isPending && requestQuery === searchInput.trim() && packageQuery.data?._tag === "Failure" && (
                <p className={styles.error}>Producten konden niet worden geladen.</p>
              )}
              {!packageQuery.isPending && requestQuery === searchInput.trim() && packageQuery.data?._tag === "Success" && packageResults.length === 0 && (
                <p>Geen producten gevonden</p>
              )}
              {requestQuery === searchInput.trim() && packageResults.map((result) => (
                <button key={result.productPackageId} type="button" onClick={() => selectPackage(result)}>
                  <strong>{result.displayName}</strong>
                  <span>{[result.brandName, result.packageSummary].filter(Boolean).join(" · ")}</span>
                  {result.categoryPath && <small>{result.categoryPath}</small>}
                </button>
              ))}
            </div>
          )}

          <section className={styles.selection} aria-label="Gekozen product of verpakking">
            <span>Gekozen product/verpakking</span>
            {selectedPackage === null ? (
              <p>Nog geen verpakking gekozen</p>
            ) : (
              <div>
                <strong>{selectedPackage.displayName}</strong>
                <span>{[selectedPackage.brandName, selectedPackage.packageSummary].filter(Boolean).join(" · ")}</span>
                <button type="button" onClick={() => setSelectedPackage(null)}>Wijzigen</button>
              </div>
            )}
          </section>

          <label className={styles.field}>
            <span>Hoeveelheid</span>
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>

          <fieldset className={styles.locationField} disabled={locations.length === 0 || locationsQuery.isPending}>
            <legend>Opbergplaats</legend>
            {locationsQuery.isPending && <p>Opbergplaatsen laden…</p>}
            {locationsQuery.data?._tag === "Failure" && <p className={styles.error}>Opbergplaatsen konden niet worden geladen.</p>}
            {!locationsQuery.isPending && locationsQuery.data?._tag === "Success" && locations.length === 0 && (
              <p>Er zijn nog geen opbergplaatsen. Voorraad kan daarom niet worden toegevoegd.</p>
            )}
            {locations.length > 0 && (
              <div className={styles.locationTree} role="radiogroup" aria-label="Kies een opbergplaats">
                {locations.map((location) => (
                  <LocationChoice key={location.id} node={location} selectedId={locationId} onSelect={setLocationId} />
                ))}
              </div>
            )}
          </fieldset>

          <label className={styles.field}>
            <span>Houdbaarheidsdatum <small>(optioneel)</small></span>
            <input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
          </label>

          {submissionError && <p className={styles.submitError} role="alert">{submissionError}</p>}
        </div>

        <footer className={styles.actions}>
          <button className={styles.submitButton} type="submit" disabled={!canSubmit}>
            {addMutation.isPending ? "Toevoegen…" : "Toevoegen"}
          </button>
          <button className={styles.cancelButton} type="button" onClick={onClose}>Annuleren</button>
        </footer>
      </form>
    </dialog>
  );
}

/**
 * Render one selectable location node and its expandable descendants.
 *
 * @param props - Location node, current selection, and selection action.
 * @returns One recursive location-tree branch.
 */
function LocationChoice({
  node,
  selectedId,
  onSelect,
}: {
  readonly node: LocationTreeNode;
  readonly selectedId: number | null;
  readonly onSelect: (id: number) => void;
}): ReactNode {
  const choice = (
    <button
      type="button"
      role="radio"
      aria-checked={selectedId === node.id}
      className={selectedId === node.id ? styles.selectedLocation : undefined}
      onClick={() => onSelect(node.id)}
    >
      {node.name}
    </button>
  );
  if (node.children.length === 0) return choice;
  return (
    <details open>
      <summary>{choice}</summary>
      <div className={styles.locationChildren}>
        {node.children.map((child) => (
          <LocationChoice key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} />
        ))}
      </div>
    </details>
  );
}

/**
 * Convert a classified API failure into safe Dutch form feedback.
 *
 * @param failure - Browser API adapter failure.
 * @returns User-facing failure text.
 */
function describeFailure(failure: InventoryApiFailure): string {
  if (failure._tag === "HttpFailure") {
    if (failure.response.code === "PRODUCT_PACKAGE_ARCHIVED") return "Deze productverpakking is niet meer actief.";
    if (failure.response.code === "LOCATION_ARCHIVED") return "Deze opbergplaats is niet meer actief. Kies een andere opbergplaats.";
    if (failure.response.code === "PRODUCT_PACKAGE_NOT_FOUND") return "Deze productverpakking bestaat niet meer.";
    if (failure.response.code === "LOCATION_NOT_FOUND") return "Deze opbergplaats bestaat niet meer.";
    if (failure.response.code === "ADMIN_ROLE_REQUIRED") return "Je hebt geen beheerdersrechten om voorraad toe te voegen.";
  }
  return "Voorraad toevoegen is niet gelukt. Controleer je verbinding en probeer opnieuw.";
}
