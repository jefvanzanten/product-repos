import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { FullInventoryGroup, PhysicalInventoryItemDetail, PhysicalInventoryProductGroup } from "../../domain/inventory";
import { formatInventoryExpiryDate, presentGroupExpiry, type ExpiryStatus, type ExpiryTone } from "../formatting/inventory-expiry";
import { formatInventoryContentAmount } from "../formatting/inventory-quantity";
import { useInventoryItemContent } from "../hooks/use-inventory-card-content";
import { useInventoryPackageQuantity } from "../hooks/use-inventory-package-quantity";
import { InventoryItemSettingsMenu } from "./inventory-item-settings-menu";
import { InventoryStockVisual } from "./inventory-stock-visual";
import styles from "./inventory-group-card.module.css";

type InventoryGroupCardProps = { readonly group: PhysicalInventoryProductGroup; readonly expanded: boolean; readonly onToggle: () => void };

type InventoryDetailItem =
  | { readonly tag: "Full"; readonly itemId: string; readonly source: FullInventoryGroup }
  | { readonly tag: "Partial"; readonly item: PhysicalInventoryItemDetail };

type InventoryLocationDetails = {
  readonly locationId: number;
  readonly locationPath: string;
  readonly items: ReadonlyArray<InventoryDetailItem>;
};

/** Render one concrete-product group and its physical item distribution. */
export function InventoryGroupCard({ group, expanded, onToggle }: InventoryGroupCardProps): ReactNode {
  const detailsId = `inventory-product-${group.product.productId}`;
  const packageQuantity = useInventoryPackageQuantity(group.product.productId);
  const itemContent = useInventoryItemContent();
  const locationDetails = buildLocationDetails(group);
  const expiryStatus = presentGroupExpiry(group.earliestExpiryStatus);
  return (
    <article className={`${styles.group}${expanded ? ` ${styles.groupExpanded}` : ""}`}>
      <div className={styles.groupHeader}>
        <button className={styles.groupHeaderToggle} type="button" aria-label={`${expanded ? "Details inklappen" : "Details uitklappen"}: ${group.product.displayName}`} aria-expanded={expanded} aria-controls={detailsId} onClick={onToggle} />
        <ProductImage imageUrl={group.product.imageUrl} displayName={group.product.displayName} />
        <span className={styles.groupInfo}>
          <span className={`${styles.groupName} ${styles.desktopProductName}`}>{group.product.displayName}</span>
          <span className={styles.mobileIdentity}>
            <span className={styles.mobileProductName}>{group.product.compositionName.trim() || group.product.displayName}</span>
            {group.product.brandName?.trim() && <span className={styles.mobileBrand}>{group.product.brandName}</span>}
          </span>
          <span className={styles.stockSummary}><InventoryStockVisual group={group} /></span>
          {packageQuantity.failed && <span className={styles.quantityError} role="alert">Aantal wijzigen is mislukt.</span>}
          {group.product.archivedAt !== null && <span className={styles.archived}>Gearchiveerd</span>}
          {group.isLowStock && <span className={styles.archived}>Lage voorraad</span>}
        </span>
        {expiryStatus.tone !== "none" && <span className={styles.groupRight}><StatusChip status={expiryStatus} /></span>}
        <svg className={styles.chevron} viewBox="0 0 20 20" aria-hidden="true"><path d="m7.5 4.5 5 5.5-5 5.5" /></svg>
      </div>
      {expanded && (
        <div className={styles.batchList} id={detailsId}>
          {locationDetails.map((location) => (
            <section className={styles.locationGroup} key={location.locationId}>
              <h3 className={styles.locationHeader}>{location.locationPath}</h3>
              {location.items.map((detail) => detail.tag === "Full"
                ? <FullItemRow key={detail.itemId} group={detail.source} itemId={detail.itemId} maximumAmountBase={group.product.maximumAmountBase} product={group.product} isUpdating={packageQuantity.isPending || itemContent.isPending} onAmountChange={(amount) => itemContent.updateRemainingAmount(detail.itemId, amount)} onDecrease={() => packageQuantity.decrease(detail.itemId)} onIncrease={() => packageQuantity.increase(detail.source.locationId, detail.source.expiryDate)} />
                : <PartialItemRow key={detail.item.id} item={detail.item} isUpdating={packageQuantity.isPending || itemContent.isPending} onAmountChange={(amount) => itemContent.updateRemainingAmount(detail.item.id, amount, detail.item)} onDecrease={() => packageQuantity.decrease(detail.item.id, detail.item.version)} onIncrease={() => packageQuantity.increase(detail.item.locationId, detail.item.expiryDate)} />)}
            </section>
          ))}
        </div>
      )}
    </article>
  );
}

/** Render one full physical package as an independently editable detail row. */
function FullItemRow({ group, itemId, maximumAmountBase, product, isUpdating, onAmountChange, onDecrease, onIncrease }: {
  readonly group: FullInventoryGroup;
  readonly itemId: string;
  readonly maximumAmountBase: string;
  readonly product: PhysicalInventoryProductGroup["product"];
  readonly isUpdating: boolean;
  readonly onAmountChange: (amount: string) => Promise<boolean>;
  readonly onDecrease: () => void;
  readonly onIncrease: () => void;
}): ReactNode {
  return <InventoryDetailRow itemId={itemId} locationPath={group.locationPath} expiryDate={group.expiryDate} remainingAmountBase={maximumAmountBase} maximumAmountBase={maximumAmountBase} product={product} isUpdating={isUpdating} onAmountChange={onAmountChange} onDecrease={onDecrease} onIncrease={onIncrease} />;
}

/** Render one independent partial package as an editable detail row. */
function PartialItemRow({ item, isUpdating, onAmountChange, onDecrease, onIncrease }: {
  readonly item: PhysicalInventoryItemDetail;
  readonly isUpdating: boolean;
  readonly onAmountChange: (amount: string) => Promise<boolean>;
  readonly onDecrease: () => void;
  readonly onIncrease: () => void;
}): ReactNode {
  return <InventoryDetailRow itemId={item.id} locationPath={item.locationPath} expiryDate={item.expiryDate} remainingAmountBase={item.remainingAmountBase} maximumAmountBase={item.maximumAmountBase} product={item.product} isUpdating={isUpdating} onAmountChange={onAmountChange} onDecrease={onDecrease} onIncrease={onIncrease} />;
}

/** Render one item's location above its editable content, progress, and package controls. */
function InventoryDetailRow({ itemId, locationPath, expiryDate, remainingAmountBase, maximumAmountBase, product, isUpdating, onAmountChange, onDecrease, onIncrease }: {
  readonly itemId: string;
  readonly locationPath: string;
  readonly expiryDate: string | null;
  readonly remainingAmountBase: string;
  readonly maximumAmountBase: string;
  readonly product: PhysicalInventoryProductGroup["product"];
  readonly isUpdating: boolean;
  readonly onAmountChange: (amount: string) => Promise<boolean>;
  readonly onDecrease: () => void;
  readonly onIncrease: () => void;
}): ReactNode {
  const [draft, setDraft] = useState<{ readonly itemId: string; readonly amount: string } | null>(null);
  const [updateFailed, setUpdateFailed] = useState(false);
  const commitIsRunning = useRef(false);
  const amount = draft?.itemId === itemId ? draft.amount : remainingAmountBase;
  const percentage = Math.round(Math.min(1, Math.max(0, Number(amount) / Number(maximumAmountBase))) * 100);

  /** Save the slider value when pointer or keyboard interaction ends. */
  async function commitAmount(): Promise<void> {
    if (amount === remainingAmountBase || isUpdating || commitIsRunning.current) return;
    commitIsRunning.current = true;
    try {
      const succeeded = await onAmountChange(amount);
      setUpdateFailed(!succeeded);
      setDraft(null);
    } finally {
      commitIsRunning.current = false;
    }
  }

  return (
    <div className={`${styles.batchRow} ${styles.detailRow}`}>
      <span className={styles.detailStock}>
        <strong>{formatInventoryContentAmount(Number(amount), product)}</strong>
        <input
          className={styles.detailProgressInput}
          type="range"
          min="0"
          max={maximumAmountBase}
          step="1"
          value={amount}
          disabled={isUpdating}
          aria-label={`Resterende inhoud op ${locationPath}`}
          aria-valuetext={`${percentage}%`}
          style={{ "--detail-progress": `${percentage}%` } as CSSProperties}
          onChange={(event) => { setUpdateFailed(false); setDraft({ itemId, amount: event.target.value }); }}
          onBlur={() => { void commitAmount(); }}
          onKeyUp={() => { void commitAmount(); }}
          onPointerUp={() => { void commitAmount(); }}
        />
        <span className={styles.quantityControls} aria-label={`Aantal verpakkingen op ${locationPath}`}>
          <button type="button" disabled={isUpdating} aria-label={`Eén verpakking minder op ${locationPath}`} onClick={onDecrease}>−</button>
          <strong aria-live="polite">1</strong>
          <button type="button" disabled={isUpdating} aria-label={`Eén verpakking meer op ${locationPath}`} onClick={onIncrease}>+</button>
        </span>
        {expiryDate !== null && <time className={styles.detailExpiry} dateTime={expiryDate}>{formatInventoryExpiryDate(expiryDate)}</time>}
        <InventoryItemSettingsMenu itemId={itemId} />
      </span>
      {updateFailed && <span className={styles.detailUpdateError} role="alert">Inhoud wijzigen is mislukt.</span>}
    </div>
  );
}

/** Group physical-item detail rows beneath one header per location path. */
function buildLocationDetails(group: PhysicalInventoryProductGroup): ReadonlyArray<InventoryLocationDetails> {
  const locations = new Map<number, { locationId: number; locationPath: string; items: InventoryDetailItem[] }>();

  /** Return an existing mutable presentation group or create it in display order. */
  function location(locationId: number, locationPath: string): { locationId: number; locationPath: string; items: InventoryDetailItem[] } {
    const existing = locations.get(locationId);
    if (existing !== undefined) return existing;
    const created = { locationId, locationPath, items: [] };
    locations.set(locationId, created);
    return created;
  }

  for (const fullGroup of group.fullGroups) {
    const details = location(fullGroup.locationId, fullGroup.locationPath);
    for (const itemId of fullGroup.itemIds) details.items.push({ tag: "Full", itemId, source: fullGroup });
  }
  for (const item of group.partialItems) location(item.locationId, item.locationPath).items.push({ tag: "Partial", item });
  return [...locations.values()];
}

/** Render a product image or neutral placeholder. */
function ProductImage({ imageUrl, displayName }: { readonly imageUrl: string | null; readonly displayName: string }): ReactNode {
  const [failed, setFailed] = useState(false);
  if (imageUrl !== null && !failed) return <img className={styles.productImage} src={imageUrl} alt="" onError={() => setFailed(true)} />;
  return <span className={styles.imagePlaceholder} aria-label={`Geen afbeelding voor ${displayName}`}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3.5 17.5 9 12l4.5 4.5 3-3 4 4" /></svg></span>;
}

/** Render one tone-mapped expiry chip. */
function StatusChip({ status }: { readonly status: ExpiryStatus }): ReactNode {
  if (status.tone === "none") return null;
  const toneClass = { expired: styles.statusExpired, today: styles.statusToday, soon: styles.statusSoon, ok: styles.statusOk, none: undefined } satisfies Record<ExpiryTone, string | undefined>;
  return <span className={`${styles.statusChip} ${toneClass[status.tone] ?? ""}`}>{status.label}</span>;
}
