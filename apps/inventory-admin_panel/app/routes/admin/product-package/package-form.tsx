import type { Route } from "./+types/package-form";
import { Form, Link, redirect } from "react-router";
import { addProductPackage, getPackageTypes, getProduct, getUnitTypes, isNotFound, mapApiError } from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import type { FormErrors } from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import styles from "./product-package.module.css";

type LoaderData =
  | { readonly found: true; readonly product: Awaited<ReturnType<typeof getProduct>>; readonly packageTypes: Awaited<ReturnType<typeof getPackageTypes>>; readonly unitTypes: Awaited<ReturnType<typeof getUnitTypes>>; readonly context: string }
  | { readonly found: false; readonly context: string };

type ActionResult = { readonly errors?: FormErrors; readonly values?: Record<string, string> };

export function meta({}: Route.MetaArgs) {
  return [{ title: "Verpakking toevoegen" }];
}

export async function loader({ params, request }: Route.LoaderArgs): Promise<LoaderData> {
  const context = contextSearch(new URL(request.url));
  try {
    return { found: true, product: await getProduct(String(params.productId)), packageTypes: await getPackageTypes(), unitTypes: await getUnitTypes(), context };
  } catch (error) {
    if (isNotFound(error)) return { found: false, context };
    throw error;
  }
}

export async function action({ params, request }: Route.ActionArgs): Promise<ActionResult | Response> {
  const form = await request.formData();
  const values = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  try {
    const created = await addProductPackage(String(params.productId), readPackageForm(form));
    return redirect(`/admin/product-catalogus/${params.productId}/verpakkingen/${created.id}${contextSearch(new URL(request.url))}`);
  } catch (error) {
    return { errors: mapApiError(error), values };
  }
}

export default function PackageForm({ actionData, loaderData }: Route.ComponentProps): React.ReactNode {
  if (!loaderData.found) {
    return <main className={styles.page}><section className={styles.card}><p>Product niet gevonden.</p><Link className={styles.primaryLink} to="/admin/product-catalogus">Terug naar productcatalogus</Link></section></main>;
  }
  const values = actionData?.values ?? {};
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.backLink} to={`/admin/product-catalogus/${loaderData.product.id}${loaderData.context}`}>Terug naar product</Link>
        <h1 className={styles.title}>Verpakking toevoegen</h1>
        <p className={styles.intro}>{loaderData.product.displayName}</p>
      </header>
      <section className={styles.card}>
        <Form className={styles.form} method="post">
          {actionData?.errors?.form ? <p className={styles.formError}>{actionData.errors.form}</p> : null}
          <PackageFields packageTypes={loaderData.packageTypes} unitTypes={loaderData.unitTypes} values={values} errors={actionData?.errors} />
          <button className={styles.primaryButton} type="submit">Verpakking opslaan</button>
        </Form>
      </section>
    </main>
  );
}

function PackageFields({ errors, packageTypes, unitTypes, values }: { readonly errors?: FormErrors; readonly packageTypes: Awaited<ReturnType<typeof getPackageTypes>>; readonly unitTypes: Awaited<ReturnType<typeof getUnitTypes>>; readonly values: Record<string, string> }): React.ReactNode {
  return (
    <>
      <label className={styles.label}>Verpakkingstype
        <select className={styles.input} name="packageTypeId" defaultValue={values.packageTypeId ?? ""} required>
          <option value="">Kies verpakkingstype</option>
          {packageTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className={styles.label}>Inhoud
        <input className={styles.input} name="amount" defaultValue={values.amount ?? ""} placeholder="1,5" />
      </label>
      {errors?.amount ? <p className={styles.formError}>{errors.amount}</p> : null}
      <label className={styles.label}>Inhoudseenheid
        <select className={styles.input} name="unitTypeId" defaultValue={values.unitTypeId ?? ""} required>
          <option value="">Kies eenheid</option>
          {unitTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className={styles.label}>Aantal per verpakking
        <input className={styles.input} name="unitsPerPackage" type="number" defaultValue={values.unitsPerPackage ?? "1"} />
      </label>
    </>
  );
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
