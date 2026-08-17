import type { LoaderFunctionArgs } from "react-router";
import { loadProductSearchRoute } from "./product-search-route.server";

/** Load the authenticated product-search resource route. */
export function loader(args: LoaderFunctionArgs) {
  return loadProductSearchRoute(args);
}
