import type {
  AvailableInputUnit,
  CreateConsumptionLog,
  PackageSearchResult,
  UpdateConsumptionLog,
} from "@product-repos/contracts/calorie-tracker";
import { parseEditedConsumptionMoment } from "../../../../domain/dates-and-timezones";
import { parsePositiveDecimal } from "../../../../domain/quantities";
import type { LogFormMode } from "../../types/log-form.types";
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
      readonly kind: "PACKAGE";
      readonly selectedPackage: PackageSearchResult | null;
      readonly availableUnits: ReadonlyArray<AvailableInputUnit>;
      readonly unitKey: string | null;
    })
  | (SharedFormFields & {
      readonly kind: "DISH";
      readonly dishId: string | null;
    });

type LogFormSubmissionResult =
  | { readonly _tag: "Failure"; readonly error: string }
  | {
      readonly _tag: "Success";
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
    input.mode._tag === "Edit"
      ? { date: input.initialMoment.date, time: input.initialMoment.time, consumedAt: input.mode.log.consumedAt }
      : null,
  );
  if (parsedMoment._tag === "Failure") {
    return {
      _tag: "Failure",
      error: parsedMoment.error._tag === "FutureMoment"
        ? "Een toekomstig consumptiemoment is niet toegestaan."
        : parsedMoment.error._tag === "AmbiguousMoment"
          ? "Dit tijdstip komt twee keer voor door de wintertijdwisseling. Kies een ander tijdstip."
          : "Dit tijdstip bestaat niet door de zomertijdwisseling.",
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
    return { _tag: "Failure", error: "Kies eerst een gerecht." };
  }
  const parsedQuantity = parsePositiveDecimal(input.quantity);
  if (parsedQuantity._tag === "Failure") {
    return { _tag: "Failure", error: "Vul een hoeveelheid porties groter dan nul in." };
  }
  return {
    _tag: "Success",
    payload: input.mode._tag === "Create"
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
function createProductSubmission(input: Extract<LogFormSubmissionInput, { readonly kind: "PACKAGE" }>, consumedAt: string): LogFormSubmissionResult {
  if (input.selectedPackage === null) {
    return { _tag: "Failure", error: "Kies eerst een productverpakking." };
  }
  const parsedQuantity = parsePositiveDecimal(input.quantity);
  if (parsedQuantity._tag === "Failure") {
    return { _tag: "Failure", error: "Vul een hoeveelheid groter dan nul in." };
  }
  const selectedUnit = input.availableUnits.find((unit) => createUnitKey(unit) === input.unitKey);
  if (selectedUnit === undefined) {
    return { _tag: "Failure", error: "Kies een beschikbare eenheid." };
  }
  const shared = {
    packageId: input.selectedPackage.packageId,
    quantity: parsedQuantity.value.canonical,
    inputMode: selectedUnit.inputMode,
    inputUnitTypeId: selectedUnit.unitType?.id ?? null,
    consumedAt,
  };
  return {
    _tag: "Success",
    payload: input.mode._tag === "Create"
      ? { id: input.clientId, type: "PRODUCT", ...shared }
      : { expectedUpdatedAt: input.mode.log.updatedAt, type: "PRODUCT", ...shared },
    requiresQuantityConfirmation: Number(parsedQuantity.value.canonical) >= 10_000,
  };
}
