import type { ConsumptionLog, Dish, UnifiedSearchResult } from "@product-repos/contracts/calorie-tracker";
import type { TrackerUrlState } from "../../../domain/consumption-types";

/** Add/edit form route mode with current data when editing. */
export type LogFormMode =
  | { readonly _tag: "Create" }
  | { readonly _tag: "Edit"; readonly log: ConsumptionLog };

/** Data supplied by a protected create/edit route loader. */
export type LogFormLoaderData = {
  readonly timezone: string | null;
  readonly routeState: TrackerUrlState | null;
  readonly mode: LogFormMode | null;
  readonly initialResults: ReadonlyArray<UnifiedSearchResult>;
  readonly initialDish: Dish | null;
  readonly notFound: boolean;
  readonly loadFailed: boolean;
};

/** Result returned by a protected create/edit route action. */
export type LogFormActionResult =
  | { readonly ok: true; readonly log: ConsumptionLog }
  | { readonly ok: false; readonly error: string };
