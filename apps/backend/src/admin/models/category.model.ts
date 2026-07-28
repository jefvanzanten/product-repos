import type { CategoryDto } from "@product-repos/contracts";

/** Category reference enriched with a readable path. */
export type CategoryWithPath = CategoryDto & {
  /** Full category path rendered as `Root > Child`. */
  readonly path: string;
};
