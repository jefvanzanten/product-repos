import { eq } from 'drizzle-orm';
import { consumptions } from '@product-repos/db-schema';
import type { CreateConsumptionInput, UpdateConsumptionInput } from '@product-repos/contracts';
import { db } from '../db/index';

export function findAllConsumptions() {
  return db.select().from(consumptions).all();
}

export function findConsumptionById(id: number) {
  return db.select().from(consumptions).where(eq(consumptions.id, id)).get();
}

export function createConsumption(input: CreateConsumptionInput) {
  return db.insert(consumptions).values(input).returning().get();
}

export function updateConsumption(id: number, input: UpdateConsumptionInput) {
  return db.update(consumptions).set(input).where(eq(consumptions.id, id)).returning().get();
}

export function deleteConsumption(id: number) {
  return db.delete(consumptions).where(eq(consumptions.id, id)).returning().get();
}
