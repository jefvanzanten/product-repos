import type { CSSProperties, ReactNode } from "react";
import type { PhysicalInventoryProductGroup } from "../../domain/inventory";
import styles from "./inventory-stock-visual.module.css";

type PackageIconVariant = "bottle" | "can" | "carton" | "jar" | "bag" | "box";

/** Show every physical package as a silhouette filled to its remaining ratio. */
export function InventoryStockVisual({ group }: { readonly group: PhysicalInventoryProductGroup }): ReactNode {
  const fillRatios = getPackageFillRatios(group);
  if (fillRatios.length === 0) return null;
  const variant = packageIconVariant(group.product.package.typeName);
  const percentages = fillRatios.map(toPercentage);
  return (
    <span className={styles.packageIcons} role="img" aria-label={`${fillRatios.length} ${fillRatios.length === 1 ? "verpakking" : "verpakkingen"}: ${percentages.join("%, ")}% gevuld`}>
      {fillRatios.map((fillRatio, index) => <PackageFillIcon key={index} variant={variant} fillRatio={fillRatio} />)}
    </span>
  );
}

/** Expand grouped full packages and independent partial packages into their visual fill ratios. */
function getPackageFillRatios(group: PhysicalInventoryProductGroup): ReadonlyArray<number> {
  const fullRatios = group.fullGroups.flatMap((fullGroup) => Array.from({ length: fullGroup.count }, () => 1));
  return [...fullRatios, ...group.partialItems.map((item) => item.remainingRatio)];
}

/** Render one package silhouette filled from bottom to top. */
function PackageFillIcon({ variant, fillRatio }: { readonly variant: PackageIconVariant; readonly fillRatio: number }): ReactNode {
  const clippedAmount = 100 - toPercentage(fillRatio);
  return (
    <span className={styles.packageIconShell} aria-hidden="true">
      <svg className={`${styles.packageIcon} ${styles.packageIconOutline}`} viewBox="0 0 24 30"><PackageShape variant={variant} /></svg>
      <svg className={`${styles.packageIcon} ${styles.packageIconFill}`} viewBox="0 0 24 30" style={{ "--package-clip": `${clippedAmount}%` } as CSSProperties}><PackageShape variant={variant} /></svg>
    </span>
  );
}

/** Draw the silhouette matching a catalog package-type name. */
function PackageShape({ variant }: { readonly variant: PackageIconVariant }): ReactNode {
  switch (variant) {
    case "bottle": return <><path d="M9 2h6v5l2 3v17H7V10l2-3Z" /><path className={styles.packageDetail} d="M9 7h6M7 13h10" /></>;
    case "can": return <><path d="M6 4c0-2 12-2 12 0v22c0 2-12 2-12 0Z" /><path className={styles.packageDetail} d="M6 4c0 2 12 2 12 0M6 25c0-2 12-2 12 0" /></>;
    case "jar": return <><path d="M7 7h10l2 4v15H5V11Z" /><path className={styles.packageDetail} d="M7 3h10v4H7ZM5 12h14" /></>;
    case "bag": return <><path d="m7 3 3 2h4l3-2 2 24H5Z" /><path className={styles.packageDetail} d="M6 9h12" /></>;
    case "box": return <><path d="M4 6 12 2l8 4v20l-8 3-8-3Z" /><path className={styles.packageDetail} d="m4 6 8 4 8-4M12 10v19" /></>;
    case "carton": return <><path d="m6 8 3-6h7l2 6v20H6Z" /><path className={styles.packageDetail} d="M6 8h12M9 2l3 6v20M12 8l4-6" /></>;
  }
}

/** Select a compact silhouette from common Dutch and English package-type names. */
function packageIconVariant(packageTypeName: string): PackageIconVariant {
  const name = packageTypeName.trim().toLocaleLowerCase("nl-NL");
  if (name.includes("fles") || name.includes("bottle")) return "bottle";
  if (name.includes("blik") || name.includes("can")) return "can";
  if (name.includes("pot") || name.includes("jar")) return "jar";
  if (name.includes("zak") || name.includes("bag")) return "bag";
  if (name.includes("pak") || name.includes("karton") || name.includes("carton")) return "carton";
  return "box";
}

/** Clamp a ratio and convert it to a whole percentage for accessible output. */
function toPercentage(ratio: number): number {
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
}
