import type { ConsumptionLog, DeleteLogResult } from "@product-repos/contracts/calorie-tracker";
import type { TrackerUrlState } from "../../../domain/consumption-types";

/** Data supplied by the protected log-detail loader. */
export type LogDetailLoaderData = {
  readonly timezone: string | null;
  readonly routeState: TrackerUrlState | null;
  readonly log: ConsumptionLog | null;
  readonly notFound: boolean;
  readonly loadFailed: boolean;
};

/** Result returned by the protected log-delete action. */
export type LogDetailActionResult =
  | { readonly ok: true; readonly result: DeleteLogResult }
  | { readonly ok: false; readonly error: string };
