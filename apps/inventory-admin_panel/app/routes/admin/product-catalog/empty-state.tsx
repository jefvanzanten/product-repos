import styles from "./empty-state.module.css";

/**
 * Render an empty-state message for catalog sections.
 *
 * @param props - Empty-state title and optional explanatory text.
 * @returns An empty-state block.
 */
export function EmptyState({ text, title }: { readonly text?: string; readonly title: string }): React.ReactNode {
  return <div className={styles.emptyState}><strong>{title}</strong>{text ? <p>{text}</p> : null}</div>;
}
