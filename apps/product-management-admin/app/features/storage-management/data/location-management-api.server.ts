import {
  locationErrorResponseSchema,
  locationTreeNodeSchema,
  type LocationErrorResponse,
  type LocationTreeNode as LocationTreeNodeTransport,
} from "@product-repos/contracts/locations";
import { sendBackendRequest, type BackendMethod, type BackendRequestContext } from "../../../core/data/backend-api.server";
import type { CreateLocation, LocationTreeNode, UpdateLocation } from "../domain/location";

const locationTreeSchema = locationTreeNodeSchema.array();

/** Classified backend Location protocol failure. */
export class LocationApiError extends Error {
  readonly kind = "LocationApiFailure";
  readonly code: LocationErrorResponse["code"];

  /**
   * Create a safe backend API error.
   *
   * @param status - Backend HTTP status.
   * @param body - Strict parsed Location error response.
   */
  constructor(readonly status: number, readonly body: LocationErrorResponse) {
    super(body.message);
    this.code = body.code;
  }
}

/**
 * Fetch the active or archived location forest with the incoming session.
 *
 * @param status - Requested route state.
 * @param context - Incoming React Router context.
 * @returns Strictly parsed location roots.
 */
export async function getLocationTree(status: "active" | "archived", context: BackendRequestContext): Promise<LocationTreeNode[]> {
  const path = status === "archived" ? "/locations?status=archived" : "/locations";
  return locationTreeSchema.parse(await requestBackend(path, context)).map(mapLocationTreeNode);
}

/**
 * Create one root or child location.
 *
 * @param input - Strict create context.
 * @param context - Incoming authenticated context.
 * @returns Created location node.
 */
export async function createLocation(input: CreateLocation, context: BackendRequestContext): Promise<LocationTreeNode> {
  return mapLocationTreeNode(locationTreeNodeSchema.parse(await requestBackend("/locations", context, "POST", input)));
}

/**
 * Rename and/or move one location.
 *
 * @param id - Stable location identifier.
 * @param input - Strict update context.
 * @param context - Incoming authenticated context.
 * @returns Updated location node.
 */
export async function updateLocation(id: number, input: UpdateLocation, context: BackendRequestContext): Promise<LocationTreeNode> {
  return mapLocationTreeNode(locationTreeNodeSchema.parse(await requestBackend(`/locations/${id}`, context, "PATCH", input)));
}

/**
 * Archive one active location.
 *
 * @param id - Stable location identifier.
 * @param context - Incoming authenticated context.
 * @returns Archived location node.
 */
export async function archiveLocation(id: number, context: BackendRequestContext): Promise<LocationTreeNode> {
  return mapLocationTreeNode(locationTreeNodeSchema.parse(await requestBackend(`/locations/${id}/archive`, context, "POST")));
}

/**
 * Restore one directly archived location.
 *
 * @param id - Stable location identifier.
 * @param context - Incoming authenticated context.
 * @returns Restored location node.
 */
export async function restoreLocation(id: number, context: BackendRequestContext): Promise<LocationTreeNode> {
  return mapLocationTreeNode(locationTreeNodeSchema.parse(await requestBackend(`/locations/${id}/restore`, context, "POST")));
}

/** Map a validated recursive location DTO into the frontend model. */
function mapLocationTreeNode(dto: LocationTreeNodeTransport): LocationTreeNode {
  return { ...dto, children: dto.children.map(mapLocationTreeNode) };
}

/**
 * Perform one session-forwarding backend context and parse unknown JSON.
 *
 * @param path - Backend API path.
 * @param context - Incoming context owning cookie and abort signal.
 * @param method - HTTP method.
 * @param body - Optional JSON body.
 * @returns Unknown JSON for contract parsing by the caller.
 */
async function requestBackend(path: string, context: BackendRequestContext, method: BackendMethod = "GET", body?: unknown): Promise<unknown> {
  const response = await sendBackendRequest(path, context, { method, body });
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
    : { code: "INTERNAL_ERROR", message: response.statusText || "Backend context failed" };
}
