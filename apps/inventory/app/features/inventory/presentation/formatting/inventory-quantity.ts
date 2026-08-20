import type { PhysicalInventoryProductGroup } from "../../domain/inventory";

/** Format a card's total in the product's content unit rather than package equivalents. */
export function formatInventoryQuantity(group: PhysicalInventoryProductGroup): string {
  const fullItemCount = group.fullGroups.reduce((total, fullGroup) => total + fullGroup.count, 0);
  const totalContent = fullItemCount * Number(group.product.maximumAmountBase)
    + group.partialItems.reduce((total, item) => total + Number(item.remainingAmountBase), 0);
  return formatInventoryContentAmount(totalContent, group.product);
}

/** Format one exact remaining-content amount using its product dimension. */
export function formatInventoryContentAmount(amount: number, product: Pick<PhysicalInventoryProductGroup["product"], "dimension" | "baseUnitSymbol">): string {
  if (product.dimension === "COUNT") return `${formatNumber(amount, 0)} ${amount === 1 ? "stuk" : "stuks"}`;
  if (product.dimension === "MASS") return formatInLargestPracticalUnit(amount, [{ symbol: "kg", factor: 1000 }, { symbol: "g", factor: 1 }]);
  return formatInLargestPracticalUnit(amount, [{ symbol: "l", factor: 1000 }, { symbol: "cl", factor: 10 }, { symbol: "ml", factor: 1 }]);
}

/** Select the largest unit whose converted value needs at most two decimal places. */
function formatInLargestPracticalUnit(baseAmount: number, units: ReadonlyArray<{ readonly symbol: string; readonly factor: number }>): string {
  const selected = units.find((unit) => hasAtMostTwoDecimals(baseAmount / unit.factor)) ?? units.at(-1)!;
  return `${formatNumber(baseAmount / selected.factor, selected.factor === 1 ? 3 : 2)} ${selected.symbol}`;
}

/** Test whether a converted amount is stable when rounded to two decimal places. */
function hasAtMostTwoDecimals(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-8;
}

/** Format a quantity using Dutch separators and a bounded number of decimals. */
function formatNumber(value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits }).format(value);
}
