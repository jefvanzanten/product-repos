import { useCategoryTreePicker } from "../../hooks/use-category-tree-picker";
import type { CategoryMutationResult, CategoryPickerErrors } from "../../types/category-tree-picker.types";
import type { CategoryTreeOption } from "../../utils/category-tree";
import { CategoryTreeRow } from "./category-tree-row";
import { InlineCategoryRow } from "./inline-category-row";
import styles from "./category-tree-picker.module.css";

type CategoryTreePickerProps = {
  readonly busy: boolean;
  readonly defaultValue?: string;
  readonly errors?: CategoryPickerErrors;
  readonly mutationErrors?: CategoryPickerErrors;
  readonly mutationResult?: CategoryMutationResult;
  readonly options: ReadonlyArray<CategoryTreeOption>;
  readonly selectedCategoryId: string;
  readonly onCreateCategory: (name: string, parentId: string | null) => void;
  readonly onDeleteCategory: (categoryId: number) => void;
  readonly onSelectedCategoryChange: (categoryId: string) => void;
};

/**
 * Render an expandable category picker with inline create and delete controls.
 *
 * @param props - Category data, selection, mutation state, and category commands.
 * @returns The category tree picker form control.
 */
export function CategoryTreePicker({ busy, defaultValue, errors, mutationErrors, mutationResult, onCreateCategory, onDeleteCategory, onSelectedCategoryChange, options, selectedCategoryId }: CategoryTreePickerProps): React.ReactNode {
  const picker = useCategoryTreePicker({
    defaultValue,
    mutationResult,
    onCreateCategory,
    onDeleteCategory,
    options,
    selectedCategoryId,
  });

  return (
    <div className={styles.categoryPicker}>
      <div className={styles.categoryHeader}><p className={styles.categoryHeaderTitle}>Bestaande categorie</p><button className={styles.categoryAddRootButton} type="button" onClick={() => picker.openInlineInput(null)}>+ hoofdcategorie</button></div>
      {!picker.selectedCategoryIsVisible && selectedCategoryId ? <input name="categoryId" type="hidden" value={selectedCategoryId} /> : null}
      <div className={styles.categoryTree} role="tree" aria-label="Categorieboom">
        {picker.inlineParentId === null ? <InlineCategoryRow busy={busy} depth={0} parentPath="hoofdcategorie" value={picker.inlineName} onCancel={picker.cancelInlineInput} onChange={picker.changeInlineName} onSubmit={picker.submitInlineCategory} /> : null}
        {picker.visibleOptions.map(({ option }, visibleIndex) => {
          const categoryId = String(option.category.id);
          return (
            <div key={option.category.id} className={styles.categoryGroup}>
              <CategoryTreeRow
                busy={busy}
                hasChildren={(picker.childCountByParentId.get(option.category.id) ?? 0) > 0}
                isExpanded={picker.expandedCategoryIds.has(categoryId)}
                isSelected={selectedCategoryId === categoryId}
                option={option}
                rowRef={defaultValue === categoryId ? picker.categoryToRevealRef : undefined}
                onAddChild={() => picker.openInlineInput(categoryId)}
                onDelete={() => picker.deleteCategory(option.category.id)}
                onSelect={() => onSelectedCategoryChange(categoryId)}
                onToggleExpanded={() => picker.toggleExpanded(option.category.id)}
              />
              {visibleIndex === picker.insertionVisibleIndex && picker.parentOption ? <InlineCategoryRow busy={busy} depth={picker.parentOption.depth + 1} parentPath={picker.parentOption.path} value={picker.inlineName} onCancel={picker.cancelInlineInput} onChange={picker.changeInlineName} onSubmit={picker.submitInlineCategory} /> : null}
            </div>
          );
        })}
      </div>
      {mutationErrors?.categoryName ? <span className={styles.errorText}>{mutationErrors.categoryName}</span> : null}
      {mutationErrors?.form ? <span className={styles.errorText}>{mutationErrors.form}</span> : null}
      {errors?.categoryId ? <span className={styles.errorText}>{errors.categoryId}</span> : null}
    </div>
  );
}
