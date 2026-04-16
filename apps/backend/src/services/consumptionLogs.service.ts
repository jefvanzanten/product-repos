import type { CreateConsumptionLogInput } from '@product-repos/contracts';
import {
  createConsumptionLog,
  findAllConsumptionLogs,
} from '../repositories/consumptionLogs.repository';

export function getAllConsumptionLogs() {
  return findAllConsumptionLogs();
}

export function createNewConsumptionLog(input: CreateConsumptionLogInput) {
  return createConsumptionLog(input);
}
