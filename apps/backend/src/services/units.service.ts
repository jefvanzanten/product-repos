import type { CreateUnitTypeInput, UpdateUnitTypeInput } from "@product-repos/contracts";
import { findAllUnitTypes, findUnitTypeById } from "../repositories/units.repository";

export { findAllUnitTypes as getAllUnits, findUnitTypeById as getUnitById };
export function createNewUnit(_input: CreateUnitTypeInput) { return undefined; }
export function updateExistingUnit(_id: number, _input: UpdateUnitTypeInput) { return undefined; }
export function removeUnit(_id: number) { return undefined; }
