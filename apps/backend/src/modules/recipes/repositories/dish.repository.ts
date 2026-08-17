import type { ConsumptionInputMode } from "@product-repos/contracts/calorie-tracker";

import { and, asc, desc, eq, inArray, isNotNull, isNull, max, or, sql } from "drizzle-orm";
import type { BackendDatabase } from "../../../db/index.ts";
import { consumptionLog, dish, dishConsumption, dishIngredient, dishVersion, user } from "../../../db/schema.ts";


/** Persistence representation of one user-owned dish stem. */
export type DishRecord = {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly visibility: "PRIVATE" | "PUBLIC";
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
};

/** Persistence representation of one immutable dish recipe version. */
export type DishVersionRecord = {
  readonly id: string;
  readonly dishId: string;
  readonly servings: string;
  readonly instructions: string | null;
  readonly createdAt: string;
};

/** Persistence representation of one ingredient inside a dish recipe version. */
export type DishIngredientRecord = {
  readonly id: string;
  readonly dishVersionId: string;
  readonly productId: string;
  readonly quantity: string;
  readonly inputMode: ConsumptionInputMode;
  readonly inputUnitTypeId: number | null;
};

/** One user-owned dish with its most recent consumption instant, used for recency ordering. */
export type RecentConsumedDish = {
  readonly dish: DishRecord;
  readonly lastConsumedAt: string;
};

/** Values required to insert a complete new dish with its first recipe version. */
export type InsertDishInput = {
  readonly dish: DishRecord;
  readonly version: DishVersionRecord;
  readonly ingredients: ReadonlyArray<DishIngredientRecord>;
};

/** Stem-only dish mutation values. */
export type UpdateDishStemInput = {
  readonly name: string;
  readonly imageUrl: string | null;
  readonly visibility?: DishRecord["visibility"];
  readonly updatedAt: string;
};

/** Filters and bounds used by recipe-facing dish list reads. */
export type RecipeDishListInput = {
  readonly userId?: string;
  readonly includePrivateForUserId?: string;
  readonly archived: boolean;
  readonly query: string;
  readonly sort: "newest" | "oldest" | "name";
  readonly offset: number;
  readonly limit: number;
};

/** Dish persistence operations. */
export type DishRepository = {
  /** Read any user's dish stem by globally unique identifier. */
  findDishById(dishId: string): DishRecord | undefined;
  /** List recipe-facing dish stems under visibility and archive constraints. */
  listRecipeDishes(input: RecipeDishListInput): ReadonlyArray<DishRecord>;
  /** Determine whether a non-deleted dish with the same normalized name exists for one user. */
  existsActiveDishWithName(userId: string, name: string): boolean;
  /** Insert a complete dish with its first version unless the name already exists. */
  insertDish(input: InsertDishInput): DishRecord | undefined;
  /** Update mutable stem fields of an active user-owned dish under optimistic concurrency. */
  updateDishStem(userId: string, dishId: string, expectedUpdatedAt: string, input: UpdateDishStemInput): DishRecord | undefined;
  /** Soft-delete an active user-owned dish without a restore flow. */
  softDeleteDish(userId: string, dishId: string, deletedAt: string, updatedAt: string): DishRecord | undefined;
  /** Archive an active user-owned dish. */
  archiveDish(userId: string, dishId: string, archivedAt: string): DishRecord | undefined;
  /** Restore an archived user-owned dish. */
  restoreDish(userId: string, dishId: string, updatedAt: string): DishRecord | undefined;
  /** Read the newest recipe version of one dish. */
  findNewestVersion(dishId: string): DishVersionRecord | undefined;
  /** Read only the recipe versions referenced by projected logs. */
  findVersionsByIds(versionIds: ReadonlyArray<string>): ReadonlyArray<DishVersionRecord>;
  /** Insert one immutable recipe version. */
  insertVersion(input: DishVersionRecord): DishVersionRecord;
  /** Read all ingredients of one recipe version in insertion order. */
  findIngredientsByVersionId(versionId: string): ReadonlyArray<DishIngredientRecord>;
  /** Read ingredients for every referenced recipe version. */
  findIngredientsByVersionIds(versionIds: ReadonlyArray<string>): ReadonlyArray<DishIngredientRecord>;
  /** Insert the ingredients of one recipe version atomically. */
  insertIngredients(input: ReadonlyArray<DishIngredientRecord>): void;
  /** Search dishes visible to one viewer by normalized name. */
  searchAccessibleDishes(viewerUserId: string, query: string, limit: number): ReadonlyArray<DishRecord>;
  /** Read the public display name of one dish maker. */
  findMakerDisplayName(userId: string): string | null;
  /** Read non-deleted user dishes ordered by their most recent consumption instant. */
  findRecentConsumedDishes(userId: string, limit: number): ReadonlyArray<RecentConsumedDish>;
};

/** Project one transition-era ingredient row into the v2 persistence shape. */
function toIngredientRecord(row: typeof dishIngredient.$inferSelect): ReadonlyArray<DishIngredientRecord> {
  if (row.productId === null) return [];
  const inputMode = row.inputMode;
  return [{
    id: row.id,
    dishVersionId: row.dishVersionId,
    productId: row.productId,
    quantity: row.quantity,
    inputMode,
    inputUnitTypeId: row.inputUnitTypeId,
  }];
}

/** Create user-owned dish persistence for one injected database. */
export function createDishRepository(db: BackendDatabase): DishRepository {
  /** Read any user's dish stem by globally unique identifier. */
  function findDishById(dishId: string): DishRecord | undefined {
    return db.select().from(dish).where(eq(dish.id, dishId)).get();
  }

  /** List dish stems for public and owner recipe pages. */
  function listRecipeDishes(input: RecipeDishListInput): ReadonlyArray<DishRecord> {
    const visibility = input.includePrivateForUserId === undefined
      ? eq(dish.visibility, "PUBLIC")
      : or(eq(dish.visibility, "PUBLIC"), eq(dish.userId, input.includePrivateForUserId));
    const userScope = input.userId === undefined ? undefined : eq(dish.userId, input.userId);
    const archiveScope = input.archived ? isNotNull(dish.archivedAt) : isNull(dish.archivedAt);
    const queryScope = input.query.length === 0
      ? undefined
      : sql<number>`instr(lower(${dish.name}), lower(${input.query})) > 0`;
    const order = input.sort === "oldest"
      ? [asc(dish.createdAt), asc(dish.id)]
      : input.sort === "name"
        ? [sql`${dish.name} COLLATE NOCASE`, asc(dish.id)]
        : [desc(dish.createdAt), desc(dish.id)];
    return db.select().from(dish).where(and(
      isNull(dish.deletedAt),
      visibility,
      userScope,
      archiveScope,
      queryScope,
    )).orderBy(...order).offset(input.offset).limit(input.limit).all();
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
    return db.update(dish).set({
      name: input.name,
      imageUrl: input.imageUrl,
      visibility: input.visibility,
      updatedAt: input.updatedAt,
    }).where(and(
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

  /** Archive an active owner recipe while preserving its visibility for restore. */
  function archiveDish(userId: string, dishId: string, archivedAt: string): DishRecord | undefined {
    return db.update(dish).set({ archivedAt, updatedAt: archivedAt }).where(and(
      eq(dish.id, dishId),
      eq(dish.userId, userId),
      isNull(dish.archivedAt),
      isNull(dish.deletedAt),
    )).returning().get();
  }

  /** Restore an archived owner recipe with its unchanged previous visibility. */
  function restoreDish(userId: string, dishId: string, updatedAt: string): DishRecord | undefined {
    return db.update(dish).set({ archivedAt: null, updatedAt }).where(and(
      eq(dish.id, dishId),
      eq(dish.userId, userId),
      isNotNull(dish.archivedAt),
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
    return db.select().from(dishIngredient).where(eq(dishIngredient.dishVersionId, versionId)).orderBy(asc(dishIngredient.id)).all()
      .flatMap(toIngredientRecord);
  }

  /** Read ingredients for every referenced recipe version. */
  function findIngredientsByVersionIds(versionIds: ReadonlyArray<string>): ReadonlyArray<DishIngredientRecord> {
    const distinctIds = [...new Set(versionIds)];
    if (distinctIds.length === 0) return [];
    return db.select().from(dishIngredient).where(inArray(dishIngredient.dishVersionId, distinctIds))
      .orderBy(asc(dishIngredient.dishVersionId), asc(dishIngredient.id)).all()
      .flatMap(toIngredientRecord);
  }

  /** Insert the ingredients of one recipe version atomically. */
  function insertIngredients(input: ReadonlyArray<DishIngredientRecord>): void {
    db.transaction((transaction) => {
      for (const ingredient of input) transaction.insert(dishIngredient).values(ingredient).run();
    });
  }

  /** Search active own and public dishes visible to one viewer in stable alphabetical order. */
  function searchAccessibleDishes(viewerUserId: string, query: string, limit: number): ReadonlyArray<DishRecord> {
    return db.select().from(dish).where(and(
      or(eq(dish.userId, viewerUserId), eq(dish.visibility, "PUBLIC")),
      isNull(dish.archivedAt),
      isNull(dish.deletedAt),
      sql<number>`instr(lower(${dish.name}), lower(${query})) > 0`,
    )).orderBy(sql`${dish.name} COLLATE NOCASE`, asc(dish.id)).limit(limit).all();
  }

  /** Read the maker display name without exposing account contact data. */
  function findMakerDisplayName(userId: string): string | null {
    return db.select({ name: user.name }).from(user).where(eq(user.id, userId)).get()?.name ?? null;
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
        isNull(dish.archivedAt),
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
    listRecipeDishes,
    existsActiveDishWithName,
    insertDish,
    updateDishStem,
    softDeleteDish,
    archiveDish,
    restoreDish,
    findNewestVersion,
    findVersionsByIds,
    insertVersion,
    findIngredientsByVersionId,
    findIngredientsByVersionIds,
    insertIngredients,
    searchAccessibleDishes,
    findMakerDisplayName,
    findRecentConsumedDishes,
  };
}
