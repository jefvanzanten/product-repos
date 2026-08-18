import type {
  AvailableInputUnit,
  CreateConsumptionLog,
  ProductConsumptionLog,
  ProductSearchResult,
  UpdateConsumptionLog,
  LogFormMode,
} from "./consumption-log";
import { parseEditedConsumptionMoment } from "../../../core/domain/dates-and-timezones";
import { parsePositiveDecimal } from "../../../core/domain/quantities";
import { createUnitKey } from "./log-form-units";

type FormMoment = {
  readonly date: string;
  readonly time: string;
};

type SharedFormFields = {
  readonly mode: LogFormMode;
  readonly quantity: string;
  readonly selectedDate: string;
  readonly time: string;
  readonly timezone: string;
  readonly initialMoment: FormMoment;
  readonly clientId: string;
};

type LogFormSubmissionInput =
  | (SharedFormFields & {
      readonly kind: "PRODUCT";
      readonly selectedProduct: ProductSearchResult | ProductConsumptionLog["product"] | null;
      readonly availableUnits: ReadonlyArray<AvailableInputUnit>;
      readonly unitKey: string | null;
    })
  | (SharedFormFields & {
      readonly kind: "DISH";
      readonly dishId: string | null;
    });

export type LogFormSubmissionError =
  | { readonly tag: "FutureMoment" }
  | { readonly tag: "AmbiguousMoment" }
  | { readonly tag: "InvalidMoment" }
  | { readonly tag: "MissingDish" }
  | { readonly tag: "InvalidDishQuantity" }
  | { readonly tag: "MissingProduct" }
  | { readonly tag: "InvalidProductQuantity" }
  | { readonly tag: "MissingUnit" };

type LogFormSubmissionResult =
  | { readonly tag: "Failure"; readonly error: LogFormSubmissionError }
  | {
      readonly tag: "Success";
      readonly payload: CreateConsumptionLog | UpdateConsumptionLog;
      readonly requiresQuantityConfirmation: boolean;
    };

/**
 * Validate a log-form concept and construct its route payload.
 *
 * @param input - Current form values and create/edit context.
 * @returns A validation failure or submission-ready payload.
 */
export function createLogFormSubmission(input: LogFormSubmissionInput): LogFormSubmissionResult {
  const parsedMoment = parseEditedConsumptionMoment(
    input.selectedDate,
    input.time,
    input.timezone,
    input.mode.tag === "Edit"
      ? { date: input.initialMoment.date, time: input.initialMoment.time, consumedAt: input.mode.log.consumedAt }
      : null,
  );
  if (parsedMoment.tag === "Failure") {
    return {
      tag: "Failure",
      error: { tag: parsedMoment.error.tag },
    };
  }
  if (input.kind === "DISH") return createDishSubmission(input, parsedMoment.value);
  return createProductSubmission(input, parsedMoment.value);
}

/**
 * Validate and build a dish-portion submission payload.
 *
 * @param input - Dish form values.
 * @param consumedAt - Validated consumed instant.
 * @returns A validation failure or dish submission payload.
 */
function createDishSubmission(input: Extract<LogFormSubmissionInput, { readonly kind: "DISH" }>, consumedAt: string): LogFormSubmissionResult {
  if (input.dishId === null) {
    return { tag: "Failure", error: { tag: "MissingDish" } };
  }
  const parsedQuantity = parsePositiveDecimal(input.quantity);
  if (parsedQuantity.tag === "Failure") {
    return { tag: "Failure", error: { tag: "InvalidDishQuantity" } };
  }
  return {
    tag: "Success",
    payload: input.mode.tag === "Create"
      ? { id: input.clientId, type: "DISH", dishId: input.dishId, quantity: parsedQuantity.value.canonical, consumedAt }
      : { expectedUpdatedAt: input.mode.log.updatedAt, type: "DISH", quantity: parsedQuantity.value.canonical, consumedAt },
    requiresQuantityConfirmation: Number(parsedQuantity.value.canonical) >= 10_000,
  };
}

/**
 * Validate and build a product submission payload.
 *
 * @param input - Product form values.
 * @param consumedAt - Validated consumed instant.
 * @returns A validation failure or product submission payload.
 */
function createProductSubmission(input: Extract<LogFormSubmissionInput, { readonly kind: "PRODUCT" }>, consumedAt: string): LogFormSubmissionResult {
  if (input.selectedProduct === null) {
    return { tag: "Failure", error: { tag: "MissingProduct" } };
  }
  const parsedQuantity = parsePositiveDecimal(input.quantity);
  if (parsedQuantity.tag === "Failure") {
    return { tag: "Failure", error: { tag: "InvalidProductQuantity" } };
  }
  const selectedUnit = input.availableUnits.find((unit) => createUnitKey(unit) === input.unitKey);
  if (selectedUnit === undefined) {
    return { tag: "Failure", error: { tag: "MissingUnit" } };
  }
  const shared = {
    productId: input.selectedProduct.productId,
    quantity: parsedQuantity.value.canonical,
    inputMode: selectedUnit.inputMode,
    inputUnitTypeId: selectedUnit.unitType?.id ?? null,
    consumedAt,
  };
  return {
    tag: "Success",
    payload: input.mode.tag === "Create"
      ? { id: input.clientId, type: "PRODUCT", ...shared }
      : { expectedUpdatedAt: input.mode.log.updatedAt, type: "PRODUCT", ...shared },
    requiresQuantityConfirmation: Number(parsedQuantity.value.canonical) >= 10_000,
  };
}
