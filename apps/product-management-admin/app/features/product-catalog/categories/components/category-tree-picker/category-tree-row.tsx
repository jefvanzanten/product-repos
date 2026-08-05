import type { Ref } from "react";
import type { CategoryTreeOption } from "../../utils/category-tree";
import browseTreeStyles from "../category-tree/category-tree.module.css";
import styles from "./category-tree-picker.module.css";

type CategoryTreeRowProps = {
  readonly busy: boolean;
  readonly hasChildren: boolean;
  readonly isExpanded: boolean;
  readonly isSelected: boolean;
  readonly option: CategoryTreeOption;
  readonly rowRef?: Ref<HTMLDivElement>;
  readonly onAddChild: () => void;
  readonly onDelete: () => void;
  readonly onSelect: () => void;
  readonly onToggleExpanded: () => void;
};

/**
 * Render one selectable row in the category tree picker.
 *
 * @param props - Category option, visual state, ref, and row commands.
 * @returns One category tree item.
 */
export function CategoryTreeRow({ busy, hasChildren, isExpanded, isSelected, onAddChild, onDelete, onSelect, onToggleExpanded, option, rowRef }: CategoryTreeRowProps): React.ReactNode {
  return (
    <div
      ref={rowRef}
      className={`${browseTreeStyles.categoryRow} ${styles.categoryPickerRow} ${isSelected ? styles.categoryPickerRowSelected : ""}`}
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-level={option.depth + 1}
      style={{ marginLeft: `${option.depth}rem` }}
    >
      {hasChildren ? (
        <button className={styles.categoryExpandButton} type="button" aria-label={`${isExpanded ? "Categorie inklappen" : "Categorie uitklappen"}: ${option.path}`} title={`${isExpanded ? "Inklappen" : "Uitklappen"}: ${option.path}`} onClick={onToggleExpanded}>
          <span className={`${browseTreeStyles.chevron} ${isExpanded ? browseTreeStyles.chevronOpen : ""}`} aria-hidden="true">▸</span>
        </button>
      ) : <span className={styles.expandPlaceholder} aria-hidden="true" />}
      <label className={styles.categoryLabel}><input className={styles.categoryRadio} checked={isSelected} name="categoryId" type="radio" value={option.category.id} onChange={onSelect} /><span className={styles.categoryName}>{option.category.name}</span></label>
      <button className={styles.categoryAddChildButton} type="button" aria-label={`Subcategorie maken onder ${option.path}`} title={`Subcategorie maken onder ${option.path}`} onClick={onAddChild}>+</button>
      <button className={styles.categoryDeleteButton} disabled={busy} type="button" aria-label={`Categorie ${option.path} verwijderen`} title={`Categorie ${option.path} verwijderen`} onClick={onDelete}>×</button>
    </div>
  );
}
