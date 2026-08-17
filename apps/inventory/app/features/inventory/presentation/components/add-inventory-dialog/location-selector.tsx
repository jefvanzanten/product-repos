import type { ReactNode } from "react";
import type { InventoryLocation } from "../../../domain/inventory";
import styles from "./AddInventoryDialog.module.css";

/** Location selector state supplied by the add-inventory coordinator. */
type LocationSelectorProps = {
  readonly locations: ReadonlyArray<InventoryLocation>;
  readonly selectedId: number | null;
  readonly isPending: boolean;
  readonly failed: boolean;
  readonly onSelect: (id: number) => void;
};

/**
 * Render loading, failure, empty and selectable location-tree states.
 *
 * @param props - Location query and selection state.
 * @returns Add-form location fieldset.
 */
export function LocationSelector({ locations, selectedId, isPending, failed, onSelect }: LocationSelectorProps): ReactNode {
  return (
    <fieldset className={styles.locationField} disabled={locations.length === 0 || isPending}>
      <legend>Opbergplaats</legend>
      {isPending && <p>Opbergplaatsen laden…</p>}
      {failed && <p className={styles.error}>Opbergplaatsen konden niet worden geladen.</p>}
      {!isPending && !failed && locations.length === 0 && <p>Er zijn nog geen opbergplaatsen. Voorraad kan daarom niet worden toegevoegd.</p>}
      {locations.length > 0 && (
        <div className={styles.locationTree} role="radiogroup" aria-label="Kies een opbergplaats">
          {locations.map((location) => <LocationChoice key={location.id} node={location} selectedId={selectedId} onSelect={onSelect} />)}
        </div>
      )}
    </fieldset>
  );
}

/**
 * Render one selectable location and its recursive descendants.
 *
 * @param props - Location node and current selection.
 * @returns One recursive location-tree branch.
 */
function LocationChoice({ node, selectedId, onSelect }: { readonly node: InventoryLocation; readonly selectedId: number | null; readonly onSelect: (id: number) => void }): ReactNode {
  const choice = (
    <button type="button" role="radio" aria-checked={selectedId === node.id} className={selectedId === node.id ? styles.selectedLocation : undefined} onClick={() => onSelect(node.id)}>
      {node.name}
    </button>
  );
  if (node.children.length === 0) return choice;
  return (
    <details open>
      <summary>{choice}</summary>
      <div className={styles.locationChildren}>
        {node.children.map((child) => <LocationChoice key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} />)}
      </div>
    </details>
  );
}
