import { useEffect, useState } from "react";
import { useFetcher, useLocation } from "react-router";
import { ADMIN_BASE_PATH } from "../../../../../admin-navigation";
import { useAdminPath, useAdminSource } from "../../../../../admin-source-context";
import type { FormErrors } from "../../../types/product-catalog.types";
import {
  CatalogActionGroup,
  CatalogPrimaryButton,
  CatalogSecondaryButton,
} from "../../../catalog/components/catalog-actions/catalog-actions";
import styles from "./category-modal.module.css";

/** Category form action handled by the product catalog route. */
export type CategoryModalAction = "createCategory" | "updateCategory";

type CategoryModalActionResult = {
  readonly ok?: true;
  readonly errors?: FormErrors;
};

/**
 * Render the create/edit category modal form.
 *
 * @param props - Category form mode, defaults, errors, and close callback.
 * @returns A modal dialog with a category form.
 */
export function CategoryModal({ action, categoryId, defaultName = "", errors, onClose, parentId, title }: {
  readonly action: CategoryModalAction;
  readonly categoryId?: number;
  readonly defaultName?: string;
  readonly errors?: FormErrors;
  readonly onClose: () => void;
  readonly parentId: number | null;
  readonly title: string;
}): React.ReactNode {
  const fetcher = useFetcher<CategoryModalActionResult>();
  const location = useLocation();
  const source = useAdminSource();
  const currentInternalPath = location.pathname.startsWith(ADMIN_BASE_PATH)
    ? location.pathname.slice(ADMIN_BASE_PATH.length) || "/"
    : location.pathname;
  const formAction = useAdminPath(currentInternalPath);
  const [name, setName] = useState(defaultName);
  const submitErrors = fetcher.data?.errors ?? errors;

  useEffect(() => {
    if (!fetcher.data?.ok) return;
    onClose();
  }, [fetcher.data, onClose]);

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <fetcher.Form action={formAction} className={styles.modal} method="post">
        <h2 className={styles.modalTitle}>{title}</h2>
        {source === null ? null : <input name="source" type="hidden" value={source} />}
        <input name="_action" type="hidden" value={action} />
        <input name="parentId" type="hidden" value={parentId ?? ""} />
        {categoryId ? <input name="categoryId" type="hidden" value={categoryId} /> : null}
        <label className={styles.modalLabel}>Naam categorie<input autoFocus className={styles.modalInput} name="categoryName" value={name} onChange={(event) => setName(event.currentTarget.value)} /></label>
        {submitErrors?.categoryName ? <p className={styles.modalError}>{submitErrors.categoryName}</p> : null}
        {submitErrors?.form ? <p className={styles.modalError}>{submitErrors.form}</p> : null}
        <CatalogActionGroup variant="modal">
          <CatalogPrimaryButton disabled={fetcher.state !== "idle"} type="submit">{action === "updateCategory" ? "Opslaan" : "Toevoegen"}</CatalogPrimaryButton>
          <CatalogSecondaryButton type="button" onClick={onClose}>Annuleren</CatalogSecondaryButton>
        </CatalogActionGroup>
      </fetcher.Form>
    </div>
  );
}
