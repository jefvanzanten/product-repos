import type { CreateUnitTypeInput, UpdateUnitTypeInput } from '@product-repos/contracts';
import {
  createUnit,
  deleteUnit,
  findAllUnits,
  findUnitById,
  updateUnit,
} from '../repositories/units.repository';

export function getAllUnits() {
  return findAllUnits();
}

export function getUnitById(id: number) {
  return findUnitById(id);
}

export function createNewUnit(input: CreateUnitTypeInput) {
  return createUnit(input);
}

export function updateExistingUnit(id: number, input: UpdateUnitTypeInput) {
  return updateUnit(id, input);
}

export function removeUnit(id: number) {
  return deleteUnit(id);
}
