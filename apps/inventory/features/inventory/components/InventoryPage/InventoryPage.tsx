import { useState, type ReactNode } from "react";
import { useOutletContext } from "react-router";
import type { InventoryOutletContext } from "../../../shared/layout/layout";
import { useInventoryGroups } from "../../hooks/useInventoryGroups";
import { InventoryGroupCard } from "./InventoryGroupCard";
import styles from "./InventoryPage.module.css";

/**
 * Render the real-data Inventory list and its expandable package groups.
 *
 * @returns The complete Inventory read page.
 */
export default function InventoryPage(): ReactNode {
  const { isAdmin } = useOutletContext<InventoryOutletContext>();
  const [searchInput, setSearchInput] = useState("");
  const [expandedPackages, setExpandedPackages] = useState<ReadonlySet<number>>(new Set());
  const inventory = useInventoryGroups(searchInput);

  /**
   * Expand or collapse one product-package group.
   *
   * @param productPackageId - Stable identifier of the package group to toggle.
   * @returns Nothing.
   */
  function togglePackage(productPackageId: number): void {
    setExpandedPackages((current) => {
      const next = new Set(current);
      if (next.has(productPackageId)) next.delete(productPackageId);
      else next.add(productPackageId);
      return next;
    });
  }

  const hasInitialFailure = inventory.responseFailed && inventory.groups.length === 0;
  const showEmpty = !inventory.isPending && !hasInitialFailure && inventory.groups.length === 0;

  return (
    <main className={styles.page} aria-busy={inventory.isFetching}>
      <header className={styles.header}>
        <h1>Inventarisatie</h1>
        <label className={styles.searchField}>
          <span className={styles.visuallyHidden}>Zoek in voorraad</span>
          <span className={styles.searchIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></svg>
          </span>
          <input
            type="search"
            value={searchInput}
            placeholder="Zoek in voorraad"
            autoComplete="off"
            maxLength={200}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>
        {inventory.searchNeedsMoreInput && <p className={styles.searchHint}>Typ nog één teken om te zoeken.</p>}
      </header>

      <section className={styles.scrollRegion} aria-label="Voorraad">
        {(inventory.isPending || inventory.searchIsSettling) && inventory.groups.length === 0 && (
          <StatusPanel title="Voorraad laden" message="Je voorraad wordt opgehaald…" />
        )}
        {hasInitialFailure && (
          <StatusPanel
            title="Voorraad laden lukt niet"
            message="Controleer je verbinding en probeer opnieuw."
            action={<button type="button" onClick={inventory.retry}>Opnieuw proberen</button>}
          />
        )}
        {showEmpty && (
          <StatusPanel
            title={inventory.requestQuery === null ? "Nog geen voorraad" : "Geen resultaten"}
            message={inventory.requestQuery === null
              ? "Er zijn nog geen producten op voorraad."
              : `Er is geen voorraad gevonden voor “${inventory.requestQuery}”.`}
          />
        )}
        {inventory.groups.map((group) => (
          <InventoryGroupCard
            key={group.productPackageId}
            group={group}
            expanded={expandedPackages.has(group.productPackageId)}
            onToggle={() => togglePackage(group.productPackageId)}
          />
        ))}
        {inventory.groups.length > 0 && inventory.responseFailed && (
          <div className={styles.paginationMessage} role="status">Niet alle voorraad kon worden geladen.</div>
        )}
        {inventory.hasNextPage && (
          <button
            className={styles.loadMore}
            type="button"
            disabled={inventory.isFetchingNextPage}
            onClick={inventory.loadNextPage}
          >
            {inventory.isFetchingNextPage ? "Meer laden…" : "Meer voorraad laden"}
          </button>
        )}
      </section>

      {isAdmin && (
        <footer className={styles.actionDock}>
          <button
            className={styles.addButton}
            type="button"
            disabled
            title="Voorraad toevoegen wordt in de volgende stap aangesloten"
          >
            <span aria-hidden="true">+</span> Voorraad toevoegen
          </button>
        </footer>
      )}
    </main>
  );
}

/**
 * Render an empty, loading, or failure message in the list region.
 *
 * @param props - Panel title, supporting message, and optional action.
 * @returns The status panel.
 */
function StatusPanel({
  title,
  message,
  action,
}: {
  readonly title: string;
  readonly message: string;
  readonly action?: ReactNode;
}): ReactNode {
  return (
    <div className={styles.statusPanel} role="status">
      <strong>{title}</strong>
      <p>{message}</p>
      {action}
    </div>
  );
}
