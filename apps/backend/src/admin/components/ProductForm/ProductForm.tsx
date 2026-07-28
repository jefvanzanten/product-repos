import { cssModule } from "../../css-modules";
import type { CategoryWithPath } from "../../models/category.model";
import type { ProductCreateModel } from "../../models/product-create.model";
import type { ProductFormValues } from "../../form-parsing";
import { CategorySelect } from "../CategoryTree/CategoryTree";
import { FieldError } from "../FieldError/FieldError";
import { PackageFields } from "../PackageForm/PackageForm";

const styles = cssModule("ProductForm", [
  "form",
  "section",
  "muted",
  "formError",
  "actions",
  "button",
  "secondaryButton",
  "brandPicker",
  "suggestions",
  "suggestionList",
  "suggestionButton",
] as const);

type BrandOption = { readonly id: string; readonly name: string };

/** Render the product create/edit form. */
export function ProductForm(props: {
  readonly action: string;
  readonly mode: "create" | "edit";
  readonly references: ProductCreateModel;
  readonly values: ProductFormValues;
  readonly errors: Readonly<Record<string, string>>;
  readonly submitLabel: string;
}) {
  return (
    <form class={styles.form} method="post" action={props.action}>
      <section class={styles.section}>
        <h2>Categorie</h2>
        <CategorySelect
          categories={props.references.categories}
          selectedCategoryId={props.values.categoryId}
        />
        <FieldError error={props.errors.categoryId} />
      </section>

      <section class={styles.section}>
        <h2>Merk (optioneel)</h2>
        <BrandPicker
          values={props.values}
          error={props.errors.brandName ?? props.errors.brandId}
          status={brandStatus(props.values)}
        />
      </section>

      <section class={styles.section}>
        <h2>Productnaam</h2>
        <input id="name" name="name" value={props.values.name} required />
        <FieldError error={props.errors.name} />
        <p class={styles.muted}>
          Weergavenaam:{" "}
          {displayNamePreview(props.values, props.references.categories)}
        </p>
      </section>

      {props.mode === "create" ? (
        <PackageFields
          references={props.references}
          values={props.values}
          errors={props.errors}
        />
      ) : null}

      {props.errors.form ? (
        <p class={styles.formError} role="alert">
          {props.errors.form}
        </p>
      ) : null}
      <div class={styles.actions}>
        <button class={styles.button} type="submit">
          {props.submitLabel}
        </button>
        {props.mode === "edit" ? (
          <a class={styles.secondaryButton} href={props.action}>
            Annuleren
          </a>
        ) : null}
      </div>
    </form>
  );
}

/** Render the single visible brand field with HTMX-backed suggestions. */
export function BrandPicker(props: {
  readonly values: Pick<
    ProductFormValues,
    "brandName" | "brandId" | "newBrandName"
  >;
  readonly error: string | undefined;
  readonly status: string | null;
}) {
  return (
    <div id="brand-picker" class={styles.brandPicker}>
      <input
        id="brandName"
        name="brandName"
        value={props.values.brandName}
        placeholder="Typ merknaam of laat leeg"
        autocomplete="off"
        hx-get="/admin/product-catalogus/merken/suggesties"
        hx-trigger="keyup changed delay:300ms, search"
        hx-target="#brand-suggestions"
        hx-include="#brandName"
      />
      <input
        id="brandId"
        name="brandId"
        type="hidden"
        value={props.values.brandId}
      />
      <input
        id="newBrandName"
        name="newBrandName"
        type="hidden"
        value={props.values.newBrandName}
      />
      <FieldError error={props.error} />
      {props.status ? <p class={styles.muted}>{props.status}</p> : null}
      <div id="brand-suggestions" class={styles.suggestions}></div>
    </div>
  );
}

/** Render brand suggestions and the new-brand confirmation action. */
export function BrandSuggestions(props: {
  readonly brandName: string;
  readonly brands: ReadonlyArray<BrandOption>;
  readonly exactMatch: boolean;
}) {
  const trimmed = props.brandName.trim();
  return (
    <>
      <input
        id="brandId"
        name="brandId"
        type="hidden"
        value=""
        hx-swap-oob="outerHTML"
      />
      <input
        id="newBrandName"
        name="newBrandName"
        type="hidden"
        value=""
        hx-swap-oob="outerHTML"
      />
      <div id="brand-suggestions" class={styles.suggestions}>
        {trimmed.length < 2 ? (
          <p class={styles.muted}>Typ minimaal 2 tekens om merken te zoeken.</p>
        ) : null}
        {trimmed.length >= 2 && props.brands.length > 0 ? (
          <ul class={styles.suggestionList}>
            {props.brands.map((brand) => (
              <li>
                <button
                  class={styles.suggestionButton}
                  type="button"
                  hx-get={`/admin/product-catalogus/merken/selecteren?brandId=${brand.id}`}
                  hx-target="#brand-picker"
                  hx-swap="outerHTML"
                >
                  {brand.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {trimmed.length >= 2 && !props.exactMatch ? (
          <button
            class={styles.secondaryButton}
            type="button"
            hx-get={`/admin/product-catalogus/merken/nieuw-bevestigen?brandName=${encodeURIComponent(trimmed)}`}
            hx-target="#brand-picker"
            hx-swap="outerHTML"
          >
            Merk “{trimmed}” aanmaken
          </button>
        ) : null}
      </div>
    </>
  );
}

function displayNamePreview(
  values: ProductFormValues,
  _categories: ReadonlyArray<CategoryWithPath>,
): string {
  const brand = values.brandName.trim();
  const name = values.name.trim();
  if (brand.length > 0 && name.length > 0) return `${brand} ${name}`;
  return name.length > 0 ? name : "-";
}

function brandStatus(values: ProductFormValues): string | null {
  const brandName = values.brandName.trim();
  if (brandName.length === 0) return null;
  if (values.newBrandName.trim().length > 0)
    return `Nieuw merk wordt aangemaakt: ${brandName}`;
  if (values.brandId.trim().length > 0)
    return `Gekozen bestaand merk: ${brandName}`;
  return null;
}
