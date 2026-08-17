import type { Category } from "./product-catalog";

/** A category option enriched with tree depth and full category path for selects. */
export type CategoryTreeOption = {
  /** The original category returned by the backend. */
  readonly category: Category;
  /** The zero-based tree depth derived from `parentId`. */
  readonly depth: number;
  /** The full parent path, for example `Voeding & drinken > Dranken > Frisdrank`. */
  readonly path: string;
};

/**
 * Build an ordered root-to-category path from flat category references.
 *
 * @param categoryId - Leaf category identifier.
 * @param categories - Flat category collection.
 * @returns Root-to-leaf category path, safely truncated if a cycle exists.
 */
export function buildCategoryPath(categoryId: number, categories: ReadonlyArray<Category>): Category[] {
  const path: Category[] = [];
  const visited = new Set<number>();
  let current = categories.find((category) => category.id === categoryId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current = current.parentId === null ? undefined : categories.find((category) => category.id === current?.parentId);
  }
  return path;
}

/** Format a root-to-leaf category path. */
export function formatCategoryPath(path: ReadonlyArray<Category>): string {
  return path.map((category) => category.name).join(" > ");
}

/** Build category select options by walking parent-child relations into a tree order. */
export function buildCategoryTreeOptions(categories: ReadonlyArray<Category>): ReadonlyArray<CategoryTreeOption> {
  const childrenByParentId = new Map<number | null, Category[]>();
  for (const category of categories) {
    const siblings = childrenByParentId.get(category.parentId) ?? [];
    siblings.push(category);
    childrenByParentId.set(category.parentId, siblings);
  }
  for (const siblings of childrenByParentId.values()) siblings.sort(compareCategories);

  const options: CategoryTreeOption[] = [];
  const visited = new Set<number>();
  appendCategoryOptions(null, 0, "", childrenByParentId, visited, options);

  for (const orphan of [...categories].sort(compareCategories)) {
    if (visited.has(orphan.id)) continue;
    appendCategoryOptions(orphan.parentId, 0, "", childrenByParentId, visited, options);
  }

  return options;
}

/** Format a category tree option with indentation while keeping the full path visible. */
export function formatCategoryOption(option: CategoryTreeOption): string {
  return `${"\u00a0\u00a0".repeat(option.depth)}${option.path}`;
}

function appendCategoryOptions(
  parentId: number | null,
  depth: number,
  parentPath: string,
  childrenByParentId: ReadonlyMap<number | null, ReadonlyArray<Category>>,
  visited: Set<number>,
  options: CategoryTreeOption[],
): void {
  for (const child of childrenByParentId.get(parentId) ?? []) {
    if (visited.has(child.id)) continue;
    visited.add(child.id);
    const path = parentPath ? `${parentPath} > ${child.name}` : child.name;
    options.push({ category: child, depth, path });
    appendCategoryOptions(child.id, depth + 1, path, childrenByParentId, visited, options);
  }
}

function compareCategories(left: Category, right: Category): number {
  return left.name.localeCompare(right.name, "nl", { sensitivity: "base" }) || left.id - right.id;
}
