import { cssModule } from "../../css-modules";
import { FieldError } from "../FieldError/FieldError";

const styles = cssModule("SubcategoryModal", ["modal", "card", "actions", "button", "secondaryButton"] as const);

type CategoryModalProps = {
  readonly errors: Readonly<Record<string, string>>;
  readonly value: string;
} & (
  | { readonly _tag: "RootCategory" }
  | { readonly _tag: "Subcategory"; readonly parentId: number; readonly parentName: string }
  | { readonly _tag: "EditCategory"; readonly categoryId: number; readonly parentId: number | null }
);

/** Render a category modal for creating or renaming categories. */
export function CategoryModal(props: CategoryModalProps) {
  const title = titleForCategoryModal(props);
  const action = actionForCategoryModal(props);
  const label = props._tag === "Subcategory" ? "Naam subcategorie" : "Naam categorie";
  const cancelHref = cancelHrefForCategoryModal(props);
  const submitLabel = props._tag === "EditCategory" ? "Opslaan" : "Toevoegen";

  return (
    <div class={styles.modal} role="dialog" aria-modal="true">
      <div class={styles.card}>
        <h2>{title}</h2>
        <form method="post" action={action} hx-post={action} hx-target="#modal-root">
          <label for="name">{label}</label>
          <input id="name" name="name" value={props.value} />
          <FieldError error={props.errors.name} />
          <div class={styles.actions}><button class={styles.button} type="submit">{submitLabel}</button><a class={styles.secondaryButton} href={cancelHref}>Annuleren</a></div>
        </form>
      </div>
    </div>
  );
}

function titleForCategoryModal(props: CategoryModalProps): string {
  if (props._tag === "RootCategory") return "Nieuwe categorie maken";
  if (props._tag === "Subcategory") return `Nieuwe subcategorie maken in ${props.parentName}`;
  return "Categorie bewerken";
}

function actionForCategoryModal(props: CategoryModalProps): string {
  if (props._tag === "RootCategory") return "/admin/product-catalogus/categorieen/nieuw";
  if (props._tag === "Subcategory") return `/admin/product-catalogus/categorieen/${props.parentId}/subcategorie/nieuw`;
  return `/admin/product-catalogus/categorieen/${props.categoryId}/bewerken`;
}

function cancelHrefForCategoryModal(props: CategoryModalProps): string {
  if (props._tag === "RootCategory") return "/admin/product-catalogus";
  if (props._tag === "Subcategory") return `/admin/product-catalogus?categoryId=${props.parentId}`;
  return categoryListHref(props.parentId);
}

function categoryListHref(parentId: number | null): string {
  return parentId === null ? "/admin/product-catalogus" : `/admin/product-catalogus?categoryId=${parentId}`;
}
