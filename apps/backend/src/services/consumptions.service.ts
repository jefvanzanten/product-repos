import type { CreateConsumptionInput, UpdateConsumptionInput } from '@product-repos/contracts';
import {
  createConsumption,
  deleteConsumption,
  findAllConsumptions,
  findConsumptionById,
  updateConsumption,
} from '../repositories/consumptions.repository';

export function getAllConsumptions() {
  return findAllConsumptions();
}

export function getConsumptionById(id: number) {
  return findConsumptionById(id);
}

export function createNewConsumption(input: CreateConsumptionInput) {
  return createConsumption(input);
}

export function updateExistingConsumption(id: number, input: UpdateConsumptionInput) {
  return updateConsumption(id, input);
}

export function removeConsumption(id: number) {
  return deleteConsumption(id);
}
