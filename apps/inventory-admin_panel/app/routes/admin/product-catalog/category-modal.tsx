import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import type { FormErrors } from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import actions from "./catalog-actions.module.css";
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
  const [name, setName] = useState(defaultName);
  const submitErrors = fetcher.data?.errors ?? errors;

  useEffect(() => {
    if (!fetcher.data?.ok) return;
    onClose();
  }, [fetcher.data, onClose]);

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <fetcher.Form className={styles.modal} method="post">
        <h2 className={styles.modalTitle}>{title}</h2>
        <input name="_action" type="hidden" value={action} />
        <input name="parentId" type="hidden" value={parentId ?? ""} />
        {categoryId ? <input name="categoryId" type="hidden" value={categoryId} /> : null}
        <label className={styles.modalLabel}>Naam categorie<input autoFocus className={styles.modalInput} name="categoryName" value={name} onChange={(event) => setName(event.currentTarget.value)} /></label>
        {submitErrors?.categoryName ? <p className={styles.modalError}>{submitErrors.categoryName}</p> : null}
        {submitErrors?.form ? <p className={styles.modalError}>{submitErrors.form}</p> : null}
        <div className={actions.modalActions}>
          <button className={actions.primaryButton} disabled={fetcher.state !== "idle"} type="submit">{action === "updateCategory" ? "Opslaan" : "Toevoegen"}</button>
          <button className={actions.secondaryButton} type="button" onClick={onClose}>Annuleren</button>
        </div>
      </fetcher.Form>
    </div>
  );
}
