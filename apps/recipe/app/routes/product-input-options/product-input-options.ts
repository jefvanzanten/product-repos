import type { LoaderFunctionArgs } from "react-router";
import { loadProductInputOptionsRoute } from "./product-input-options-route.server";

/** Load the authenticated product input-options resource route. */
export function loader(args: LoaderFunctionArgs) {
  return loadProductInputOptionsRoute(args);
}
