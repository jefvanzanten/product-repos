import type { ConsumptionLog, DeleteLogResult } from "../../domain/consumption-log";
import type { TrackerUrlState } from "../../../../core/presentation/routing/tracker-url-state";

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
