import type { ConsumptionLog, LogFormMode, UnifiedSearchResult } from "../../domain/consumption-log";
import type { TrackerUrlState } from "../../../../core/presentation/routing/tracker-url-state";

export type { LogFormMode };

/** Data supplied by a protected create/edit route loader. */
export type LogFormLoaderData = {
  readonly timezone: string | null;
  readonly routeState: TrackerUrlState | null;
  readonly mode: LogFormMode | null;
  readonly initialResults: ReadonlyArray<UnifiedSearchResult>;
  readonly notFound: boolean;
  readonly loadFailed: boolean;
};

/** Result returned by a protected create/edit route action. */
export type LogFormActionResult =
  | { readonly ok: true; readonly log: ConsumptionLog }
  | { readonly ok: false; readonly error: string };
