import type { LoaderFunctionArgs } from "react-router";
import { Outlet, redirect } from "react-router";
import { requireAdministrator } from "../../auth.server";

export { meta } from "@product-repos/admin-dashboard/react-router/admin-index";

/** Forward only the exact admin root to the product catalog. */
export async function loader({
  request,
}: LoaderFunctionArgs): Promise<Response | null> {
  const pathname = new URL(request.url).pathname.replace(/\/+$/, "");
  if (pathname !== "/admin") return null;

  await requireAdministrator(request);
  return redirect("/admin/product-catalogus");
}

/** Render the selected child route below the admin URL prefix. */
export default function AdminRoute(): React.ReactNode {
  return <Outlet />;
}
