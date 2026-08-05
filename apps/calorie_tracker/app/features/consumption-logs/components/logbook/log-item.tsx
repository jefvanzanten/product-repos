import type { ConsumptionLog } from "@product-repos/contracts/calorie-tracker";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { ConsumptionTypeBadge } from "../../../../components/consumption-type-badge/consumption-type-badge";
import { Icon } from "../../../../components/icon/icon";
import { ProductImage } from "../../../../components/product-image/product-image";
import { logDetailPath, type LogbookRouteState } from "../../../../routing/calorie-tracker-routes";
import styles from "../../pages/logbook-page/logbook-page.module.css";

/**
 * Render one compact log item without calorie or macro totals.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export function LogItem({ item, routeState }: { readonly item: ConsumptionLog; readonly routeState: LogbookRouteState }): ReactNode {
  const brand = item.package.brand === null ? "" : ` · ${item.package.brand.name}`;
  const time = new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: item.timezone,
  }).format(new Date(item.consumedAt));
  return (
    <Link className={styles.logItem} data-log-id={item.id} to={logDetailPath(item.id, routeState)}>
      <ProductImage type={item.package.consumptionType} imageUrl={item.package.imageUrl} />
      <span className={styles.itemProduct}><strong>{item.package.productName}{brand}</strong></span>
      <span className={styles.itemDetails}>
        <span className={styles.itemMeta}>
          <ConsumptionTypeBadge type={item.package.consumptionType} />
          {(item.package.productArchived || item.package.packageArchived) && <em>Gearchiveerd</em>}
        </span>
        <b className={styles.itemQuantity}>{formatQuantity(item)}</b>
        <time className={styles.itemTime} dateTime={item.consumedAt}>{time}</time>
      </span>
      <span className={styles.itemChevron}><Icon name="chevron-right" /></span>
    </Link>
  );
}

/**
 * Format a logged quantity as a Dutch multiplier with its input unit.
 *
 * @param item - The item value.
 * @returns The function result.
 */
function formatQuantity(item: ConsumptionLog): string {
  const quantity = item.quantity.replace(".", ",");
  if (item.inputMode === "CONTENT_UNIT") return `${quantity}x ${item.inputUnitType?.symbol ?? "eenheid"}`;
  if (item.inputMode === "INDIVIDUAL_UNIT") return `${quantity}x ${item.package.portion?.name.toLowerCase() ?? "eenheid"}`;
  return `${quantity}x ${item.package.packageType.name.toLowerCase()}`;
}
