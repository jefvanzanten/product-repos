import type { ReactNode } from "react";
import { AdminForm, AdminLink } from "../../../../../admin-source-context";
import styles from "./package-page.module.css";

/**
 * Render the shared package form page shell.
 *
 * @param props - Navigation, heading content, and page body.
 * @returns A package form page shell.
 */
export function PackagePage({ backUrl, children, intro, title }: { readonly backUrl: string; readonly children: ReactNode; readonly intro: string; readonly title: string }): ReactNode {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <AdminLink className={styles.backLink} to={backUrl}>Terug naar product</AdminLink>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.intro}>{intro}</p>
      </header>
      <section className={styles.card}>{children}</section>
    </main>
  );
}

/**
 * Render a package route not-found state.
 *
 * @param props - User-facing not-found message.
 * @returns A package not-found page.
 */
export function PackageNotFound({ message }: { readonly message: string }): ReactNode {
  return <main className={styles.page}><section className={styles.card}><p>{message}</p><AdminLink className={styles.primaryLink} to="/product-catalogus">Terug naar productcatalogus</AdminLink></section></main>;
}

/**
 * Render the shared package mutation form.
 *
 * @param props - Form content and whether file uploads are enabled.
 * @returns A package mutation form.
 */
export function PackageForm({ children, multipart = false }: { readonly children: ReactNode; readonly multipart?: boolean }): ReactNode {
  return multipart
    ? <AdminForm className={styles.form} encType="multipart/form-data" method="post">{children}</AdminForm>
    : <AdminForm className={styles.form} method="post">{children}</AdminForm>;
}

/**
 * Render a package form-level validation error.
 *
 * @param props - Optional form error message.
 * @returns An alert when an error is present.
 */
export function PackageFormError({ message }: { readonly message?: string }): ReactNode {
  return message ? <p className={styles.formError}>{message}</p> : null;
}

/**
 * Render a package form action group.
 *
 * @param props - Nested form actions.
 * @returns A package form action group.
 */
export function PackageFormActions({ children }: { readonly children: ReactNode }): ReactNode {
  return <div className={styles.actions}>{children}</div>;
}

/**
 * Render the primary package form submit button.
 *
 * @param props - Button label.
 * @returns A primary submit button.
 */
export function PackagePrimaryButton({ children }: { readonly children: ReactNode }): ReactNode {
  return <button className={styles.primaryButton} type="submit">{children}</button>;
}

/**
 * Render a secondary package navigation action.
 *
 * @param props - Link target and label.
 * @returns A secondary source-preserving link.
 */
export function PackageSecondaryLink({ children, to }: { readonly children: ReactNode; readonly to: string }): ReactNode {
  return <AdminLink className={styles.secondaryButton} to={to}>{children}</AdminLink>;
}
