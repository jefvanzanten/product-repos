import { useEffect, useMemo, useState } from "react";
import {
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { AdminForm as Form, AdminLink as Link } from "../../admin-source-context";
import { requireAdministrator } from "../../auth.server";
import { buildCategoryTreeOptions, formatCategoryOption } from "../../features/admin/product-catalog/categoryTree";
import {
  ConsumptionTypeSection,
  MacroProfileSection,
  ProductFormActions,
  ProductFormCard,
  ProductNameSection,
} from "../../features/admin/product-forms/product-form-sections";
import type {
  CategoryDto,
  ProductDetailActionResult,
  ProductDetailDto,
  ProductDetailLoaderData,
} from "./product-detail.types";
import styles from "./product-detail.module.css";
import {
  handleProductDetailRouteAction,
  loadProductDetailRoute,
} from "./product-detail-route.server";

/** Return metadata for the product-detail route. */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Productdetail" }];
}

/** Load protected product details and edit reference data. */
export async function loader(args: LoaderFunctionArgs): Promise<ProductDetailLoaderData> {
  await requireAdministrator(args.request);
  return loadProductDetailRoute(args);
}

/** Handle a protected product edit. */
export async function action(args: ActionFunctionArgs): Promise<ProductDetailActionResult> {
  await requireAdministrator(args.request);
  return handleProductDetailRouteAction(args);
}

/** Render product read-only detail or its inline edit flow. */
export default function ProductDetail(): React.ReactNode {
  const actionData = useActionData<ProductDetailActionResult>();
  const loaderData = useLoaderData<ProductDetailLoaderData>();
  const [editing, setEditing] = useState(false);
  const product = actionData?.product ?? (loaderData.found ? loaderData.product : null);

  useEffect(() => {
    if (actionData?.ok) setEditing(false);
    else if (actionData?.errors) setEditing(true);
  }, [actionData]);

  if (!loaderData.found || !product) return <NotFound backUrl={loaderData.backUrl} text="Product niet gevonden." />;

  return (
    <main className={`${styles.page} ${editing ? styles.editingPage : ""}`}>
      <header className={styles.header}>
        <h1 className={editing ? styles.editTitle : styles.title}>{editing ? "Product bewerken" : product.displayName}</h1>
        {editing ? <p className={styles.intro}>Werk productgegevens en voedingswaarden inline bij.</p> : null}
        <CategoryBreadcrumb path={product.categoryPath} />
      </header>

      {editing ? (
        <ProductEditForm errors={actionData?.errors} product={product} values={actionData?.values} categories={loaderData.categories} onCancel={() => setEditing(false)} />
      ) : (
        <>
          <ProductReadOnly product={product} onEdit={() => setEditing(true)} />
          <MacroProfileReadOnly product={product} onEdit={() => setEditing(true)} />
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
      <button className={styles.secondaryButton} type="button" onClick={onEdit}>Product bewerken</button>
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
        <Link key={item.id} className={styles.packageCard} to={`/product-catalogus/${product.id}/verpakkingen/${item.id}${contextSearch(backUrl)}`}>
          <strong>{item.summary}</strong>
          <span>Aantal per verpakking: {item.unitsPerPackage}</span>
        </Link>
      ))}
      <Link className={styles.primaryLink} to={`/product-catalogus/${product.id}/verpakkingen/nieuw${contextSearch(backUrl)}`}>Verpakking toevoegen</Link>
    </section>
  );
}

/** Render the Figma-aligned inline product edit cards. */
function ProductEditForm({ categories, errors, onCancel, product, values }: { readonly categories: ReadonlyArray<CategoryDto>; readonly errors?: Record<string, string>; readonly onCancel: () => void; readonly product: ProductDetailDto; readonly values?: Record<string, string> }): React.ReactNode {
  const categoryOptions = useMemo(() => buildCategoryTreeOptions(categories), [categories]);
  return (
    <Form className={styles.editForm} method="post">
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
      <MacroProfileSection errors={errors} profile={product.macroProfile} values={values} />
      <ProductFormActions onCancel={onCancel} />
    </Form>
  );
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
