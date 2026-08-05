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

type LogFormSubmissionInput = {
  readonly mode: LogFormMode;
  readonly selectedPackage: PackageSearchResult | null;
  readonly quantity: string;
  readonly availableUnits: ReadonlyArray<AvailableInputUnit>;
  readonly unitKey: string | null;
  readonly selectedDate: string;
  readonly time: string;
  readonly timezone: string;
  readonly initialMoment: FormMoment;
  readonly clientId: string;
};

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
  const shared = {
    packageId: input.selectedPackage.packageId,
    quantity: parsedQuantity.value.canonical,
    inputMode: selectedUnit.inputMode,
    inputUnitTypeId: selectedUnit.unitType?.id ?? null,
    consumedAt: parsedMoment.value,
  };
  return {
    _tag: "Success",
    payload: input.mode._tag === "Create"
      ? { id: input.clientId, ...shared }
      : { expectedUpdatedAt: input.mode.log.updatedAt, ...shared },
    requiresQuantityConfirmation: Number(parsedQuantity.value.canonical) >= 10_000,
  };
}
