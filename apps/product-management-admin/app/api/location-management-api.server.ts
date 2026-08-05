import { locationErrorResponseSchema, locationTreeNodeSchema, type CreateLocationRequest, type LocationErrorResponse, type LocationTreeNode, type UpdateLocationRequest } from "@product-repos/contracts/locations";
import type { LocationActionErrors } from "../features/storage-management/location-management.types";
import { sendBackendRequest, type BackendMethod } from "./backend-api.server";

const locationTreeSchema = locationTreeNodeSchema.array();

/** Classified backend Location protocol failure. */
class LocationApiError extends Error {
  /**
   * Create a safe backend API error.
   *
   * @param status - Backend HTTP status.
   * @param body - Strict parsed Location error response.
   */
  constructor(readonly status: number, readonly body: LocationErrorResponse) {
    super(body.message);
  }
}

/**
 * Fetch the active or archived location forest with the incoming session.
 *
 * @param status - Requested route state.
 * @param request - Incoming React Router request.
 * @returns Strictly parsed location roots.
 */
export async function getLocationTree(status: "active" | "archived", request: Request): Promise<LocationTreeNode[]> {
  const path = status === "archived" ? "/locations?status=archived" : "/locations";
  return locationTreeSchema.parse(await requestBackend(path, request));
}

/**
 * Create one root or child location.
 *
 * @param input - Strict create request.
 * @param request - Incoming authenticated request.
 * @returns Created location node.
 */
export async function createLocation(input: CreateLocationRequest, request: Request): Promise<LocationTreeNode> {
  return locationTreeNodeSchema.parse(await requestBackend("/locations", request, "POST", input));
}

/**
 * Rename and/or move one location.
 *
 * @param id - Stable location identifier.
 * @param input - Strict update request.
 * @param request - Incoming authenticated request.
 * @returns Updated location node.
 */
export async function updateLocation(id: number, input: UpdateLocationRequest, request: Request): Promise<LocationTreeNode> {
  return locationTreeNodeSchema.parse(await requestBackend(`/locations/${id}`, request, "PATCH", input));
}

/**
 * Archive one active location.
 *
 * @param id - Stable location identifier.
 * @param request - Incoming authenticated request.
 * @returns Archived location node.
 */
export async function archiveLocation(id: number, request: Request): Promise<LocationTreeNode> {
  return locationTreeNodeSchema.parse(await requestBackend(`/locations/${id}/archive`, request, "POST"));
}

/**
 * Restore one directly archived location.
 *
 * @param id - Stable location identifier.
 * @param request - Incoming authenticated request.
 * @returns Restored location node.
 */
export async function restoreLocation(id: number, request: Request): Promise<LocationTreeNode> {
  return locationTreeNodeSchema.parse(await requestBackend(`/locations/${id}/restore`, request, "POST"));
}

/**
 * Translate backend conflicts to contextual Dutch dialog errors.
 *
 * @param error - Unknown action failure.
 * @returns Name or form error safe for presentation.
 */
export function mapLocationApiError(error: unknown): LocationActionErrors {
  if (!(error instanceof LocationApiError)) return { form: "De wijziging kon niet worden opgeslagen. Probeer opnieuw." };
  switch (error.body.code) {
    case "LOCATION_ALREADY_EXISTS": return { name: "Op dit niveau bestaat al een opbergplaats met deze naam." };
    case "VALIDATION_ERROR": return { name: "Vul een geldige naam van maximaal 100 tekens in." };
    case "LOCATION_NOT_FOUND": return { form: "Deze opbergplaats bestaat niet meer. Vernieuw de pagina." };
    case "PARENT_LOCATION_NOT_FOUND": return { form: "De gekozen bovenliggende opbergplaats bestaat niet meer." };
    case "LOCATION_ARCHIVED": return { form: "Een gearchiveerde opbergplaats kan niet worden verplaatst." };
    case "PARENT_LOCATION_ARCHIVED": return { form: "De gekozen bovenliggende opbergplaats is gearchiveerd." };
    case "LOCATION_CYCLE": return { form: "Deze verplaatsing zou een ongeldige locatieboom maken." };
    case "LOCATION_ARCHIVED_BY_ANCESTOR": return { form: "Herstel eerst de bovenliggende gearchiveerde opbergplaats." };
    case "ADMIN_ROLE_REQUIRED": return { form: "Beheerderstoegang is vereist." };
    case "UNAUTHENTICATED": return { form: "Je sessie is verlopen. Log opnieuw in." };
    case "AUTH_UNAVAILABLE": return { form: "Authenticatie is tijdelijk niet beschikbaar." };
    case "INTERNAL_ERROR": return { form: "De wijziging kon niet worden opgeslagen. Probeer opnieuw." };
  }
}

/**
 * Perform one session-forwarding backend request and parse unknown JSON.
 *
 * @param path - Backend API path.
 * @param request - Incoming request owning cookie and abort signal.
 * @param method - HTTP method.
 * @param body - Optional JSON body.
 * @returns Unknown JSON for contract parsing by the caller.
 */
async function requestBackend(path: string, request: Request, method: BackendMethod = "GET", body?: unknown): Promise<unknown> {
  const response = await sendBackendRequest(path, request, { method, body });
  if (!response.ok) throw new LocationApiError(response.status, await parseErrorResponse(response));
  return response.json();
}

/**
 * Parse a backend error without trusting malformed transport data.
 *
 * @param response - Failed backend response.
 * @returns Strict Location error response or a generic internal fallback.
 */
async function parseErrorResponse(response: Response): Promise<LocationErrorResponse> {
  const value: unknown = await response.json().catch(() => null);
  const parsed = locationErrorResponseSchema.safeParse(value);
  return parsed.success
    ? parsed.data
    : { code: "INTERNAL_ERROR", message: response.statusText || "Backend request failed" };
}
