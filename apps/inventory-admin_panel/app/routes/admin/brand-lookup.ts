import type { Route } from "./+types/brand-lookup";
import { getBrands } from "../../../features/admin/product-catalog/services/productCatalogService.server";

/** Returns brand suggestions without loading the full new-product form data. */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const brandQuery = url.searchParams.get("merk")?.trim() ?? "";
  return { brandQuery, brands: await getBrands(brandQuery) };
}
