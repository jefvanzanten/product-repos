import AdminLayout from "@product-repos/admin-dashboard/react-router/admin-layout";
import type { ReactNode } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { requireAdministrator } from "../auth.server";

/** Require an administrator before loading any shared admin child route. */
export async function loader({ request }: LoaderFunctionArgs): Promise<null> {
  await requireAdministrator(request);
  return null;
}

/**
 * Render the shared admin layout for the Calorie Tracker admin route.
 *
 * @returns The shared admin dashboard layout.
 */
export default function AdminLayoutRoute(): ReactNode {
  return <AdminLayout />;
}
