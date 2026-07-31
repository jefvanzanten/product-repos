import { calorieTracker } from "./calorie-tracker.ts";
import { closeDatabase } from "../db/index.ts";

/** Remove Calorie Tracker logs whose thirty-day retention period has elapsed. */
function cleanupDeletedLogs(): void {
  const result = calorieTracker.cleanupDeletedLogs();
  if (!result.ok) throw new Error(`Calorie Tracker cleanup failed: ${result.error.code}`);
  console.info("Calorie Tracker cleanup completed", {
    deletedCount: result.value.deletedCount,
    cutoffInclusive: result.value.cutoffInclusive,
  });
}

try {
  cleanupDeletedLogs();
} finally {
  closeDatabase();
}
