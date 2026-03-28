import { eq } from 'drizzle-orm';
import { unitType } from '@product-repos/db-schema';
import type { CreateUnitTypeInput, UpdateUnitTypeInput } from '@product-repos/contracts';
import { db } from '../db/index';

export function findAllUnits() {
  return db.select().from(unitType).all();
}

export function findUnitById(id: number) {
  return db.select().from(unitType).where(eq(unitType.id, id)).get();
}

export function createUnit(input: CreateUnitTypeInput) {
  return db.insert(unitType).values(input).returning().get();
}

export function updateUnit(id: number, input: UpdateUnitTypeInput) {
  return db.update(unitType).set(input).where(eq(unitType.id, id)).returning().get();
}

export function deleteUnit(id: number) {
  return db.delete(unitType).where(eq(unitType.id, id)).returning().get();
}
