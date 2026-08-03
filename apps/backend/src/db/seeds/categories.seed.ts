import { eq, sql } from "drizzle-orm";
import type { BackendDatabase } from "../index.ts";
import { category } from "../schema.ts";

type CategorySeedNode = {
  readonly name: string;
  readonly children?: ReadonlyArray<CategorySeedNode>;
};

const categoryTree: ReadonlyArray<CategorySeedNode> = [
  { name: "Voeding" },
  {
    name: "Drinken",
    children: [
      {
        name: "Frisdrank",
        children: [{ name: "Cola" }],
      },
      { name: "Koffie" },
      { name: "Thee" },
    ],
  },
  {
    name: "Supplementen",
    children: [
      { name: "Magnesium" },
      { name: "Magnesium supplement" },
    ],
  },
];

/** Seed a starter category tree for the product catalog. */
export async function seedCategories(database: BackendDatabase): Promise<number> {
  let checkedCategories = 0;

  for (const root of categoryTree) {
    checkedCategories += await seedCategoryNode(database, root, null);
  }

  return checkedCategories;
}

async function seedCategoryNode(database: BackendDatabase, node: CategorySeedNode, parentId: number | null): Promise<number> {
  const current = findOrCreateCategory(database, node.name, parentId);
  let checkedCategories = 1;

  for (const child of node.children ?? []) {
    checkedCategories += await seedCategoryNode(database, child, current.id);
  }

  return checkedCategories;
}

function findOrCreateCategory(database: BackendDatabase, name: string, parentId: number | null): typeof category.$inferSelect {
  const normalizedName = name.trim().toLowerCase();
  const categoryUnderExpectedParent = findCategoryByNormalizedNameAndParent(database, normalizedName, parentId);
  if (categoryUnderExpectedParent) return categoryUnderExpectedParent;

  const existingMisplacedCategory = database.select().from(category).where(sql`lower(trim(${category.name})) = ${normalizedName}`).get();
  if (existingMisplacedCategory) return moveCategoryToParent(database, existingMisplacedCategory.id, parentId);

  return database.insert(category).values({ name, parentId }).returning().get();
}

function findCategoryByNormalizedNameAndParent(database: BackendDatabase, normalizedName: string, parentId: number | null): typeof category.$inferSelect | undefined {
  return parentId === null
    ? database.select().from(category).where(sql`${category.parentId} IS NULL AND lower(trim(${category.name})) = ${normalizedName}`).get()
    : database.select().from(category).where(sql`${category.parentId} = ${parentId} AND lower(trim(${category.name})) = ${normalizedName}`).get();
}

function moveCategoryToParent(database: BackendDatabase, categoryId: number, parentId: number | null): typeof category.$inferSelect {
  return database.update(category).set({ parentId }).where(eq(category.id, categoryId)).returning().get();
}
