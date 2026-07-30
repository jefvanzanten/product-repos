import styles from "./empty-state.module.css";

/**
 * Render an empty-state message for catalog sections.
 *
 * @param props - Empty-state title, optional explanatory text, and related actions.
 * @returns An empty-state block.
 */
export function EmptyState({ children, text, title }: { readonly children?: React.ReactNode; readonly text?: string; readonly title: string }): React.ReactNode {
  return (
    <div className={styles.emptyState}>
      <strong>{title}</strong>
      {text ? <p>{text}</p> : null}
      {children ? <div className={styles.actions}>{children}</div> : null}
    </div>
  );
}
