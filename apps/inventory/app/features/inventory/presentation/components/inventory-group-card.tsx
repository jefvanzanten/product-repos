import { useState, type ReactNode } from "react";
import { formatDutchDecimal } from "@product-repos/shared/product-presentation";
import type { FullInventoryGroup, PhysicalInventoryItemDetail, PhysicalInventoryProductGroup } from "../../domain/inventory";
import { presentExpiryDate, presentGroupExpiry, type ExpiryStatus, type ExpiryTone } from "../formatting/inventory-expiry";
import styles from "./inventory-group-card.module.css";

type InventoryGroupCardProps = { readonly group: PhysicalInventoryProductGroup; readonly expanded: boolean; readonly onToggle: () => void; readonly onSelectItem: (itemId: string) => void; readonly onSetThreshold?: () => void };

/** Render one concrete-product group and its physical item distribution. */
export function InventoryGroupCard({ group, expanded, onToggle, onSelectItem, onSetThreshold }: InventoryGroupCardProps): ReactNode {
  const detailsId = `inventory-product-${group.product.productId}`;
  const locationCount = new Set([...group.fullGroups.map((item) => item.locationId), ...group.partialItems.map((item) => item.locationId)]).size;
  return (
    <article className={`${styles.group}${expanded ? ` ${styles.groupExpanded}` : ""}`}>
      <button className={styles.groupHeader} type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={onToggle}>
        <ProductImage imageUrl={group.product.imageUrl} displayName={group.product.displayName} />
        <span className={styles.groupInfo}>
          <span className={styles.groupName}>{group.product.displayName}</span>
          <span className={styles.groupMeta}><strong>{formatEquivalent(group.totalPackageEquivalent)}</strong></span>
          {group.product.archivedAt !== null && <span className={styles.archived}>Gearchiveerd</span>}
          {group.isLowStock && <span className={styles.archived}>Lage voorraad</span>}
        </span>
        <span className={styles.groupRight}><StatusChip status={presentGroupExpiry(group.earliestExpiryStatus)} /><span className={styles.locationCount}>{locationCount} {locationCount === 1 ? "locatie" : "locaties"}</span></span>
        <svg className={styles.chevron} viewBox="0 0 20 20" aria-hidden="true"><path d="m7.5 4.5 5 5.5-5 5.5" /></svg>
      </button>
      {expanded && (
        <div className={styles.batchList} id={detailsId}>
          {group.fullGroups.map((fullGroup) => <FullGroupRow key={`${fullGroup.locationId}-${fullGroup.expiryDate ?? "none"}`} group={fullGroup} onSelectItem={onSelectItem} />)}
          {group.partialItems.map((item) => <PartialItemRow key={item.id} item={item} onSelectItem={onSelectItem} />)}
          {onSetThreshold !== undefined && <button className={styles.thresholdButton} type="button" onClick={onSetThreshold}>Drempel lage voorraad: {group.lowStockAmountBase === null ? "niet ingesteld" : `${formatDutchDecimal(group.lowStockAmountBase)} ${group.product.baseUnitSymbol}`}</button>}
        </div>
      )}
    </article>
  );
}

/** Render a presentation group while preserving explicit item selection. */
function FullGroupRow({ group, onSelectItem }: { readonly group: FullInventoryGroup; readonly onSelectItem: (itemId: string) => void }): ReactNode {
  return (
    <div className={styles.batchRow}>
      <span className={styles.batchInfo}><strong>{group.count}× volledig</strong><span className={styles.locationPath}>{group.locationPath}</span><StatusChip status={presentExpiryDate(group.expiryDate)} /></span>
      <span className={styles.itemActions}>{group.itemIds.map((itemId, index) => <button key={itemId} type="button" onClick={() => onSelectItem(itemId)} aria-label={`Open fysieke verpakking ${index + 1}`}>{index + 1}</button>)}</span>
    </div>
  );
}

/** Render one ungrouped partial physical item and remaining-content bar. */
function PartialItemRow({ item, onSelectItem }: { readonly item: PhysicalInventoryItemDetail; readonly onSelectItem: (itemId: string) => void }): ReactNode {
  const symbol = item.product.baseUnitSymbol;
  return (
    <button className={`${styles.batchRow} ${styles.partialButton}`} type="button" onClick={() => onSelectItem(item.id)}>
      <span className={styles.batchInfo}>
        <strong>{formatDutchDecimal(item.remainingAmountBase)} / {formatDutchDecimal(item.maximumAmountBase)} {symbol}</strong>
        <span className={styles.progressTrack}><span style={{ width: `${item.remainingRatio * 100}%` }} /></span>
        <span className={styles.locationPath}>{item.locationPath}</span>
        <StatusChip status={presentExpiryDate(item.expiryDate)} />
      </span>
      <span aria-hidden="true">›</span>
    </button>
  );
}

/** Render a product image or neutral placeholder. */
function ProductImage({ imageUrl, displayName }: { readonly imageUrl: string | null; readonly displayName: string }): ReactNode {
  const [failed, setFailed] = useState(false);
  if (imageUrl !== null && !failed) return <img className={styles.productImage} src={imageUrl} alt="" onError={() => setFailed(true)} />;
  return <span className={styles.imagePlaceholder} aria-label={`Geen afbeelding voor ${displayName}`}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3.5 17.5 9 12l4.5 4.5 3-3 4 4" /></svg></span>;
}

/** Format package equivalents with at most one decimal. */
function formatEquivalent(value: number): string { return `${new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 }).format(value)} ${value === 1 ? "verpakking" : "verpakkingen"}`; }
/** Render one tone-mapped expiry chip. */
function StatusChip({ status }: { readonly status: ExpiryStatus }): ReactNode {
  const toneClass = { expired: styles.statusExpired, today: styles.statusToday, soon: styles.statusSoon, ok: styles.statusOk, none: styles.statusNone } satisfies Record<ExpiryTone, string | undefined>;
  return <span className={`${styles.statusChip} ${toneClass[status.tone] ?? ""}`}>{status.label}</span>;
}
