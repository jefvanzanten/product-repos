import { createBackendRuntime } from "../composition.ts";
import { loadBackendConfig } from "../config.ts";

const runtime = createBackendRuntime(loadBackendConfig(process.env));
try {
  const result = runtime.cleanupDeletedConsumptionLogs();
  if (!result.ok) throw new Error(`Calorie Tracker cleanup failed: ${result.error.code}`);
  console.info("Calorie Tracker cleanup completed", {
    deletedCount: result.value.deletedCount,
    cutoffInclusive: result.value.cutoffInclusive,
  });
} finally {
  runtime.close();
}
