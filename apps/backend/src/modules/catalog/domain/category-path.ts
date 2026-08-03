/** Minimal category hierarchy data required to construct a path. */
export type CategoryPathNode = {
  readonly id: number;
  readonly name: string;
  readonly parentId: number | null;
};

/** Find a root-to-category path while bounding missing and cyclic references. */
export function findCategoryPath<T extends CategoryPathNode>(categoryId: number, categories: ReadonlyArray<T>): T[] {
  const categoryById = new Map(categories.map((row) => [row.id, row]));
  const path: T[] = [];
  const visited = new Set<number>();
  let current = categoryById.get(categoryId);
  while (current !== undefined && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current = current.parentId === null ? undefined : categoryById.get(current.parentId);
  }
  return path;
}

/** Format a root-to-category path for catalog presentation and search. */
export function formatCategoryPath(path: ReadonlyArray<CategoryPathNode>): string {
  return path.map((row) => row.name).join(" > ");
}
