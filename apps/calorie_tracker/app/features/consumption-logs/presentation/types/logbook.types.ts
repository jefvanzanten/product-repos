import type { ConsumptionLog } from "../../domain/consumption-log";
import type { TrackerUrlState } from "../../../../core/presentation/routing/tracker-url-state";

/** Explicit logbook content states prepared by the route boundary. */
export type LogbookContent =
  | { readonly tag: "EmptyDate" }
  | { readonly tag: "EmptyFilter" }
  | { readonly tag: "Ready"; readonly items: ReadonlyArray<ConsumptionLog> };

/** Data supplied by the protected logbook route loader. */
export type LogbookLoaderData = {
  readonly timezone: string | null;
  readonly routeState: TrackerUrlState | null;
  readonly content: LogbookContent | null;
  readonly loadFailed: boolean;
};

/** Result returned by the closed logbook restore action. */
export type LogbookActionResult =
  | { readonly ok: true; readonly log: ConsumptionLog }
  | { readonly ok: false; readonly error: string };
