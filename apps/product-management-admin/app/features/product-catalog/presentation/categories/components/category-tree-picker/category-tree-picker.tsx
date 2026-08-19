import { useLayoutEffect, useRef } from "react";
import { TreePickerRow } from "@product-repos/shared/tree";
import { useCategoryTreePicker } from "../../hooks/use-category-tree-picker";
import type { CategoryMutationResult, CategoryPickerErrors } from "../../types/category-tree-picker.types";
import type { CategoryTreeOption } from "../../../../domain/category-tree";
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
export function CategoryTreePicker({ defaultValue, errors, mutationResult, onCreateCategory, onDeleteCategory, onSelectedCategoryChange, options, selectedCategoryId }: CategoryTreePickerProps): React.ReactNode {
  const picker = useCategoryTreePicker({
    defaultValue,
    mutationResult,
    onCreateCategory,
    onDeleteCategory,
    options,
    selectedCategoryId,
  });
  const treeRef = useRef<HTMLDivElement>(null);
  const scrollbarThumbRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const tree = treeRef.current;
    const thumb = scrollbarThumbRef.current;
    if (!tree || !thumb) return;
    updateCategoryScrollbar(tree, thumb);
    const resizeObserver = new ResizeObserver(() => updateCategoryScrollbar(tree, thumb));
    resizeObserver.observe(tree);
    return () => resizeObserver.disconnect();
  }, [picker.visibleOptions]);

  return (
    <div className={styles.categoryPicker}>
      {!picker.selectedCategoryIsVisible && selectedCategoryId ? <input name="categoryId" type="hidden" value={selectedCategoryId} /> : null}
      <div className={styles.categoryTreeViewport}>
        <div ref={treeRef} className={styles.categoryTree} role="tree" aria-label="Categorieboom" onScroll={(event) => {
          const thumb = scrollbarThumbRef.current;
          if (thumb) updateCategoryScrollbar(event.currentTarget, thumb);
        }}>
          {picker.visibleOptions.map(({ option }) => {
            const categoryId = String(option.category.id);
            return (
              <div key={option.category.id} className={styles.categoryGroup}>
                <div ref={defaultValue === categoryId ? picker.categoryToRevealRef : undefined}>
                  <TreePickerRow
                    depth={option.depth}
                    hasChildren={(picker.childCountByParentId.get(option.category.id) ?? 0) > 0}
                    inputName="categoryId"
                    isExpanded={picker.expandedCategoryIds.has(categoryId)}
                    isSelected={selectedCategoryId === categoryId}
                    label={option.category.name}
                    path={option.path}
                    toggleNoun="Categorie"
                    value={option.category.id}
                    onSelect={() => onSelectedCategoryChange(categoryId)}
                    onToggleExpanded={() => picker.toggleExpanded(option.category.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className={styles.categoryScrollbarTrack} aria-hidden="true"><span ref={scrollbarThumbRef} className={styles.categoryScrollbarThumb} /></div>
      </div>
      {errors?.categoryId ? <span className={styles.errorText}>{errors.categoryId}</span> : null}
    </div>
  );
}

/**
 * Synchronize the persistent category scrollbar thumb with the native scroll position.
 *
 * @param tree - Scrollable category tree.
 * @param thumb - Persistent visual scrollbar thumb.
 * @returns Nothing.
 */
function updateCategoryScrollbar(tree: HTMLDivElement, thumb: HTMLSpanElement): void {
  const trackHeight = Math.max(tree.clientHeight - 4, 0);
  const scrollRange = Math.max(tree.scrollHeight - tree.clientHeight, 0);
  const thumbHeight = scrollRange === 0 ? trackHeight : Math.max(32, (tree.clientHeight / tree.scrollHeight) * trackHeight);
  const thumbRange = Math.max(trackHeight - thumbHeight, 0);
  const thumbTop = scrollRange === 0 ? 0 : (tree.scrollTop / scrollRange) * thumbRange;
  thumb.style.height = `${thumbHeight}px`;
  thumb.style.transform = `translateY(${thumbTop}px)`;
}
