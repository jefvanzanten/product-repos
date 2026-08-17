import type { DailyStatistics } from "../../domain/statistics";
import type { TrackerUrlState } from "../../../../core/presentation/routing/tracker-url-state";

/** Data supplied by the statistics route boundary. */
export type StatisticsLoaderData = {
  readonly timezone: string | null;
  readonly routeState: TrackerUrlState | null;
  readonly statistics: DailyStatistics | null;
  readonly loadFailed: boolean;
};

/** Closed result returned by the nutrition-goals route action. */
export type StatisticsActionResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };
