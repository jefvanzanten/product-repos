/** Format a protocol decimal for Dutch presentation. */
export function formatDecimal(value: string | null, maximumFractionDigits: number): string {
  if (value === null) return "0";
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits }).format(Number(value));
}
