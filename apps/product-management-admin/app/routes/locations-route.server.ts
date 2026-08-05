import { createLocationRequestSchema, updateLocationRequestSchema } from "@product-repos/contracts/locations";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { archiveLocation, createLocation, getLocationTree, mapLocationApiError, restoreLocation, updateLocation } from "../api/location-management-api.server";
import type { LocationActionName, LocationActionResult, LocationLoaderData } from "../features/storage-management/location-management.types";

/**
 * Load the active tree or explicit archived forest.
 *
 * @param args - React Router loader arguments.
 * @returns Strict location route data.
 */
export async function loadLocationsRoute({ request }: LoaderFunctionArgs): Promise<LocationLoaderData> {
  const url = new URL(request.url);
  const rawStatus = url.searchParams.get("status");
  if (url.searchParams.has("status") && rawStatus !== "archived") {
    throw new Response("Ongeldig opbergplaatsenfilter.", { status: 400 });
  }
  const status = rawStatus === "archived" ? "archived" : "active";
  return { status, locations: await getLocationTree(status, request) };
}

/**
 * Dispatch the closed location action union from route-boundary FormData.
 *
 * @param args - React Router action arguments.
 * @returns Typed success or dialog error data.
 */
export async function handleLocationsRouteAction({ request }: ActionFunctionArgs): Promise<LocationActionResult> {
  const formData = await request.formData();
  const action = parseActionName(formData.get("_action"));
  if (action === null) return invalidAction(null, "Ongeldige beheeractie.");

  try {
    switch (action) {
      case "create": {
        const input = createLocationRequestSchema.safeParse({
          name: readText(formData, "name"),
          parentId: parseNullableId(formData.get("parentId")),
        });
        if (!input.success) return invalidAction(action, "Controleer de naam en bovenliggende opbergplaats.");
        return { ok: true, action, location: await createLocation(input.data, request) };
      }
      case "rename": {
        const id = parseRequiredId(formData.get("locationId"));
        const input = updateLocationRequestSchema.safeParse({ name: readText(formData, "name") });
        if (id === null || !input.success) return invalidAction(action, "Controleer de opbergplaats en naam.");
        return { ok: true, action, location: await updateLocation(id, input.data, request) };
      }
      case "move": {
        const id = parseRequiredId(formData.get("locationId"));
        const input = updateLocationRequestSchema.safeParse({ parentId: parseNullableId(formData.get("parentId")) });
        if (id === null || !input.success) return invalidAction(action, "Kies een geldige bestemming.");
        return { ok: true, action, location: await updateLocation(id, input.data, request) };
      }
      case "archive": {
        const id = parseRequiredId(formData.get("locationId"));
        if (id === null) return invalidAction(action, "Ongeldige opbergplaats.");
        return { ok: true, action, location: await archiveLocation(id, request) };
      }
      case "restore": {
        const id = parseRequiredId(formData.get("locationId"));
        if (id === null) return invalidAction(action, "Ongeldige opbergplaats.");
        return { ok: true, action, location: await restoreLocation(id, request) };
      }
    }
  } catch (error: unknown) {
    return { ok: false, action, errors: mapLocationApiError(error) };
  }
}

/**
 * Parse a closed action discriminator.
 *
 * @param value - Untrusted FormData value.
 * @returns Supported action or null.
 */
function parseActionName(value: FormDataEntryValue | null): LocationActionName | null {
  return value === "create" || value === "rename" || value === "move" || value === "archive" || value === "restore"
    ? value
    : null;
}

/**
 * Read a text FormData field without accepting files.
 *
 * @param formData - Submitted route form.
 * @param key - Field name.
 * @returns Text value or an empty validation sentinel.
 */
function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Parse an optional parent identifier where an empty value means root.
 *
 * @param value - Untrusted FormData value.
 * @returns Positive parent identifier, null root, or NaN validation sentinel.
 */
function parseNullableId(value: FormDataEntryValue | null): number | null {
  if (value === "" || value === null) return null;
  return parseRequiredId(value) ?? Number.NaN;
}

/**
 * Parse a positive integer FormData identifier.
 *
 * @param value - Untrusted FormData value.
 * @returns Positive integer or null.
 */
function parseRequiredId(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Create a standard route-boundary action validation result.
 *
 * @param action - Parsed action when available.
 * @param message - Safe Dutch validation message.
 * @returns Failed action result.
 */
function invalidAction(action: LocationActionName | null, message: string): LocationActionResult {
  return { ok: false, action, errors: { form: message } };
}
