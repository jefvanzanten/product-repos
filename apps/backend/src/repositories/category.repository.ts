import type { CatalogCategoryRow, CategoryDto } from "@product-repos/contracts";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "../db/index";
import { category, product } from "../db/schema";
import { err, ok, type Result } from "../domain";
import { isSqliteUniqueConstraintViolation } from "../helpers/sqlite-errors";

export type CategoryContext = {
  readonly categoryRows: ReadonlyArray<CatalogCategoryRow>;
  readonly pathById: ReadonlyMap<number, string>;
  readonly pathItemsById: ReadonlyMap<number, ReadonlyArray<CategoryDto>>;
  readonly rowById: ReadonlyMap<number, CatalogCategoryRow>;
};

export function findAllCategories() {
  return db.select().from(category).orderBy(asc(category.parentId), asc(sql`lower(${category.name})`)).all();
}

export function findCategoryById(id: number) {
  return db.select().from(category).where(eq(category.id, id)).get();
}

export function createCategory(input: { readonly name: string; readonly parentId: number | null }): Result<typeof category.$inferSelect> {
  if (input.parentId !== null && !findCategoryById(input.parentId)) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });
  if (findDuplicateSiblingCategory({ categoryId: null, name: input.name, parentId: input.parentId })) return err({ code: "CATEGORY_ALREADY_EXISTS", message: "Category already exists" });
  try {
    return ok(db.insert(category).values(input).returning().get());
  } catch (error) {
    if (isSqliteUniqueConstraintViolation(error)) return err({ code: "CATEGORY_ALREADY_EXISTS", message: "Category already exists" });
    throw error;
  }
}

/** Rename an existing category while preserving sibling-name uniqueness. */
export function updateCategoryName(input: { readonly id: number; readonly name: string }): Result<typeof category.$inferSelect> {
  const current = findCategoryById(input.id);
  if (!current) return err({ code: "REFERENCE_NOT_FOUND", message: "Category not found" });
  if (findDuplicateSiblingCategory({ categoryId: input.id, name: input.name, parentId: current.parentId })) return err({ code: "CATEGORY_ALREADY_EXISTS", message: "Category already exists" });
  try {
    return ok(db.update(category).set({ name: input.name }).where(eq(category.id, input.id)).returning().get());
  } catch (error) {
    if (isSqliteUniqueConstraintViolation(error)) return err({ code: "CATEGORY_ALREADY_EXISTS", message: "Category already exists" });
    throw error;
  }
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

export function buildCatalogCategoryContext(): CategoryContext {
  const categoryRows = findAllCategories();
  const pathById = new Map<number, string>();
  const pathItemsById = new Map<number, ReadonlyArray<CategoryDto>>();
  const rowById = new Map<number, CatalogCategoryRow>();

  for (const categoryRow of categoryRows) {
    const pathItems = findCategoryPath(categoryRow.id);
    const path = pathItems.map((item) => item.name).join(" > ");
    pathById.set(categoryRow.id, path);
    pathItemsById.set(categoryRow.id, pathItems);
  }

  for (const categoryRow of categoryRows) {
    const catalogRow = makeCatalogCategoryRow(categoryRow, { pathById });
    rowById.set(categoryRow.id, catalogRow);
  }

  return { categoryRows: [...rowById.values()], pathById, pathItemsById, rowById };
}

export function findCatalogCategoryRowById(categoryId: number, categoryContext: Pick<CategoryContext, "pathById" | "rowById">): CatalogCategoryRow | undefined {
  const cachedRow = categoryContext.rowById.get(categoryId);
  if (cachedRow) return cachedRow;

  const categoryRow = findCategoryById(categoryId);
  return categoryRow ? makeCatalogCategoryRow(categoryRow, categoryContext) : undefined;
}

export function findCatalogCategoryByPath(path: string, categoryContext: Pick<CategoryContext, "pathById" | "pathItemsById">): CategoryDto | null {
  for (const [categoryId, categoryPath] of categoryContext.pathById.entries()) {
    if (categoryPath !== path) continue;
    const categoryItems = categoryContext.pathItemsById.get(categoryId) ?? [];
    const lastItem = categoryItems.at(-1);
    return lastItem ? { id: lastItem.id, name: lastItem.name, parentId: lastItem.parentId } : null;
  }
  return null;
}

export function findCategoryPath(categoryId: number): CategoryDto[] {
  const path: CategoryDto[] = [];
  const visitedCategoryIds = new Set<number>();
  let current = findCategoryById(categoryId);

  while (current) {
    if (visitedCategoryIds.has(current.id)) break;
    visitedCategoryIds.add(current.id);
    path.unshift({ id: current.id, name: current.name, parentId: current.parentId });
    if (current.parentId === null) break;
    current = findCategoryById(current.parentId);
  }

  return path;
}

function makeCatalogCategoryRow(categoryRow: CategoryDto, categoryContext: Pick<CategoryContext, "pathById">): CatalogCategoryRow {
  return {
    id: categoryRow.id,
    name: categoryRow.name,
    parentId: categoryRow.parentId,
    path: categoryContext.pathById.get(categoryRow.id) ?? categoryRow.name,
    productCount: countProductsInCategorySubtree(categoryRow.id),
  };
}

function countProductsInCategorySubtree(categoryId: number): number {
  const descendantIds = findDescendantCategoryIds(categoryId);
  if (descendantIds.length === 0) return 0;
  const placeholders = sql.join(descendantIds.map((id) => sql`${id}`), sql`, `);
  const row = db.select({ count: sql<number>`count(*)` }).from(product).where(sql`${product.categoryId} IN (${placeholders})`).get();
  return row?.count ?? 0;
}

function findDescendantCategoryIds(categoryId: number): number[] {
  const allCategories = db.select().from(category).all();
  const descendants = [categoryId];
  for (let index = 0; index < descendants.length; index += 1) {
    const parentId = descendants[index];
    if (parentId === undefined) continue;
    for (const categoryRow of allCategories) {
      if (categoryRow.parentId === parentId) descendants.push(categoryRow.id);
    }
  }
  return descendants;
}

function findDuplicateSiblingCategory(input: { readonly categoryId: number | null; readonly name: string; readonly parentId: number | null }) {
  const normalizedName = input.name.trim().toLowerCase();
  const excludedCategorySql = input.categoryId === null ? sql`1 = 1` : sql`${category.id} <> ${input.categoryId}`;
  return input.parentId === null
    ? db.select().from(category).where(sql`${excludedCategorySql} AND ${category.parentId} IS NULL AND lower(trim(${category.name})) = ${normalizedName}`).get()
    : db.select().from(category).where(sql`${excludedCategorySql} AND ${category.parentId} = ${input.parentId} AND lower(trim(${category.name})) = ${normalizedName}`).get();
}
