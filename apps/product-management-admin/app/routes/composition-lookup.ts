import type { LoaderFunctionArgs } from "react-router";
import { createBackendRequestContext } from "../core/presentation/backend-request-context.server";
import { searchProductCompositions } from "../features/product-catalog/data/product-catalog-api.server";

/** Proxy authenticated product-composition autocomplete requests. */
export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return Response.json([]);
  return Response.json(await searchProductCompositions(query, createBackendRequestContext(request)));
}
