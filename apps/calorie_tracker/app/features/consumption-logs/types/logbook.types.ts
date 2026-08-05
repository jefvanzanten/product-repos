import type { ConsumptionLog } from "@product-repos/contracts/calorie-tracker";
import type { TrackerUrlState } from "../../../domain/consumption-types";

/** Explicit logbook content states prepared by the route boundary. */
export type LogbookContent =
  | { readonly _tag: "EmptyDate" }
  | { readonly _tag: "EmptyFilter" }
  | { readonly _tag: "Ready"; readonly items: ReadonlyArray<ConsumptionLog> };

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
