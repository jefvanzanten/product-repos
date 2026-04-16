import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { brands, consumptions, consumptionLogs, products, unitType } from '@product-repos/db-schema';
import type { CreateConsumptionLogInput } from '@product-repos/contracts';
import { db } from '../db/index';

const logUnitAlias = alias(unitType, 'logUnit');

function withRelationsQuery() {
  return db
    .select({
      id: consumptionLogs.id,
      productId: consumptionLogs.productId,
      timestamp: consumptionLogs.timestamp,
      amount: consumptionLogs.amount,
      unitsId: consumptionLogs.unitsId,
      brand: brands,
      consumption: consumptions,
      unit: logUnitAlias,
    })
    .from(consumptionLogs)
    .leftJoin(products, eq(consumptionLogs.productId, products.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(consumptions, eq(products.consumptionsId, consumptions.id))
    .leftJoin(logUnitAlias, eq(consumptionLogs.unitsId, logUnitAlias.id));
}

export function findAllConsumptionLogs() {
  return withRelationsQuery().all();
}

export function createConsumptionLog(input: CreateConsumptionLogInput) {
  return db.insert(consumptionLogs).values(input).returning().get();
}
