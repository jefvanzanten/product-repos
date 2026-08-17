import {
  createConsumptionLogSchema,
  updateConsumptionLogSchema,
} from "@product-repos/contracts/calorie-tracker";
import type { CreateConsumptionLog, UpdateConsumptionLog } from "../domain/consumption-log";

/** Parse an untrusted create-log transport payload. */
export function parseCreateConsumptionLog(input: unknown): CreateConsumptionLog | null {
  const result = createConsumptionLogSchema.safeParse(input);
  return result.success ? result.data : null;
}

/** Parse an untrusted update-log transport payload. */
export function parseUpdateConsumptionLog(input: unknown): UpdateConsumptionLog | null {
  const result = updateConsumptionLogSchema.safeParse(input);
  return result.success ? result.data : null;
}
