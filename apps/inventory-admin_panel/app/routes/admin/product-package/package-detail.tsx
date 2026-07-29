import type { Route } from "./+types/package-detail";
import { useEffect, useState } from "react";
import { Form, Link } from "react-router";
import { getPackageTypes, getProduct, getProductPackage, getUnitTypes, isNotFound, mapApiError, updateProductPackage } from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import type { FormErrors, ProductPackageWithProductId } from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import styles from "./product-package.module.css";

type LoaderData =
  | { readonly found: true; readonly product: Awaited<ReturnType<typeof getProduct>>; readonly packageDetail: ProductPackageWithProductId; readonly packageTypes: Awaited<ReturnType<typeof getPackageTypes>>; readonly unitTypes: Awaited<ReturnType<typeof getUnitTypes>>; readonly context: string }
  | { readonly found: false; readonly productFound: boolean; readonly productId: string; readonly context: string };

type ActionResult = { readonly ok?: true; readonly errors?: FormErrors; readonly packageDetail?: ProductPackageWithProductId; readonly values?: Record<string, string> };

export function meta({}: Route.MetaArgs) {
  return [{ title: "Verpakking" }];
}

export async function loader({ params, request }: Route.LoaderArgs): Promise<LoaderData> {
  const productId = String(params.productId);
  const packageId = String(params.packageId);
  const context = contextSearch(new URL(request.url));
  try {
    const product = await getProduct(productId);
    return { found: true, product, packageDetail: await getProductPackage(productId, packageId), packageTypes: await getPackageTypes(), unitTypes: await getUnitTypes(), context };
  } catch (error) {
    if (isNotFound(error)) return { found: false, productFound: false, productId, context };
    throw error;
  }
}

export async function action({ params, request }: Route.ActionArgs): Promise<ActionResult> {
  const form = await request.formData();
  const values = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  try {
    return { ok: true, packageDetail: await updateProductPackage(String(params.productId), String(params.packageId), readPackageForm(form)) };
  } catch (error) {
    return { errors: mapApiError(error), values };
  }
}

export default function PackageDetail({ actionData, loaderData }: Route.ComponentProps): React.ReactNode {
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (actionData?.ok) setEditing(false);
  }, [actionData?.ok]);

  if (!loaderData.found) {
    return <main className={styles.page}><section className={styles.card}><p>{loaderData.productFound ? "Verpakking niet gevonden." : "Product niet gevonden."}</p><Link className={styles.primaryLink} to="/admin/product-catalogus">Terug naar productcatalogus</Link></section></main>;
  }

  const packageDetail = actionData?.packageDetail ?? loaderData.packageDetail;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.backLink} to={`/admin/product-catalogus/${loaderData.product.id}${loaderData.context}`}>Terug naar product</Link>
        <h1 className={styles.title}>Verpakking</h1>
        <p className={styles.intro}>{loaderData.product.displayName}</p>
      </header>
      <section className={styles.card}>
        {editing ? (
          <Form className={styles.form} method="post">
            {actionData?.errors?.form ? <p className={styles.formError}>{actionData.errors.form}</p> : null}
            <PackageFields packageTypes={loaderData.packageTypes} unitTypes={loaderData.unitTypes} values={actionData?.values ?? packageToValues(packageDetail)} errors={actionData?.errors} />
            <div className={styles.actions}>
              <button className={styles.primaryButton} type="submit">Opslaan</button>
              <button className={styles.secondaryButton} type="button" onClick={() => setEditing(false)}>Annuleren</button>
            </div>
          </Form>
        ) : (
          <section className={styles.form}>
            <h2 className={styles.sectionTitle}>Verpakking</h2>
            <dl className={styles.definitionList}>
              <div><dt>Type</dt><dd>{packageDetail.packageType.name}</dd></div>
              <div><dt>Inhoud</dt><dd>{packageDetail.unitContent.amount} {packageDetail.unitContent.unitType.name}</dd></div>
              <div><dt>Aantal per verpakking</dt><dd>{packageDetail.unitsPerPackage}</dd></div>
              <div><dt>Samenvatting</dt><dd>{packageDetail.summary}</dd></div>
            </dl>
            <button className={styles.secondaryButton} type="button" onClick={() => setEditing(true)}>Verpakking bewerken</button>
          </section>
        )}
      </section>
    </main>
  );
}

function PackageFields({ errors, packageTypes, unitTypes, values }: { readonly errors?: FormErrors; readonly packageTypes: Awaited<ReturnType<typeof getPackageTypes>>; readonly unitTypes: Awaited<ReturnType<typeof getUnitTypes>>; readonly values: Record<string, string> }): React.ReactNode {
  return (
    <>
      <label className={styles.label}>Verpakkingstype
        <select className={styles.input} name="packageTypeId" defaultValue={values.packageTypeId ?? ""} required>
          {packageTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className={styles.label}>Inhoud
        <input className={styles.input} name="amount" defaultValue={values.amount ?? ""} />
      </label>
      {errors?.amount ? <p className={styles.formError}>{errors.amount}</p> : null}
      <label className={styles.label}>Inhoudseenheid
        <select className={styles.input} name="unitTypeId" defaultValue={values.unitTypeId ?? ""} required>
          {unitTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className={styles.label}>Aantal per verpakking
        <input className={styles.input} name="unitsPerPackage" type="number" defaultValue={values.unitsPerPackage ?? "1"} />
      </label>
    </>
  );
}

function packageToValues(packageDetail: ProductPackageWithProductId): Record<string, string> {
  return {
    packageTypeId: String(packageDetail.packageType.id),
    amount: packageDetail.unitContent.amount,
    unitTypeId: String(packageDetail.unitContent.unitType.id),
    unitsPerPackage: String(packageDetail.unitsPerPackage),
  };
}

function readPackageForm(form: FormData) {
  return {
    packageTypeId: Number(form.get("packageTypeId")),
    amount: String(form.get("amount") ?? "").trim().replace(",", "."),
    unitTypeId: Number(form.get("unitTypeId")),
    unitsPerPackage: Number(form.get("unitsPerPackage")),
  };
}

function contextSearch(url: URL): string {
  const params = new URLSearchParams();
  const categoryId = url.searchParams.get("categoryId");
  const brandId = url.searchParams.get("brandId");
  if (categoryId) params.set("categoryId", categoryId);
  if (brandId) params.set("brandId", brandId);
  const query = params.toString();
  return query ? `?${query}` : "";
}
