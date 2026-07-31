import type {
  CalorieTrackerUnitDimension,
  ConsumptionInputMode,
  MacroValues,
} from "@product-repos/contracts/calorie-tracker";

/** A successful or expected failed pure Calorie Tracker operation. */
export type DomainResult<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Expected failure produced while parsing or combining consumption input. */
export type ConsumptionInputError = {
  readonly code: "VALIDATION_ERROR" | "REFERENCE_NOT_FOUND";
  readonly message: string;
  readonly fields?: Readonly<Record<string, string>>;
};

/** Unit data needed by pure quantity conversion. */
export type QuantityUnit = {
  readonly id: number;
  readonly name: string;
  readonly symbol: string;
  readonly dimension: CalorieTrackerUnitDimension;
  readonly conversionToBase: string;
};

/** Package data needed by pure quantity conversion. */
export type QuantityPackage = {
  readonly contentAmount: string;
  readonly contentUnit: QuantityUnit;
  readonly packageLabel: string;
  readonly portion: {
    readonly contentAmount: string;
    readonly contentUnit: QuantityUnit;
    readonly label: string;
  } | null;
};

/** Original parsed consumption input. */
export type ConsumptionQuantityInput = {
  readonly quantity: string;
  readonly inputMode: ConsumptionInputMode;
  readonly inputUnit: QuantityUnit | null;
};

/** Quantity converted to the package's base dimension. */
export type DerivedConsumptionQuantity = {
  readonly baseAmount: string;
  readonly label: string;
};

/** Product macro profile used by pure nutrition calculations. */
export type NutritionProfile = {
  readonly referenceBasis: "PER_100_G" | "PER_100_ML" | "PER_UNIT";
  readonly caloriesKcal: string | null;
  readonly proteinG: string | null;
  readonly carbohydratesG: string | null;
  readonly fatG: string | null;
};

type DecimalParts = {
  readonly coefficient: bigint;
  readonly scale: number;
};

/** Construct a successful pure-domain result. */
function succeed<T>(value: T): DomainResult<T, never> {
  return { ok: true, value };
}

/** Construct an expected failed pure-domain result. */
function fail<E>(error: E): DomainResult<never, E> {
  return { ok: false, error };
}

/** Parse a protocol decimal into integer coefficient and decimal scale. */
function parseDecimalParts(value: string): DecimalParts | null {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return null;
  const [integerPart, fractionPart = ""] = value.split(".");
  if (integerPart === undefined) return null;
  return { coefficient: BigInt(`${integerPart}${fractionPart}`), scale: fractionPart.length };
}

/** Render decimal parts without exponent notation or insignificant zeroes. */
function renderDecimal(parts: DecimalParts): string {
  if (parts.coefficient === 0n) return "0";
  let digits = parts.coefficient.toString();
  if (parts.scale > 0) {
    digits = digits.padStart(parts.scale + 1, "0");
    const splitAt = digits.length - parts.scale;
    digits = `${digits.slice(0, splitAt)}.${digits.slice(splitAt)}`.replace(/0+$/, "").replace(/\.$/, "");
  }
  return digits;
}

/** Parse and canonicalize a decimal greater than zero. */
export function parsePositiveDecimal(value: string): DomainResult<string, ConsumptionInputError> {
  const parts = parseDecimalParts(value);
  if (parts === null || parts.coefficient <= 0n) {
    return fail({ code: "VALIDATION_ERROR", message: "Request is invalid", fields: { quantity: "Quantity must be greater than zero" } });
  }
  return succeed(renderDecimal(parts));
}

/** Canonicalize a trusted non-negative persistence decimal. */
export function canonicalDecimal(value: string): string {
  const parts = parseDecimalParts(value);
  if (parts === null) throw new Error("Invalid persisted decimal");
  return renderDecimal(parts);
}

/** Multiply two trusted canonical decimal strings exactly. */
export function multiplyDecimals(left: string, right: string): string {
  const leftParts = parseDecimalParts(left);
  const rightParts = parseDecimalParts(right);
  if (leftParts === null || rightParts === null) throw new Error("Invalid decimal multiplication input");
  return renderDecimal({ coefficient: leftParts.coefficient * rightParts.coefficient, scale: leftParts.scale + rightParts.scale });
}

/** Divide a trusted decimal by one hundred exactly. */
function divideByOneHundred(value: string): string {
  const parts = parseDecimalParts(value);
  if (parts === null) throw new Error("Invalid decimal division input");
  return renderDecimal({ coefficient: parts.coefficient, scale: parts.scale + 2 });
}

/** Add two trusted canonical decimal strings exactly. */
export function addDecimals(left: string, right: string): string {
  const leftParts = parseDecimalParts(left);
  const rightParts = parseDecimalParts(right);
  if (leftParts === null || rightParts === null) throw new Error("Invalid decimal addition input");
  const scale = Math.max(leftParts.scale, rightParts.scale);
  const leftCoefficient = leftParts.coefficient * 10n ** BigInt(scale - leftParts.scale);
  const rightCoefficient = rightParts.coefficient * 10n ** BigInt(scale - rightParts.scale);
  return renderDecimal({ coefficient: leftCoefficient + rightCoefficient, scale });
}

/** Validate an IANA timezone and return its normalized input value. */
export function parseTimezone(value: string): DomainResult<string, ConsumptionInputError> {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date(0));
    return succeed(value);
  } catch {
    return fail({ code: "VALIDATION_ERROR", message: "Browser timezone is invalid", fields: { timezone: "Use a valid IANA timezone" } });
  }
}

/** Derive the local calendar date of an instant in an IANA timezone. */
export function localDateForInstant(instant: string | Date, timezone: string): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (year === undefined || month === undefined || day === undefined) throw new Error("Unable to derive local calendar date");
  return `${year}-${month}-${day}`;
}

/** Determine whether a requested local date is today or in the past. */
export function isAllowedLocalDate(localDate: string, timezone: string, now: Date): boolean {
  return localDate <= localDateForInstant(now, timezone);
}

/** Determine whether a consumed instant is not in the future. */
export function isAllowedConsumedAt(consumedAt: string, now: Date): boolean {
  const timestamp = Date.parse(consumedAt);
  return Number.isFinite(timestamp) && timestamp <= now.getTime();
}

/** Convert original consumption input into a base-dimension quantity. */
export function deriveConsumptionQuantity(
  packageValue: QuantityPackage,
  input: ConsumptionQuantityInput,
): DomainResult<DerivedConsumptionQuantity, ConsumptionInputError> {
  const quantity = parsePositiveDecimal(input.quantity);
  if (!quantity.ok) return quantity;

  if (input.inputMode === "PACKAGE") {
    if (input.inputUnit !== null) return invalidUnitSelection();
    const packageBase = multiplyDecimals(packageValue.contentAmount, packageValue.contentUnit.conversionToBase);
    return succeed({ baseAmount: multiplyDecimals(quantity.value, packageBase), label: `${quantity.value} ${packageValue.packageLabel}` });
  }

  if (input.inputMode === "INDIVIDUAL_UNIT") {
    if (input.inputUnit !== null || packageValue.portion === null) return invalidUnitSelection();
    const portionBase = multiplyDecimals(packageValue.portion.contentAmount, packageValue.portion.contentUnit.conversionToBase);
    return succeed({ baseAmount: multiplyDecimals(quantity.value, portionBase), label: `${quantity.value} ${packageValue.portion.label}` });
  }

  if (input.inputUnit === null || input.inputUnit.dimension !== packageValue.contentUnit.dimension) return invalidUnitSelection();
  return succeed({
    baseAmount: multiplyDecimals(quantity.value, input.inputUnit.conversionToBase),
    label: `${quantity.value} ${input.inputUnit.symbol}`,
  });
}

/** Construct an expected incompatible input-unit failure. */
function invalidUnitSelection(): DomainResult<never, ConsumptionInputError> {
  return fail({ code: "REFERENCE_NOT_FOUND", message: "Input unit is not available for this package" });
}

/** Derive calories from a complete macro set using the 4/4/9 rule. */
function deriveProfileCalories(profile: NutritionProfile): string | null {
  if (profile.caloriesKcal !== null) return profile.caloriesKcal;
  if (profile.proteinG === null || profile.carbohydratesG === null || profile.fatG === null) return null;
  return addDecimals(
    addDecimals(multiplyDecimals(profile.proteinG, "4"), multiplyDecimals(profile.carbohydratesG, "4")),
    multiplyDecimals(profile.fatG, "9"),
  );
}

/** Scale one optional profile value to a consumed base quantity. */
function scaleProfileValue(value: string | null, baseAmount: string, perHundred: boolean): string | null {
  if (value === null) return null;
  const scaled = multiplyDecimals(value, baseAmount);
  return perHundred ? divideByOneHundred(scaled) : scaled;
}

/** Calculate exact macro values for a derived consumed quantity. */
export function calculateMacroValues(profile: NutritionProfile | null, baseAmount: string): MacroValues | null {
  if (profile === null) return null;
  const perHundred = profile.referenceBasis !== "PER_UNIT";
  return {
    caloriesKcal: scaleProfileValue(deriveProfileCalories(profile), baseAmount, perHundred),
    proteinG: scaleProfileValue(profile.proteinG, baseAmount, perHundred),
    carbohydratesG: scaleProfileValue(profile.carbohydratesG, baseAmount, perHundred),
    fatG: scaleProfileValue(profile.fatG, baseAmount, perHundred),
  };
}

/** Sum nullable macro values while preserving unknown-versus-known-zero meaning. */
export function sumMacroValues(values: ReadonlyArray<MacroValues | null>): MacroValues {
  return {
    caloriesKcal: sumOptionalValues(values.map((value) => value?.caloriesKcal ?? null)),
    proteinG: sumOptionalValues(values.map((value) => value?.proteinG ?? null)),
    carbohydratesG: sumOptionalValues(values.map((value) => value?.carbohydratesG ?? null)),
    fatG: sumOptionalValues(values.map((value) => value?.fatG ?? null)),
  };
}

/** Sum present decimal values and retain null when none are present. */
function sumOptionalValues(values: ReadonlyArray<string | null>): string | null {
  const present = values.filter((value): value is string => value !== null);
  if (present.length === 0) return null;
  return present.reduce(addDecimals, "0");
}
