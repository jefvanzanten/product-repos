import { redirect, type LoaderFunctionArgs } from "react-router";
import { parseAdminSourceFromSearch, toAdminRedirectPath } from "../admin-navigation";
import { requireAdministrator } from "../auth.server";

/** Return metadata for the Product Management Admin root route. */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Product Management Admin" }];
}

/**
 * Redirect the authorized admin root to the product catalog while preserving source.
 *
 * @param args - React Router loader arguments.
 * @returns A basename-safe product-catalog redirect.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  await requireAdministrator(request);
  const source = parseAdminSourceFromSearch(new URL(request.url).searchParams);
  return redirect(toAdminRedirectPath("/product-catalogus", source));
}

/** Render no content while the admin root redirect is resolved. */
export default function AdminIndex(): null {
  return null;
}
