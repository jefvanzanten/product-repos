import type { Route } from "./+types/product-management";
import { normalizeProductTypeName } from "@product-repos/contracts/text";
import { redirect } from "react-router";
import ProductManagementPage from "../../../features/admin/product-management/components/ProductManagementPage";
import {
  createBrandForProductType,
  createProductExecution,
  createProductType,
  createProductVariant,
  getPackagingTypes,
  getProductResults,
  getUnitTypes,
} from "../../../features/admin/product-management/services/productService.server";
import {
  productManagementQueryParams,
  singleResultParamNames,
  type ProductManagementLoaderData,
} from "../../../features/admin/product-management/types";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function loader({
  request,
}: Route.LoaderArgs): Promise<ProductManagementLoaderData> {
  const searchParams = new URL(request.url).searchParams;
  const query = searchParams
    .get(productManagementQueryParams.search)
    ?.trim() ?? "";
  const selectedParam = singleResultParamNames.find((paramName) =>
    searchParams.get(paramName)?.trim(),
  );
  const selectedQuery = selectedParam
    ? searchParams.get(selectedParam)?.trim() ?? ""
    : "";
  const previousParam = singleResultParamNames.find(
    (paramName) =>
      paramName
      === searchParams
        .get(productManagementQueryParams.previousParam)
        ?.trim(),
  );
  const previousQuery = previousParam
    ? searchParams.get(productManagementQueryParams.previousQuery)?.trim() ?? ""
    : "";
  const resultQuery = selectedQuery || query;
  const result = resultQuery
    ? await getProductResults(resultQuery)
    : undefined;

  return {
    initialQuery: query,
    packagingTypes: await getPackagingTypes(),
    previousParam,
    previousQuery,
    query: resultQuery,
    result,
    selectedParam,
    unitTypes: await getUnitTypes(),
    view: selectedQuery ? "single" : query ? "multi" : "page",
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create-product-type") {
    const name = normalizeProductTypeName(String(formData.get("name") ?? ""));
    if (!name) {
      throw new Response("Producttype naam is verplicht", { status: 400 });
    }

    await createProductType({ name });

    return redirect(`/admin/product-management?q=${encodeURIComponent(name)}`);
  }

  if (intent === "create-brand") {
    const brandName = String(formData.get("brandName") ?? "").trim();
    const productTypeId = String(formData.get("productTypeId") ?? "").trim();

    if (!brandName || !productTypeId) {
      throw new Response("Merk en producttype zijn verplicht", { status: 400 });
    }

    try {
      await createBrandForProductType(productTypeId, { name: brandName });
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Merk aanmaken mislukt",
        ok: false,
      };
    }

    return { ok: true };
  }

  if (intent === "create-product-variant") {
    const name = String(formData.get("name") ?? "").trim();
    const productId = String(formData.get("productId") ?? "").trim();

    if (!name || !productId) {
      throw new Response("Variantnaam en merkproduct zijn verplicht", { status: 400 });
    }

    await createProductVariant({ name, productId });

    return { ok: true };
  }

  if (intent === "create-product-execution") {
    const amount = Number(formData.get("amount"));
    const packagingTypeName = String(formData.get("packagingTypeName") ?? "").trim();
    const productVariantId = String(formData.get("productVariantId") ?? "").trim();
    const unitTypeId = Number(formData.get("unitTypeId"));
    const unitsPerPackage = Number(formData.get("unitsPerPackage"));

    if (
      !Number.isFinite(amount)
      || amount <= 0
      || !packagingTypeName
      || !productVariantId
      || !Number.isInteger(unitTypeId)
      || unitTypeId <= 0
      || !Number.isInteger(unitsPerPackage)
      || unitsPerPackage <= 0
    ) {
      throw new Response(
        "Serving size, eenheid, verpakkingsmateriaal, aantal per verpakking en variant zijn verplicht",
        { status: 400 },
      );
    }

    await createProductExecution({
      amount,
      packagingTypeName,
      productVariantId,
      unitTypeId,
      unitsPerPackage,
    });

    return { ok: true };
  }

  throw new Response("Unsupported action", { status: 400 });
}

export default function ProductManagement(): React.ReactNode {
  return <ProductManagementPage />;
}
