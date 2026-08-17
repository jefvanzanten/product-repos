import { readFormText, readFormEntryText } from "../../../core/data/form-data";
import type { CreateConcreteProduct } from "../domain/product-catalog";

/** Parse concrete product fields while preserving decimal wire strings. */
export function parseConcreteProduct(form: FormData, compositionId: string): { readonly value: CreateConcreteProduct } | { readonly errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const packageTypeId = Number(form.get("packageTypeId"));
  const unitTypeId = Number(form.get("unitTypeId"));
  const amount = normalizeDecimal(form.get("amount"));
  if (!Number.isInteger(packageTypeId) || packageTypeId < 1) errors.packageTypeId = "Kies een verpakkingstype.";
  if (!Number.isInteger(unitTypeId) || unitTypeId < 1) errors.unitTypeId = "Kies een eenheid.";
  if (!isPositiveDecimal(amount)) errors.amount = "Vul een positieve inhoud in.";

  const portionEnabled = form.get("portionEnabled") === "on";
  const singularName = readFormText(form, "portionName").trim();
  const pluralName = readFormText(form, "portionPluralName").trim();
  const portionAmount = normalizeDecimal(form.get("portionAmount"));
  const portionUnitTypeId = Number(form.get("portionUnitTypeId"));
  if (portionEnabled && !singularName) errors.portionName = "Vul de enkelvoudige portienaam in.";
  if (portionEnabled && !pluralName) errors.portionPluralName = "Vul de meervoudige portienaam in.";
  if (portionEnabled && !isPositiveDecimal(portionAmount)) errors.portionAmount = "Vul een positieve portiegrootte in.";
  if (portionEnabled && (!Number.isInteger(portionUnitTypeId) || portionUnitTypeId < 1)) errors.portionUnitTypeId = "Kies een portie-eenheid.";
  if (Object.keys(errors).length > 0) return { errors };

  const imageUrl = readFormText(form, "imageUrl").trim();
  const barcode = readFormText(form, "barcode").trim();
  const portionsRaw = readFormText(form, "portionsPerProduct").trim();
  return { value: {
    productCompositionId: compositionId,
    packageTypeId,
    content: { amount, unitTypeId },
    imageUrl: imageUrl || null,
    barcode: barcode || null,
    portion: portionEnabled ? {
      singularName,
      pluralName,
      amount: portionAmount,
      unitTypeId: portionUnitTypeId,
      portionsPerProduct: portionsRaw ? Number(portionsRaw) : null,
    } : null,
  } };
}

/** Normalize a Dutch form decimal to the canonical wire representation. */
function normalizeDecimal(value: FormDataEntryValue | null): string {
  return readFormEntryText(value).trim().replace(",", ".");
}

/** Determine whether a canonical decimal is greater than zero. */
function isPositiveDecimal(value: string): boolean {
  return /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) && Number(value) > 0;
}
