import type { LoaderFunctionArgs } from "react-router";
import { getBrands } from "../../api/admin-dashboard-api.server";

/** Returns brand suggestions without loading the full new-product form data. */
export async function loadBrandLookupRoute({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const brandQuery = url.searchParams.get("merk")?.trim() ?? "";
  return { brandQuery, brands: await getBrands(brandQuery) };
}
