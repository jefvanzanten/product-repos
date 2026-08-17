import type { ConsumptionType } from "../../domain/consumption-types";

/** Return an exhaustive Dutch label for a consumption type. */
export function getConsumptionTypeLabel(type: ConsumptionType): string {
  if (type === "FOOD") return "Voeding";
  if (type === "DRINK") return "Drinken";
  return "Supplement";
}
