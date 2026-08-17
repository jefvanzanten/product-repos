import type { ConsumptionType } from "../../../domain/consumption-types";
import type { ReactNode } from "react";
import { getConsumptionTypeLabel } from "../../formatting/consumption-types";
import styles from "./consumption-type-badge.module.css";

/** Colored, textual consumption-type badge. */
export function ConsumptionTypeBadge({ type }: { readonly type: ConsumptionType }): ReactNode {
  return <span className={`${styles.badge} ${styles[type.toLowerCase()]}`}>{getConsumptionTypeLabel(type)}</span>;
}
