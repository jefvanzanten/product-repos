import type { CalorieTrackerConsumptionType } from "@product-repos/contracts/calorie-tracker";
import type { ReactNode } from "react";
import { getConsumptionTypeLabel } from "../../domain/consumption-types";
import styles from "./consumption-type-badge.module.css";

/** Colored, textual consumption-type badge. */
export function ConsumptionTypeBadge({ type }: { readonly type: CalorieTrackerConsumptionType }): ReactNode {
  return <span className={`${styles.badge} ${styles[type.toLowerCase()]}`}>{getConsumptionTypeLabel(type)}</span>;
}
