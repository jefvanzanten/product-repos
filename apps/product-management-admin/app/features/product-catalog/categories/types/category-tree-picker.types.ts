import type { CategoryDto } from "@product-repos/contracts";

/** Validation errors that can be displayed by the category picker. */
export type CategoryPickerErrors = Readonly<Record<string, string>>;

/** Result of a category mutation relevant to category selection and tree state. */
export type CategoryMutationResult = {
  readonly createdCategory?: CategoryDto;
  readonly deletedCategoryId?: number;
};
