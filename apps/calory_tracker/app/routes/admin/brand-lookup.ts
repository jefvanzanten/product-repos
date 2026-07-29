import type { LoaderFunctionArgs } from "react-router";
import { loadBrandLookupRoute } from "@product-repos/admin-dashboard/react-router/brand-lookup.server";

/** Delegate the brand lookup loader to the shared admin package. */
export async function loader(args: LoaderFunctionArgs) {
  return loadBrandLookupRoute(args);
}
