import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProductStockThreshold } from "../../../data/inventory-api";
import { inventoryQueryKeys } from "../../../data/inventory-query-keys";
import type { PhysicalInventoryProductGroup } from "../../../domain/inventory";
import { isInventoryDecimal } from "../../../domain/inventory-validation";
import { AddInventoryDialog } from "../../components/add-inventory-dialog/AddInventoryDialog";
import { InventoryGroupCard } from "../../components/inventory-group-card";
import { InventoryItemDialog } from "../../components/inventory-item-dialog/InventoryItemDialog";
import { useInventoryGroups } from "../../hooks/use-inventory-groups";
import styles from "./inventory-page.module.css";

/** Inventory page capabilities supplied by its route boundary. */
type InventoryPageProps = { readonly canManageInventory: boolean };

/**
 * Render the physical inventory list, filters, and dialogs.
 *
 * @param props - Auth-derived Inventory capabilities.
 * @returns Complete Inventory feature page.
 */
export default function InventoryPage({ canManageInventory }: InventoryPageProps): ReactNode {
  const [expandedProducts, setExpandedProducts] = useState<ReadonlySet<string>>(new Set());
  const [addDialogIsOpen, setAddDialogIsOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const inventory = useInventoryGroups();
  const queryClient = useQueryClient();
  const thresholdMutation = useMutation({ mutationFn: ({ productId, amount }: { productId: string; amount: string }) => updateProductStockThreshold(productId, { lowStockAmountBase: amount, movementClass: null }) });

  /** Expand or collapse one concrete-product group. */
  function toggleProduct(productId: string): void {
    setExpandedProducts((current) => { const next = new Set(current); if (next.has(productId)) next.delete(productId); else next.add(productId); return next; });
  }

  /** Ask for and persist a manual low-stock threshold. */
  async function setThreshold(group: PhysicalInventoryProductGroup): Promise<void> {
    const value = window.prompt(`Lage-voorraaddrempel in ${group.product.baseUnitSymbol}`, group.lowStockAmountBase ?? "0");
    if (value === null || !isInventoryDecimal(value)) return;
    const result = await thresholdMutation.mutateAsync({ productId: group.product.productId, amount: value });
    if (result.tag === "Success") await queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.itemLists() });
  }

  const hasInitialFailure = inventory.responseFailed && inventory.groups.length === 0;
  const showEmpty = !inventory.isPending && !hasInitialFailure && inventory.groups.length === 0;
  return (
    <main className={styles.page} aria-busy={inventory.isFetching}>
      <header className={styles.header}>
        <h1>Inventarisatie</h1>
        <label className={styles.searchField}><span className={styles.visuallyHidden}>Zoek in voorraad</span><span className={styles.searchIcon} aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></svg></span><input type="search" value={inventory.searchInput} placeholder="Zoek product, merk, categorie of locatie" autoComplete="off" maxLength={200} onChange={(event) => inventory.updateSearchInput(event.target.value)} /></label>
        {inventory.searchNeedsMoreInput && <p className={styles.searchHint}>Typ nog één teken om te zoeken.</p>}
        <nav className={styles.filters} aria-label="Voorraadfilters">
          {([ ["all", "Alles"], ["low-stock", "Lage voorraad"], ["expiring", "Bijna verlopen"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={inventory.filter === value} onClick={() => inventory.updateFilter(value)}>{label}</button>)}
        </nav>
      </header>
      <section className={styles.scrollRegion} aria-label="Voorraad">
        {(inventory.isPending || inventory.searchIsSettling) && inventory.groups.length === 0 && <StatusPanel title="Voorraad laden" message="Je voorraad wordt opgehaald…" />}
        {hasInitialFailure && <StatusPanel title="Voorraad laden lukt niet" message="Controleer je verbinding en probeer opnieuw." action={<button type="button" onClick={inventory.retry}>Opnieuw proberen</button>} />}
        {showEmpty && <StatusPanel title={inventory.requestQuery === null ? "Geen voorraad in dit filter" : "Geen resultaten"} message={inventory.requestQuery === null ? "Er zijn geen passende producten op voorraad." : `Er is geen voorraad gevonden voor “${inventory.requestQuery}”.`} />}
        {inventory.groups.map((group) => <InventoryGroupCard key={group.product.productId} group={group} expanded={expandedProducts.has(group.product.productId)} onToggle={() => toggleProduct(group.product.productId)} onSelectItem={setSelectedItemId} onSetThreshold={canManageInventory ? () => { void setThreshold(group); } : undefined} />)}
        {inventory.groups.length > 0 && inventory.responseFailed && <div className={styles.paginationMessage} role="status">Niet alle voorraad kon worden geladen.</div>}
        {inventory.hasNextPage && <button className={styles.loadMore} type="button" disabled={inventory.isFetchingNextPage} onClick={inventory.loadNextPage}>{inventory.isFetchingNextPage ? "Meer laden…" : "Meer voorraad laden"}</button>}
      </section>
      {canManageInventory && <footer className={styles.actionDock}><button className={styles.addButton} type="button" onClick={() => setAddDialogIsOpen(true)}><span aria-hidden="true">+</span> Voorraad toevoegen</button></footer>}
      {addDialogIsOpen && <AddInventoryDialog onClose={() => setAddDialogIsOpen(false)} />}
      {selectedItemId !== null && <InventoryItemDialog itemId={selectedItemId} onClose={() => setSelectedItemId(null)} />}
    </main>
  );
}

/** Render a loading, empty, or failure panel. */
function StatusPanel({ title, message, action }: { readonly title: string; readonly message: string; readonly action?: ReactNode }): ReactNode {
  return <div className={styles.statusPanel} role="status"><strong>{title}</strong><p>{message}</p>{action}</div>;
}
