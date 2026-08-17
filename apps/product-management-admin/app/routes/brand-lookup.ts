import type { LoaderFunctionArgs } from "react-router";
import { getBrands } from "../features/product-catalog/data/product-catalog-api.server";
import { requireAdministrator } from "../core/presentation/auth/auth.server";
import { createBackendRequestContext } from "../core/presentation/backend-request-context.server";

/** Returns brand suggestions without loading the full new-product form data. */
export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdministrator(request);
  const url = new URL(request.url);
  const brandQuery = url.searchParams.get("merk")?.trim() ?? "";
  return { brandQuery, brands: await getBrands(brandQuery, createBackendRequestContext(request)) };
}
