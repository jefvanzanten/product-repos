import { useMemo, useState } from "react";
import { AdminForm as Form, AdminLink as Link } from "../../../../admin-source-context";
import { buildCategoryTreeOptions, formatCategoryOption } from "../../categories/utils/category-tree";
import {
  ConsumptionTypeSection,
  MacroProfileSection,
  ProductFormActions,
  ProductFormCard,
  ProductNameSection,
} from "../../products/components/product-form-sections/product-form-sections";
import type {
  CategoryDto,
  ProductDetailActionResult,
  ProductDetailDto,
  ProductDetailEditIntent,
  ProductDetailLoaderData,
} from "../../types/product-detail.types";
import styles from "./ProductDetailPage.module.css";

/**
 * Render product read-only detail or its inline edit flow.
 *
 * @param props - Loaded product details and the latest optional action result.
 * @returns The product detail page.
 */
export function ProductDetailPage({ actionData, loaderData }: { readonly actionData?: ProductDetailActionResult; readonly loaderData: ProductDetailLoaderData }): React.ReactNode {
  const [editSelection, setEditSelection] = useState<{ readonly actionData?: ProductDetailActionResult; readonly mode: ProductDetailEditIntent | null }>({ actionData, mode: null });
  const editMode = editSelection.actionData === actionData
    ? editSelection.mode
    : actionData?.ok
      ? null
      : actionData?.errors
        ? actionData.intent
        : null;
  const product = actionData?.product ?? (loaderData.found ? loaderData.product : null);

  /** Select a user-requested edit mode for the current action result. */
  function selectEditMode(mode: ProductDetailEditIntent | null): void {
    setEditSelection({ actionData, mode });
  }

  if (!loaderData.found || !product) return <NotFound backUrl={loaderData.backUrl} text="Product niet gevonden." />;

  return (
    <main className={`${styles.page} ${editMode !== null ? styles.editingPage : ""}`}>
      <header className={styles.header}>
        <h1 className={editMode !== null ? styles.editTitle : styles.title}>{editTitle(editMode, product.displayName)}</h1>
        {editMode !== null ? <p className={styles.intro}>{editMode === "product" ? "Pas alleen de productgegevens aan." : "Pas alleen de voedingswaarden aan."}</p> : null}
        <CategoryBreadcrumb path={product.categoryPath} />
      </header>

      {editMode === "product" ? (
        <ProductDataEditForm errors={actionData?.intent === "product" ? actionData.errors : undefined} product={product} values={actionData?.intent === "product" ? actionData.values : undefined} categories={loaderData.categories} onCancel={() => selectEditMode(null)} />
      ) : editMode === "nutrition" ? (
        <NutritionEditForm errors={actionData?.intent === "nutrition" ? actionData.errors : undefined} product={product} values={actionData?.intent === "nutrition" ? actionData.values : undefined} onCancel={() => selectEditMode(null)} />
      ) : (
        <>
          <ProductReadOnly product={product} onEdit={() => selectEditMode("product")} />
          <MacroProfileReadOnly product={product} onEdit={() => selectEditMode("nutrition")} />
          <PackagesReadOnly backUrl={loaderData.backUrl} product={product} />
        </>
      )}
    </main>
  );
}

/** Render the white product-information card. */
function ProductReadOnly({ onEdit, product }: { readonly onEdit: () => void; readonly product: ProductDetailDto }): React.ReactNode {
  return (
    <section className={styles.card}>
      <h2 className={styles.sectionTitle}>Productgegevens</h2>
      <dl className={styles.definitionList}>
        <div><dt>Categorie</dt><dd>{product.categoryPath.map((category) => category.name).join(" > ")}</dd></div>
        <div><dt>Merk</dt><dd>{product.brand?.name ?? "-"}</dd></div>
        <div><dt>Productnaam</dt><dd>{product.name}</dd></div>
        <div><dt>Weergavenaam</dt><dd>{product.displayName}</dd></div>
        <div><dt>Consumptietype</dt><dd>{formatConsumptionType(product.consumptionType)}</dd></div>
      </dl>
      <button className={styles.secondaryButton} type="button" onClick={onEdit}>Productgegevens bewerken</button>
    </section>
  );
}

/** Render the separate white nutrition card in empty or populated state. */
function MacroProfileReadOnly({ onEdit, product }: { readonly onEdit: () => void; readonly product: ProductDetailDto }): React.ReactNode {
  const profile = product.macroProfile;
  return (
    <section className={styles.card}>
      <h2 className={styles.sectionTitle}>Voedingswaarden</h2>
      {profile ? (
        <dl className={styles.definitionList}>
          <div><dt>Referentiebasis</dt><dd>{formatReferenceBasis(profile.referenceBasis)}</dd></div>
          {profile.caloriesKcal !== null ? <div><dt>Calorieën</dt><dd>{profile.caloriesKcal} kcal</dd></div> : null}
          {profile.proteinG !== null ? <div><dt>Eiwit</dt><dd>{profile.proteinG} g</dd></div> : null}
          {profile.carbohydratesG !== null ? <div><dt>Koolhydraten</dt><dd>{profile.carbohydratesG} g</dd></div> : null}
          {profile.fatG !== null ? <div><dt>Vet</dt><dd>{profile.fatG} g</dd></div> : null}
        </dl>
      ) : <p className={styles.muted}>Geen macroprofiel toegevoegd.</p>}
      <button className={profile ? styles.secondaryButton : styles.primaryButton} type="button" onClick={onEdit}>{profile ? "Voedingswaarden bewerken" : "Macroprofiel toevoegen"}</button>
    </section>
  );
}

/** Render the separate white product-packages card. */
function PackagesReadOnly({ backUrl, product }: { readonly backUrl: string; readonly product: ProductDetailDto }): React.ReactNode {
  return (
    <section className={styles.card}>
      <h2 className={styles.sectionTitle}>Verpakkingen</h2>
      {product.packages.length === 0 ? <p className={styles.muted}>Geen verpakkingen gevonden voor dit product.</p> : product.packages.map((item) => (
        <article key={item.id} className={styles.packageCard}>
          {item.imageUrl ? <img className={styles.packageImage} src={item.imageUrl} alt={`Verpakking van ${product.displayName}`} /> : <div className={styles.packageImagePlaceholder} aria-label="Geen verpakkingsafbeelding">Geen afbeelding</div>}
          <div className={styles.packageDetails}>
            <strong>{item.summary}</strong>
            <span>Volledige inhoud: {item.unitContent.amount} {item.unitContent.unitType.symbol}</span>
            {item.portion === null ? null : <span>Per {item.portion.name}: {item.portion.unitContent.amount} {item.portion.unitContent.unitType.symbol}{item.portion.portionsPerPackage === null ? "" : ` · ${item.portion.portionsPerPackage} per verpakking`}</span>}
            <Link className={styles.packageEditLink} to={`/product-catalogus/${product.id}/verpakkingen/${item.id}${contextSearch(backUrl)}`}>Verpakking bewerken</Link>
          </div>
        </article>
      ))}
      <Link className={styles.primaryLink} to={`/product-catalogus/${product.id}/verpakkingen/nieuw${contextSearch(backUrl)}`}>Verpakking toevoegen</Link>
    </section>
  );
}

/**
 * Render the isolated product-data edit form.
 *
 * @param props - Product data, reference data, validation state, and cancel handler.
 * @returns Product-data edit form.
 */
function ProductDataEditForm({ categories, errors, onCancel, product, values }: { readonly categories: ReadonlyArray<CategoryDto>; readonly errors?: Record<string, string>; readonly onCancel: () => void; readonly product: ProductDetailDto; readonly values?: Record<string, string> }): React.ReactNode {
  const categoryOptions = useMemo(() => buildCategoryTreeOptions(categories), [categories]);
  return (
    <Form className={styles.editForm} method="post">
      <input name="intent" type="hidden" value="product" />
      {errors?.form ? <p className={styles.formError}>{errors.form}</p> : null}
      <ProductFormCard title="Categorie">
        <label className={styles.label}><span>Bestaande categorie</span>
          <select className={styles.input} name="categoryId" defaultValue={values?.categoryId ?? product.category.id} required>
            {categoryOptions.map((option) => <option key={option.category.id} value={option.category.id}>{formatCategoryOption(option)}</option>)}
          </select>
        </label>
        {errors?.categoryId ? <span className={styles.inlineError}>{errors.categoryId}</span> : null}
      </ProductFormCard>
      <ProductNameSection error={errors?.productName} value={values?.productName ?? product.name} />
      <ProductFormCard title="Merk (optioneel)">
        <input aria-label="Merk" className={styles.input} name="brandName" defaultValue={values?.brandName ?? product.brand?.name ?? ""} placeholder="Leeg laten voor geen merk" />
      </ProductFormCard>
      <ConsumptionTypeSection error={errors?.consumptionType} value={values?.consumptionType ?? product.consumptionType} />
      <ProductFormActions onCancel={onCancel} />
    </Form>
  );
}

/**
 * Render the isolated nutrition edit form while retaining product data unchanged.
 *
 * @param props - Product, validation state, retained values, and cancel handler.
 * @returns Nutrition edit form.
 */
function NutritionEditForm({ errors, onCancel, product, values }: { readonly errors?: Record<string, string>; readonly onCancel: () => void; readonly product: ProductDetailDto; readonly values?: Record<string, string> }): React.ReactNode {
  return (
    <Form className={styles.editForm} method="post">
      <input name="intent" type="hidden" value="nutrition" />
      {errors?.form ? <p className={styles.formError}>{errors.form}</p> : null}
      <MacroProfileSection errors={errors} profile={product.macroProfile} values={values} />
      <ProductFormActions onCancel={onCancel} />
    </Form>
  );
}

/**
 * Resolve the heading for the active product-detail compartment.
 *
 * @param mode - Active edit compartment, or null for read-only mode.
 * @param displayName - Product display name used in read-only mode.
 * @returns Page heading.
 */
function editTitle(mode: ProductDetailEditIntent | null, displayName: string): string {
  if (mode === "product") return "Productgegevens bewerken";
  if (mode === "nutrition") return "Voedingswaarden bewerken";
  return displayName;
}

/** Render the interactive category breadcrumb. */
function CategoryBreadcrumb({ path }: { readonly path: ReadonlyArray<{ readonly id: number; readonly name: string }> }): React.ReactNode {
  return (
    <nav className={styles.breadcrumb} aria-label="Categoriepad">
      <Link to="/product-catalogus">Alle categorieën</Link>
      {path.map((category) => <span key={category.id}>› <Link to={`/product-catalogus?categoryId=${category.id}`}>{category.name}</Link></span>)}
    </nav>
  );
}

/** Render a product-detail not-found state. */
function NotFound({ backUrl, text }: { readonly backUrl: string; readonly text: string }): React.ReactNode {
  return <main className={styles.page}><section className={styles.card}><p>{text}</p><Link className={styles.primaryLink} to={backUrl}>Terug naar productcatalogus</Link></section></main>;
}

/** Extract the current browse context as a query suffix. */
function contextSearch(backUrl: string): string {
  const query = backUrl.split("?")[1];
  return query ? `?${query}` : "";
}

/** Translate a consumption type into its Dutch UI label. */
function formatConsumptionType(value: ProductDetailDto["consumptionType"]): string {
  if (value === "FOOD") return "Voeding";
  if (value === "DRINK") return "Drinken";
  return "Supplement";
}

/** Translate a macro reference basis into its Dutch UI label. */
function formatReferenceBasis(value: NonNullable<ProductDetailDto["macroProfile"]>["referenceBasis"]): string {
  if (value === "PER_100_G") return "Per 100 g";
  if (value === "PER_100_ML") return "Per 100 ml";
  return "Per stuk/dosis";
}
