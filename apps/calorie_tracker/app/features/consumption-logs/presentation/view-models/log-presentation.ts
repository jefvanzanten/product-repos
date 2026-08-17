import type { ConsumptionLog } from "../../domain/consumption-log";

/** Presentation data shared by logbook items and log detail. */
export type LogPresentation = {
  readonly title: string;
  readonly subtitle: string | null;
  readonly summary: string;
  readonly imageUrl: string | null;
  readonly consumptionType: "FOOD" | "DRINK" | "SUPPLEMENT";
  readonly archived: boolean;
};

/**
 * Project either consumption-log subtype into shared presentation fields.
 *
 * @param log - The consumption log to project.
 * @returns Presentation fields used by logbook and detail views.
 */
export function presentConsumptionLog(log: ConsumptionLog): LogPresentation {
  if (log.type === "DISH") {
    const servings = log.dish.servings.replace(".", ",");
    return {
      title: log.dish.name,
      subtitle: null,
      summary: `${servings} porties`,
      imageUrl: log.dish.imageUrl,
      consumptionType: "FOOD",
      archived: false,
    };
  }
  return {
    title: log.product.displayName,
    subtitle: null,
    summary: log.product.packageSummary,
    imageUrl: log.product.imageUrl,
    consumptionType: log.product.consumptionType,
    archived: log.product.archived,
  };
}

/**
 * Format the original logged quantity as a Dutch label for either subtype.
 *
 * @param log - The consumption log to format.
 * @returns The original quantity with its unit in Dutch presentation.
 */
export function formatOriginalLogQuantity(log: ConsumptionLog): string {
  const quantity = log.quantity.replace(".", ",");
  if (log.type === "DISH") return `${quantity} ${Number(log.quantity) === 1 ? "portie" : "porties"}`;
  if (log.inputMode === "CONTENT_UNIT") return `${quantity} ${log.inputUnitType?.symbol ?? ""}`.trim();
  if (log.inputMode === "PRODUCT_PORTION") return `${quantity} ${log.product.portion?.name.toLowerCase() ?? "portie"}`;
  return `${quantity} ${log.product.packageType.name.toLowerCase()}`;
}

/**
 * Format the logged quantity as a compact Dutch multiplier for logbook rows.
 *
 * @param log - The consumption log to format.
 * @returns The compact multiplier label.
 */
export function formatLogbookQuantity(log: ConsumptionLog): string {
  const quantity = log.quantity.replace(".", ",");
  if (log.type === "DISH") return `${quantity} ${Number(log.quantity) === 1 ? "portie" : "porties"}`;
  if (log.inputMode === "CONTENT_UNIT") return `${quantity}x ${log.inputUnitType?.symbol ?? "eenheid"}`;
  if (log.inputMode === "PRODUCT_PORTION") return `${quantity}x ${log.product.portion?.name.toLowerCase() ?? "portie"}`;
  return `${quantity}x ${log.product.packageType.name.toLowerCase()}`;
}
