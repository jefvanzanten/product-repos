import type { ReactNode } from "react";
import styles from "./tree-picker-row.module.css";

/** Configuration for one selectable tree row. */
export type TreePickerRowProps = {
  readonly depth: number;
  readonly hasChildren: boolean;
  readonly inputName: string;
  readonly isExpanded: boolean;
  readonly isSelected: boolean;
  readonly label: string;
  readonly path: string;
  readonly toggleNoun: string;
  readonly value: number | string;
  readonly onSelect: () => void;
  readonly onToggleExpanded: () => void;
};

/**
 * Render one expandable, single-select tree row backed by a hidden radio input.
 *
 * @param props - Tree position, selection state, labels, and row commands.
 * @returns An accessible selectable tree item.
 */
export function TreePickerRow({ depth, hasChildren, inputName, isExpanded, isSelected, label, onSelect, onToggleExpanded, path, toggleNoun, value }: TreePickerRowProps): ReactNode {
  return (
    <div
      className={`${styles.row}${isSelected ? ` ${styles.selected}` : ""}`}
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-level={depth + 1}
      aria-selected={isSelected}
      style={{ marginLeft: `${depth}rem` }}
    >
      {hasChildren ? (
        <button
          className={styles.expandButton}
          type="button"
          aria-label={`${toggleNoun} ${isExpanded ? "inklappen" : "uitklappen"}: ${path}`}
          title={`${isExpanded ? "Inklappen" : "Uitklappen"}: ${path}`}
          onClick={onToggleExpanded}
        >
          <span className={`${styles.chevron}${isExpanded ? ` ${styles.chevronOpen}` : ""}`} aria-hidden="true">▸</span>
        </button>
      ) : <span className={styles.expandPlaceholder} aria-hidden="true" />}
      <label className={styles.label}>
        <input className={styles.radio} checked={isSelected} name={inputName} type="radio" value={value} onChange={onSelect} />
        <span className={styles.name}>{label}</span>
      </label>
    </div>
  );
}
