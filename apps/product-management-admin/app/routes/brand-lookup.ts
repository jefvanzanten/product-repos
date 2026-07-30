import type { LoaderFunctionArgs } from "react-router";
import { getBrands } from "../api/admin-dashboard-api.server";
import { requireAdministrator } from "../auth.server";

/** Returns brand suggestions without loading the full new-product form data. */
export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdministrator(request);
  const url = new URL(request.url);
  const brandQuery = url.searchParams.get("merk")?.trim() ?? "";
  return { brandQuery, brands: await getBrands(brandQuery, request) };
}
