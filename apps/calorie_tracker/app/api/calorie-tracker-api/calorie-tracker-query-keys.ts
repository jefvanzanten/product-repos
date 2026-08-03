import type { ConsumptionTypeFilter } from "@product-repos/contracts/calorie-tracker";

/** Central TanStack Query keys for every Calorie Tracker response dimension. */
export const calorieTrackerQueryKeys = {
  /** All log lists for one local date. */
  logListsForDate: (date: string) => ["calorie-tracker", "logs", date] as const,
  /** Date/filter/timezone-scoped log list key. */
  logs: (date: string, type: ConsumptionTypeFilter, timezone: string) =>
    ["calorie-tracker", "logs", date, type, timezone] as const,
  /** Private log-detail key. */
  log: (logId: string) => ["calorie-tracker", "log", logId] as const,
  /** All package-search and recent-package queries. */
  packageSearches: ["calorie-tracker", "packages"] as const,
  /** Package search or recent-package key. */
  packages: (mode: string) => ["calorie-tracker", "packages", mode] as const,
  /** Available-input-unit key for one package. */
  packageUnits: (packageId: number | null) => ["calorie-tracker", "package-units", packageId] as const,
  /** Every timezone projection of statistics for one stored local date. */
  statisticsForDate: (date: string) => ["calorie-tracker", "statistics", date] as const,
  /** Date/timezone-scoped daily statistics key. */
  statistics: (date: string, timezone: string) => ["calorie-tracker", "statistics", date, timezone] as const,
} as const;
