import { shortCategoryPath } from "../../utils/category-tree-picker";
import styles from "./category-tree-picker.module.css";

type InlineCategoryRowProps = {
  readonly busy: boolean;
  readonly depth: number;
  readonly parentPath: string;
  readonly value: string;
  readonly onCancel: () => void;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
};

/**
 * Render an inline category creation row.
 *
 * @param props - Row depth, parent context, value, status, and event handlers.
 * @returns The inline category creation controls.
 */
export function InlineCategoryRow({ busy, depth, onCancel, onChange, onSubmit, parentPath, value }: InlineCategoryRowProps): React.ReactNode {
  return (
    <div className={styles.inlineRow} style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}>
      <span className={styles.inlineArrow}>↳</span>
      <input autoFocus className={styles.inlineInput} placeholder={`Nieuwe categorie onder ${shortCategoryPath(parentPath)}`} value={value} onChange={(event) => onChange(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onSubmit(); } }} />
      <button className={styles.inlineSubmitButton} disabled={busy} type="button" onClick={onSubmit}>{busy ? "..." : "Toevoegen"}</button>
      <button className={styles.secondaryButton} type="button" onClick={onCancel}>Annuleer</button>
    </div>
  );
}
