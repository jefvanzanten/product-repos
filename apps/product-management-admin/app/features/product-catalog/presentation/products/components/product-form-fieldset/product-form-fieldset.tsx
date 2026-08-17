import styles from "./product-form-fieldset.module.css";

/**
 * Render one titled product form field group.
 *
 * @param props - Field group title and form controls.
 * @returns A styled product form fieldset.
 */
export function ProductFormFieldset({ children, title }: { readonly children: React.ReactNode; readonly title: string }): React.ReactNode {
  return <fieldset className={styles.fieldset}><legend className={styles.legend}>{title}</legend>{children}</fieldset>;
}
