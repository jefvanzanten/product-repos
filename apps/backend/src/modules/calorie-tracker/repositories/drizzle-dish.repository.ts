import { and, asc, desc, eq, inArray, isNull, max, sql } from "drizzle-orm";
import type { BackendDatabase } from "../../../db/index.ts";
import { consumptionLog, dish, dishConsumption, dishIngredient, dishVersion } from "../../../db/schema.ts";
import type {
  DishIngredientRecord,
  DishRecord,
  DishRepository,
  DishVersionRecord,
  InsertDishInput,
  RecentConsumedDish,
  UpdateDishStemInput,
} from "./calorie-tracker-store.ts";

/** Create user-owned dish persistence for one injected database. */
export function createDrizzleDishRepository(db: BackendDatabase): DishRepository {
  /** Read any user's dish stem by globally unique identifier. */
  function findDishById(dishId: string): DishRecord | undefined {
    return db.select().from(dish).where(eq(dish.id, dishId)).get();
  }

  /** Determine whether a non-deleted dish with the same normalized name exists for one user. */
  function existsActiveDishWithName(userId: string, name: string): boolean {
    const row = db.select({ id: dish.id }).from(dish).where(and(
      eq(dish.userId, userId),
      isNull(dish.deletedAt),
      sql`lower(trim(${dish.name})) = lower(trim(${name}))`,
    )).get();
    return row !== undefined;
  }

  /** Insert a complete dish with its first version unless the name already exists. */
  function insertDish(input: InsertDishInput): DishRecord | undefined {
    return db.transaction((transaction) => {
      const storedDish = transaction.insert(dish).values(input.dish).onConflictDoNothing().returning().get();
      if (storedDish === undefined) return undefined;
      transaction.insert(dishVersion).values(input.version).run();
      for (const ingredient of input.ingredients) transaction.insert(dishIngredient).values(ingredient).run();
      return storedDish;
    });
  }

  /** Update mutable stem fields of an active user-owned dish under optimistic concurrency. */
  function updateDishStem(userId: string, dishId: string, expectedUpdatedAt: string, input: UpdateDishStemInput): DishRecord | undefined {
    return db.update(dish).set({ name: input.name, imageUrl: input.imageUrl, updatedAt: input.updatedAt }).where(and(
      eq(dish.id, dishId),
      eq(dish.userId, userId),
      eq(dish.updatedAt, expectedUpdatedAt),
      isNull(dish.deletedAt),
    )).returning().get();
  }

  /** Soft-delete an active user-owned dish without a restore flow. */
  function softDeleteDish(userId: string, dishId: string, deletedAt: string, updatedAt: string): DishRecord | undefined {
    return db.update(dish).set({ deletedAt, updatedAt }).where(and(
      eq(dish.id, dishId),
      eq(dish.userId, userId),
      isNull(dish.deletedAt),
    )).returning().get();
  }

  /** Read the newest recipe version of one dish. */
  function findNewestVersion(dishId: string): DishVersionRecord | undefined {
    return db.select().from(dishVersion).where(eq(dishVersion.dishId, dishId))
      .orderBy(desc(dishVersion.createdAt), desc(dishVersion.id)).get();
  }

  /** Read only the recipe versions referenced by projected logs. */
  function findVersionsByIds(versionIds: ReadonlyArray<string>): ReadonlyArray<DishVersionRecord> {
    const distinctIds = [...new Set(versionIds)];
    if (distinctIds.length === 0) return [];
    return db.select().from(dishVersion).where(inArray(dishVersion.id, distinctIds)).orderBy(asc(dishVersion.id)).all();
  }

  /** Insert one immutable recipe version. */
  function insertVersion(input: DishVersionRecord): DishVersionRecord {
    return db.insert(dishVersion).values(input).returning().get();
  }

  /** Read all ingredients of one recipe version in insertion order. */
  function findIngredientsByVersionId(versionId: string): ReadonlyArray<DishIngredientRecord> {
    return db.select().from(dishIngredient).where(eq(dishIngredient.dishVersionId, versionId)).orderBy(asc(dishIngredient.id)).all();
  }

  /** Read ingredients for every referenced recipe version. */
  function findIngredientsByVersionIds(versionIds: ReadonlyArray<string>): ReadonlyArray<DishIngredientRecord> {
    const distinctIds = [...new Set(versionIds)];
    if (distinctIds.length === 0) return [];
    return db.select().from(dishIngredient).where(inArray(dishIngredient.dishVersionId, distinctIds))
      .orderBy(asc(dishIngredient.dishVersionId), asc(dishIngredient.id)).all();
  }

  /** Insert the ingredients of one recipe version atomically. */
  function insertIngredients(input: ReadonlyArray<DishIngredientRecord>): void {
    db.transaction((transaction) => {
      for (const ingredient of input) transaction.insert(dishIngredient).values(ingredient).run();
    });
  }

  /** Search non-deleted user dishes by name in stable alphabetical order. */
  function searchActiveUserDishes(userId: string, query: string, limit: number): ReadonlyArray<DishRecord> {
    return db.select().from(dish).where(and(
      eq(dish.userId, userId),
      isNull(dish.deletedAt),
      sql<number>`instr(lower(${dish.name}), lower(${query})) > 0`,
    )).orderBy(sql`${dish.name} COLLATE NOCASE`, asc(dish.id)).limit(limit).all();
  }

  /** Read non-deleted user dishes ordered by their most recent consumption instant. */
  function findRecentConsumedDishes(userId: string, limit: number): ReadonlyArray<RecentConsumedDish> {
    const rows = db.select({
      dishId: dish.id,
      lastConsumedAt: max(consumptionLog.consumedAt),
    }).from(consumptionLog)
      .innerJoin(dishConsumption, eq(dishConsumption.consumptionLogId, consumptionLog.id))
      .innerJoin(dishVersion, eq(dishConsumption.dishVersionId, dishVersion.id))
      .innerJoin(dish, eq(dishVersion.dishId, dish.id))
      .where(and(
        eq(consumptionLog.userId, userId),
        isNull(consumptionLog.deletedAt),
        isNull(dish.deletedAt),
      ))
      .groupBy(dish.id)
      .orderBy(desc(max(consumptionLog.consumedAt)), desc(dish.id))
      .limit(limit)
      .all();
    const dishesById = new Map(
      rows.length === 0 ? [] : db.select().from(dish).where(inArray(dish.id, rows.map((row) => row.dishId))).all().map((row) => [row.id, row]),
    );
    return rows.flatMap((row) => {
      const storedDish = dishesById.get(row.dishId);
      if (storedDish === undefined || storedDish.deletedAt !== null || row.lastConsumedAt === null) return [];
      return [{ dish: storedDish, lastConsumedAt: row.lastConsumedAt }];
    });
  }

  return {
    findDishById,
    existsActiveDishWithName,
    insertDish,
    updateDishStem,
    softDeleteDish,
    findNewestVersion,
    findVersionsByIds,
    insertVersion,
    findIngredientsByVersionId,
    findIngredientsByVersionIds,
    insertIngredients,
    searchActiveUserDishes,
    findRecentConsumedDishes,
  };
}
