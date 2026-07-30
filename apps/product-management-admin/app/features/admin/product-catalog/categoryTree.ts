import type { CategoryDto } from "@product-repos/contracts";

/** A category option enriched with tree depth and full category path for selects. */
export type CategoryTreeOption = {
  /** The original category returned by the backend. */
  readonly category: CategoryDto;
  /** The zero-based tree depth derived from `parentId`. */
  readonly depth: number;
  /** The full parent path, for example `Voeding & drinken > Dranken > Frisdrank`. */
  readonly path: string;
};

/** Build category select options by walking parent-child relations into a tree order. */
export function buildCategoryTreeOptions(categories: ReadonlyArray<CategoryDto>): ReadonlyArray<CategoryTreeOption> {
  const childrenByParentId = new Map<number | null, CategoryDto[]>();
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
  childrenByParentId: ReadonlyMap<number | null, ReadonlyArray<CategoryDto>>,
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

function compareCategories(left: CategoryDto, right: CategoryDto): number {
  return left.name.localeCompare(right.name, "nl", { sensitivity: "base" }) || left.id - right.id;
}
