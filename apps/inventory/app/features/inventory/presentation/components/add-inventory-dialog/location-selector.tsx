import type { ReactNode } from "react";
import { TreePickerRow, flattenVisibleTree, useTreeExpansion } from "@product-repos/shared/tree";
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
  const expansion = useTreeExpansion<number>();
  const visibleLocations = flattenVisibleTree(locations, expansion.expandedIds, (location) => location.id, (location) => location.children);

  return (
    <fieldset className={styles.locationField} disabled={locations.length === 0 || isPending}>
      <legend>Opbergplaats</legend>
      {isPending && <p>Opbergplaatsen laden…</p>}
      {failed && <p className={styles.error}>Opbergplaatsen konden niet worden geladen.</p>}
      {!isPending && !failed && locations.length === 0 && <p>Er zijn nog geen opbergplaatsen. Voorraad kan daarom niet worden toegevoegd.</p>}
      {locations.length > 0 && (
        <div className={styles.locationTree} role="tree" aria-label="Kies een opbergplaats">
          {visibleLocations.map(({ node: location, depth }) => (
            <TreePickerRow
              key={location.id}
              depth={depth}
              hasChildren={location.children.length > 0}
              inputName="locationId"
              isExpanded={expansion.isExpanded(location.id)}
              isSelected={selectedId === location.id}
              label={location.name}
              path={location.path}
              toggleNoun="Opbergplaats"
              value={location.id}
              onSelect={() => onSelect(location.id)}
              onToggleExpanded={() => expansion.toggleExpanded(location.id)}
            />
          ))}
        </div>
      )}
    </fieldset>
  );
}
