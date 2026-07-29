import { asc, eq, sql } from "drizzle-orm";
import { db } from "../db/index";
import { category, product } from "../db/schema";
import { err, ok, type Result } from "../domain";

export type CategoryRow = typeof category.$inferSelect;

export function findAllCategories(): CategoryRow[] {
  return db.select().from(category).orderBy(asc(category.parentId), asc(sql`lower(${category.name})`)).all();
}

export function findCategoryById(id: number) {
  return db.select().from(category).where(eq(category.id, id)).get();
}

export function findCategoryPath(categoryId: number, categories: ReadonlyArray<CategoryRow>): CategoryRow[] {
  const categoryById = new Map(categories.map((row) => [row.id, row]));
  const path: CategoryRow[] = [];
  const visited = new Set<number>();
  let current = categoryById.get(categoryId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current = current.parentId === null ? undefined : categoryById.get(current.parentId);
  }
  return path;
}

export function formatCategoryPath(path: ReadonlyArray<CategoryRow>): string {
  return path.map((row) => row.name).join(" > ");
}

export function createCategory(input: { readonly name: string; readonly parentId: number | null }): Result<typeof category.$inferSelect> {
  if (input.parentId !== null && !findCategoryById(input.parentId)) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });
  const normalizedName = input.name.trim().toLowerCase();
  const duplicate = input.parentId === null
    ? db.select().from(category).where(sql`${category.parentId} IS NULL AND lower(trim(${category.name})) = ${normalizedName}`).get()
    : db.select().from(category).where(sql`${category.parentId} = ${input.parentId} AND lower(trim(${category.name})) = ${normalizedName}`).get();
  if (duplicate) return err({ code: "CATEGORY_ALREADY_EXISTS", message: "Category already exists" });
  return ok(db.insert(category).values(input).returning().get());
}

export function updateCategoryName(id: number, name: string): Result<typeof category.$inferSelect> {
  const existing = findCategoryById(id);
  if (!existing) return err({ code: "REFERENCE_NOT_FOUND", message: "Category not found" });

  const normalizedName = name.trim().toLowerCase();
  const duplicate = existing.parentId === null
    ? db.select().from(category).where(sql`${category.parentId} IS NULL AND ${category.id} <> ${id} AND lower(trim(${category.name})) = ${normalizedName}`).get()
    : db.select().from(category).where(sql`${category.parentId} = ${existing.parentId} AND ${category.id} <> ${id} AND lower(trim(${category.name})) = ${normalizedName}`).get();
  if (duplicate) return err({ code: "CATEGORY_ALREADY_EXISTS", message: "Category already exists" });

  return ok(db.update(category).set({ name }).where(eq(category.id, id)).returning().get());
}

export function deleteCategory(id: number): Result<{ readonly id: number }> {
  if (!findCategoryById(id)) return err({ code: "REFERENCE_NOT_FOUND", message: "Category not found" });

  const child = db.select({ id: category.id }).from(category).where(eq(category.parentId, id)).get();
  if (child) return err({ code: "CATEGORY_HAS_CHILDREN", message: "Category still has subcategories" });

  const linkedProduct = db.select({ id: product.id }).from(product).where(eq(product.categoryId, id)).get();
  if (linkedProduct) return err({ code: "CATEGORY_HAS_PRODUCTS", message: "Category is still used by products" });

  db.delete(category).where(eq(category.id, id)).run();
  return ok({ id });
}
