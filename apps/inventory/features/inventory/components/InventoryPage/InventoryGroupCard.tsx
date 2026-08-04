import { useState, type ReactNode } from "react";
import type { InventoryItemRow, InventoryProductGroup } from "@product-repos/contracts/inventory";
import { expiryStatus, type ExpiryStatus, type ExpiryTone } from "../../inventory-expiry";
import styles from "./InventoryGroupCard.module.css";

type InventoryGroupCardProps = {
  readonly group: InventoryProductGroup;
  readonly expanded: boolean;
  readonly onToggle: () => void;
};

type ProductImageProps = {
  readonly imageUrl: string | null;
  readonly displayName: string;
};

/**
 * Render one product-package card and its expandable location rows.
 *
 * @param props - Group data, expansion state, and toggle action.
 * @returns The product-package card.
 */
export function InventoryGroupCard({ group, expanded, onToggle }: InventoryGroupCardProps): ReactNode {
  const locationCount = new Set(group.items.map((item) => item.locationId)).size;
  const status = expiryStatus(group.earliestExpiryDate);
  const detailsId = `inventory-package-${group.productPackageId}`;

  return (
    <article className={`${styles.group}${expanded ? ` ${styles.groupExpanded}` : ""}`}>
      <button
        className={styles.groupHeader}
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={onToggle}
      >
        <ProductImage imageUrl={group.imageUrl} displayName={group.displayName} />
        <span className={styles.groupInfo}>
          <span className={styles.groupName}>
            {group.displayName}
            {group.brandName !== null && <span className={styles.brand}> · {group.brandName}</span>}
          </span>
          <span className={styles.groupMeta}>
            {group.packageSummary}<strong> · {group.totalQuantity}×</strong>
          </span>
          {group.archivedAt !== null && <span className={styles.archived}>Gearchiveerd</span>}
        </span>
        <span className={styles.groupRight}>
          <StatusChip status={status} />
          <span className={styles.locationCount}>
            {locationCount} {locationCount === 1 ? "locatie" : "locaties"}
          </span>
        </span>
        <svg className={styles.chevron} viewBox="0 0 20 20" aria-hidden="true"><path d="m7.5 4.5 5 5.5-5 5.5" /></svg>
      </button>
      {expanded && (
        <div className={styles.batchList} id={detailsId}>
          {group.items.map((item) => <InventoryBatchRow key={item.id} item={item} />)}
        </div>
      )}
    </article>
  );
}

/**
 * Render a package image or the neutral image placeholder.
 *
 * @param props - Image URL and product name used by the accessible fallback.
 * @returns The package image or fallback graphic.
 */
function ProductImage({ imageUrl, displayName }: ProductImageProps): ReactNode {
  const [failed, setFailed] = useState(false);
  if (imageUrl !== null && !failed) {
    return <img className={styles.productImage} src={imageUrl} alt="" onError={() => setFailed(true)} />;
  }
  return (
    <span className={styles.imagePlaceholder} aria-label={`Geen afbeelding voor ${displayName}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="9" cy="9" r="1.6" />
        <path d="M3.5 17.5 9 12l4.5 4.5 3-3 4 4" />
      </svg>
    </span>
  );
}

/**
 * Render one location and expiry batch row without mutation controls.
 *
 * @param props - Inventory batch projected by the backend.
 * @returns The batch row.
 */
function InventoryBatchRow({ item }: { readonly item: InventoryItemRow }): ReactNode {
  return (
    <div className={styles.batchRow}>
      <span className={styles.batchInfo}>
        <span className={styles.locationPath}>{item.locationPath}</span>
        <StatusChip status={expiryStatus(item.expiryDate)} />
      </span>
      <strong className={styles.batchQuantity}>{item.quantity}×</strong>
    </div>
  );
}

/**
 * Render one tone-mapped expiry status.
 *
 * @param props - Display-ready expiry status.
 * @returns The status chip.
 */
function StatusChip({ status }: { readonly status: ExpiryStatus }): ReactNode {
  const toneClass = {
    expired: styles.statusExpired,
    today: styles.statusToday,
    soon: styles.statusSoon,
    ok: styles.statusOk,
    none: styles.statusNone,
  } satisfies Record<ExpiryTone, string>;
  return <span className={`${styles.statusChip} ${toneClass[status.tone]}`}>{status.label}</span>;
}
