/** Parsed non-negative decimal represented without floating-point loss. */
type DecimalParts = { readonly coefficient: bigint; readonly scale: number };

/** Parse one canonical non-negative decimal. */
function parseDecimal(value: string): DecimalParts {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) throw new Error("Invalid inventory decimal");
  const [whole = "0", fraction = ""] = value.split(".");
  return { coefficient: BigInt(`${whole}${fraction}`), scale: fraction.length };
}

/** Render decimal parts in canonical notation. */
function renderDecimal(coefficient: bigint, scale: number): string {
  const negative = coefficient < 0n;
  let digits = (negative ? -coefficient : coefficient).toString().padStart(scale + 1, "0");
  if (scale > 0) digits = `${digits.slice(0, -scale)}.${digits.slice(-scale)}`.replace(/0+$/, "").replace(/\.$/, "");
  return `${negative ? "-" : ""}${digits}`;
}

/** Multiply two canonical decimals exactly. */
export function multiplyInventoryDecimals(left: string, right: string): string {
  const a = parseDecimal(left);
  const b = parseDecimal(right);
  return renderDecimal(a.coefficient * b.coefficient, a.scale + b.scale);
}

/** Add canonical decimals exactly. */
export function addInventoryDecimals(left: string, right: string): string {
  const a = parseDecimal(left);
  const b = parseDecimal(right);
  const scale = Math.max(a.scale, b.scale);
  return renderDecimal(a.coefficient * 10n ** BigInt(scale - a.scale) + b.coefficient * 10n ** BigInt(scale - b.scale), scale);
}

/** Subtract canonical decimals exactly, allowing a signed result for audit deltas. */
export function subtractInventoryDecimals(left: string, right: string): string {
  const a = parseDecimal(left);
  const b = parseDecimal(right);
  const scale = Math.max(a.scale, b.scale);
  return renderDecimal(a.coefficient * 10n ** BigInt(scale - a.scale) - b.coefficient * 10n ** BigInt(scale - b.scale), scale);
}

/** Compare two canonical decimals exactly. */
export function compareInventoryDecimals(left: string, right: string): number {
  const difference = subtractInventoryDecimals(left, right);
  if (difference === "0") return 0;
  return difference.startsWith("-") ? -1 : 1;
}

/** Derive a bounded numeric ratio for presentation. */
export function inventoryRatio(remaining: string, maximum: string): number {
  return Math.min(1, Math.max(0, Number(remaining) / Number(maximum)));
}

/** Round only a presentation package equivalent to at most one decimal. */
export function packageEquivalent(total: string, maximum: string): number {
  return Math.round((Number(total) / Number(maximum)) * 10) / 10;
}

/** Derive expiry urgency against an ISO local calendar date. */
export function deriveExpiryStatus(expiryDate: string | null, today: string): "EXPIRED" | "TODAY" | "URGENT" | "SOON" | "LATER" | "NONE" {
  if (expiryDate === null) return "NONE";
  const difference = Math.round((Date.parse(`${expiryDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (difference < 0) return "EXPIRED";
  if (difference === 0) return "TODAY";
  if (difference <= 3) return "URGENT";
  if (difference <= 7) return "SOON";
  return "LATER";
}
