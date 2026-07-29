import type { Route } from "./+types/product-detail";
import { useEffect, useMemo, useState } from "react";
import { Form, Link } from "react-router";
import { buildCategoryTreeOptions, formatCategoryOption } from "../../../../features/admin/product-catalog/categoryTree";
import { createBrand, getCategories, getProduct, isNotFound, mapApiError, updateProduct } from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import type { FormErrors, ProductDetailDto } from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import styles from "./product-detail.module.css";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Productdetail" }];
}

type LoaderData =
  | { readonly found: true; readonly product: ProductDetailDto; readonly categories: Awaited<ReturnType<typeof getCategories>>; readonly backUrl: string }
  | { readonly found: false; readonly backUrl: string };

type ActionResult = { readonly ok?: true; readonly errors?: FormErrors; readonly product?: ProductDetailDto; readonly values?: Record<string, string> };

export async function loader({ params, request }: Route.LoaderArgs): Promise<LoaderData> {
  const backUrl = buildBackUrl(new URL(request.url));
  try {
    return { found: true, product: await getProduct(String(params.productId)), categories: await getCategories(), backUrl };
  } catch (error) {
    if (isNotFound(error)) return { found: false, backUrl };
    throw error;
  }
}

export async function action({ params, request }: Route.ActionArgs): Promise<ActionResult> {
  const form = await request.formData();
  const values = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  try {
    const productName = String(form.get("productName") ?? "").trim();
    const categoryId = Number(form.get("categoryId"));
    const brandName = String(form.get("brandName") ?? "").trim();
    const brand = brandName ? await createBrand({ name: brandName }) : null;
    return { ok: true, product: await updateProduct(String(params.productId), { name: productName, categoryId, brandId: brand?.id ?? null }) };
  } catch (error) {
    return { errors: mapApiError(error), values };
  }
}

export default function ProductDetail({ actionData, loaderData }: Route.ComponentProps): React.ReactNode {
  const [editing, setEditing] = useState(false);
  const product = actionData?.product ?? (loaderData.found ? loaderData.product : null);

  useEffect(() => {
    if (actionData?.ok) setEditing(false);
  }, [actionData?.ok]);

  if (!loaderData.found || !product) {
    return <NotFound backUrl={loaderData.backUrl} text="Product niet gevonden." />;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{product.displayName}</h1>
        <CategoryBreadcrumb path={product.categoryPath} />
        <Link className={styles.backLink} to={loaderData.backUrl}>Terug naar productcatalogus</Link>
      </header>

      <section className={styles.card}>
        {editing ? (
          <ProductEditForm errors={actionData?.errors} product={product} values={actionData?.values} categories={loaderData.categories} onCancel={() => setEditing(false)} />
        ) : (
          <ProductReadOnly product={product} onEdit={() => setEditing(true)} />
        )}

        <section className={styles.packagesSection}>
          <h2 className={styles.sectionTitle}>Verpakkingen</h2>
          {product.packages.length === 0 ? <p className={styles.muted}>Geen verpakkingen gevonden voor dit product.</p> : product.packages.map((item) => (
            <Link key={item.id} className={styles.packageCard} to={`/admin/product-catalogus/${product.id}/verpakkingen/${item.id}${contextSearch(loaderData.backUrl)}`}>
              <strong>{item.summary}</strong>
              <span>Aantal per verpakking: {item.unitsPerPackage}</span>
            </Link>
          ))}
          <Link className={styles.primaryLink} to={`/admin/product-catalogus/${product.id}/verpakkingen/nieuw${contextSearch(loaderData.backUrl)}`}>Verpakking toevoegen</Link>
        </section>
      </section>
    </main>
  );
}

function ProductReadOnly({ onEdit, product }: { readonly onEdit: () => void; readonly product: ProductDetailDto }): React.ReactNode {
  return (
    <section className={styles.detailsSection}>
      <h2 className={styles.sectionTitle}>Productgegevens</h2>
      <dl className={styles.definitionList}>
        <div><dt>Categorie</dt><dd>{product.categoryPath.map((category) => category.name).join(" > ")}</dd></div>
        <div><dt>Merk</dt><dd>{product.brand?.name ?? "-"}</dd></div>
        <div><dt>Productnaam</dt><dd>{product.name}</dd></div>
        <div><dt>Weergavenaam</dt><dd>{product.displayName}</dd></div>
      </dl>
      <button className={styles.secondaryButton} type="button" onClick={onEdit}>Product bewerken</button>
    </section>
  );
}

function ProductEditForm({ categories, errors, onCancel, product, values }: { readonly categories: Awaited<ReturnType<typeof getCategories>>; readonly errors?: FormErrors; readonly onCancel: () => void; readonly product: ProductDetailDto; readonly values?: Record<string, string> }): React.ReactNode {
  const categoryOptions = useMemo(() => buildCategoryTreeOptions(categories), [categories]);
  return (
    <Form className={styles.editForm} method="post">
      <h2 className={styles.sectionTitle}>Product bewerken</h2>
      {errors?.form ? <p className={styles.formError}>{errors.form}</p> : null}
      <label className={styles.label}>Categorie
        <select className={styles.input} name="categoryId" defaultValue={values?.categoryId ?? product.category.id} required>
          {categoryOptions.map((option) => <option key={option.category.id} value={option.category.id}>{formatCategoryOption(option)}</option>)}
        </select>
      </label>
      <label className={styles.label}>Merk
        <input className={styles.input} name="brandName" defaultValue={values?.brandName ?? product.brand?.name ?? ""} placeholder="Leeg laten voor geen merk" />
      </label>
      <label className={styles.label}>Productnaam
        <input className={styles.input} name="productName" defaultValue={values?.productName ?? product.name} />
      </label>
      {errors?.productName ? <p className={styles.formError}>{errors.productName}</p> : null}
      <div className={styles.actions}>
        <button className={styles.primaryButton} type="submit">Opslaan</button>
        <button className={styles.secondaryButton} type="button" onClick={onCancel}>Annuleren</button>
      </div>
    </Form>
  );
}

function CategoryBreadcrumb({ path }: { readonly path: ReadonlyArray<{ readonly id: number; readonly name: string }> }): React.ReactNode {
  return (
    <nav className={styles.breadcrumb} aria-label="Categoriepad">
      <Link to="/admin/product-catalogus">Alle categorieën</Link>
      {path.map((category) => <span key={category.id}>› <Link to={`/admin/product-catalogus?categoryId=${category.id}`}>{category.name}</Link></span>)}
    </nav>
  );
}

function NotFound({ backUrl, text }: { readonly backUrl: string; readonly text: string }): React.ReactNode {
  return <main className={styles.page}><section className={styles.card}><p>{text}</p><Link className={styles.primaryLink} to={backUrl}>Terug naar productcatalogus</Link></section></main>;
}

function buildBackUrl(url: URL): string {
  const categoryId = url.searchParams.get("categoryId");
  if (categoryId) return `/admin/product-catalogus?categoryId=${categoryId}`;
  const brandId = url.searchParams.get("brandId");
  if (brandId) return `/admin/product-catalogus?brandId=${brandId}`;
  return "/admin/product-catalogus";
}

function contextSearch(backUrl: string): string {
  const query = backUrl.split("?")[1];
  return query ? `?${query}` : "";
}
