import { asc, eq, sql } from "drizzle-orm";
import type { BackendDatabase } from "../../../db/index.ts";
import { category, product } from "../../../db/schema";
import { err, ok, type Result } from "../domain/catalog-domain.ts";

export type CategoryRow = typeof category.$inferSelect;

/** Category persistence operations used by catalog services. */
export type CategoryRepository = {
  readonly findAllCategories: () => CategoryRow[];
  readonly findCategoryById: (id: number) => CategoryRow | undefined;
  readonly createCategory: (input: { readonly name: string; readonly parentId: number | null }) => Result<CategoryRow>;
  readonly updateCategoryName: (id: number, name: string) => Result<CategoryRow>;
  readonly deleteCategory: (id: number) => Result<{ readonly id: number }>;
};

/** Create category persistence operations for one injected database. */
export function createDrizzleCategoryRepository(database: BackendDatabase): CategoryRepository {

function findAllCategories(): CategoryRow[] {
  return database.select().from(category).orderBy(asc(category.parentId), asc(sql`lower(${category.name})`)).all();
}

function findCategoryById(id: number) {
  return database.select().from(category).where(eq(category.id, id)).get();
}

function createCategory(input: { readonly name: string; readonly parentId: number | null }): Result<typeof category.$inferSelect> {
  if (input.parentId !== null && !findCategoryById(input.parentId)) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });
  const normalizedName = input.name.trim().toLowerCase();
  const duplicate = input.parentId === null
    ? database.select().from(category).where(sql`${category.parentId} IS NULL AND lower(trim(${category.name})) = ${normalizedName}`).get()
    : database.select().from(category).where(sql`${category.parentId} = ${input.parentId} AND lower(trim(${category.name})) = ${normalizedName}`).get();
  if (duplicate) return err({ code: "CATEGORY_ALREADY_EXISTS", message: "Category already exists" });
  return ok(database.insert(category).values(input).returning().get());
}

function updateCategoryName(id: number, name: string): Result<typeof category.$inferSelect> {
  const existing = findCategoryById(id);
  if (!existing) return err({ code: "REFERENCE_NOT_FOUND", message: "Category not found" });

  const normalizedName = name.trim().toLowerCase();
  const duplicate = existing.parentId === null
    ? database.select().from(category).where(sql`${category.parentId} IS NULL AND ${category.id} <> ${id} AND lower(trim(${category.name})) = ${normalizedName}`).get()
    : database.select().from(category).where(sql`${category.parentId} = ${existing.parentId} AND ${category.id} <> ${id} AND lower(trim(${category.name})) = ${normalizedName}`).get();
  if (duplicate) return err({ code: "CATEGORY_ALREADY_EXISTS", message: "Category already exists" });

  return ok(database.update(category).set({ name }).where(eq(category.id, id)).returning().get());
}

function deleteCategory(id: number): Result<{ readonly id: number }> {
  if (!findCategoryById(id)) return err({ code: "REFERENCE_NOT_FOUND", message: "Category not found" });

  const child = database.select({ id: category.id }).from(category).where(eq(category.parentId, id)).get();
  if (child) return err({ code: "CATEGORY_HAS_CHILDREN", message: "Category still has subcategories" });

  const linkedProduct = database.select({ id: product.id }).from(product).where(eq(product.categoryId, id)).get();
  if (linkedProduct) return err({ code: "CATEGORY_HAS_PRODUCTS", message: "Category is still used by products" });

  database.delete(category).where(eq(category.id, id)).run();
  return ok({ id });
}

  return { findAllCategories, findCategoryById, createCategory, updateCategoryName, deleteCategory };
}
