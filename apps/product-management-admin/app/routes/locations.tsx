import { isRouteErrorResponse, useLoaderData, useRouteError, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { AdminLink } from "../core/presentation/routing/admin-source-context";
import { requireAdministrator } from "../core/presentation/auth/auth.server";
import StorageManagementPage from "../features/storage-management/presentation/components/StorageManagementPage/StorageManagementPage";
import type { LocationActionResult, LocationLoaderData } from "../features/storage-management/presentation/types/location-management.types";
import { handleLocationsRouteAction, loadLocationsRoute } from "./locations-route.server";

/**
 * Authorize and load one location tree state.
 *
 * @param args - React Router loader arguments.
 * @returns Location management loader data.
 */
export async function loader(args: LoaderFunctionArgs): Promise<LocationLoaderData> {
  await requireAdministrator(args.request);
  return loadLocationsRoute(args);
}

/**
 * Authorize and dispatch one location management action.
 *
 * @param args - React Router action arguments.
 * @returns Typed fetcher action result.
 */
export async function action(args: ActionFunctionArgs): Promise<LocationActionResult> {
  await requireAdministrator(args.request);
  return handleLocationsRouteAction(args);
}

/**
 * Return route metadata for location management.
 *
 * @returns Location page title metadata.
 */
export function meta() {
  return [{ title: "Opbergplaatsen beheren" }];
}

/** Render the protected location management route. */
export default function StorageManagement(): React.ReactNode {
  return <StorageManagementPage loaderData={useLoaderData<LocationLoaderData>()} />;
}

/** Render a first-load status while route data is pending. */
export function HydrateFallback(): React.ReactNode {
  return <main><p role="status">Opbergplaatsen laden…</p></main>;
}

/** Render a route-scoped load failure with a retry action. */
export function ErrorBoundary(): React.ReactNode {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) && error.status === 403
    ? "Beheerderstoegang is vereist."
    : "De opbergplaatsen konden niet worden geladen.";
  return (
    <main>
      <h1>Opbergplaatsen</h1>
      <p role="alert">{message}</p>
      <AdminLink to="/locations">Opnieuw proberen</AdminLink>
    </main>
  );
}
