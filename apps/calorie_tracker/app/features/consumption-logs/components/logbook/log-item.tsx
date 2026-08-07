import type { ConsumptionLog } from "@product-repos/contracts/calorie-tracker";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { ConsumptionTypeBadge } from "../../../../components/consumption-type-badge/consumption-type-badge";
import { Icon } from "../../../../components/icon/icon";
import { ProductImage } from "../../../../components/product-image/product-image";
import { logDetailPath, type LogbookRouteState } from "../../../../routing/calorie-tracker-routes";
import { formatLogbookQuantity, presentConsumptionLog } from "../../utils/log-presentation";
import styles from "../../pages/logbook-page/logbook-page.module.css";

/**
 * Render one compact log item without calorie or macro totals.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export function LogItem({ item, routeState }: { readonly item: ConsumptionLog; readonly routeState: LogbookRouteState }): ReactNode {
  const presentation = presentConsumptionLog(item);
  const subtitle = presentation.subtitle === null ? "" : ` · ${presentation.subtitle}`;
  const time = new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: item.timezone,
  }).format(new Date(item.consumedAt));
  return (
    <Link className={styles.logItem} data-log-id={item.id} to={logDetailPath(item.id, routeState)}>
      <ProductImage type={presentation.consumptionType} imageUrl={presentation.imageUrl} />
      <span className={styles.itemProduct}><strong>{presentation.title}{subtitle}</strong></span>
      <span className={styles.itemDetails}>
        <span className={styles.itemMeta}>
          <ConsumptionTypeBadge type={presentation.consumptionType} />
          {presentation.archived && <em>Gearchiveerd</em>}
        </span>
        <b className={styles.itemQuantity}>{formatLogbookQuantity(item)}</b>
        <time className={styles.itemTime} dateTime={item.consumedAt}>{time}</time>
      </span>
      <span className={styles.itemChevron}><Icon name="chevron-right" /></span>
    </Link>
  );
}
