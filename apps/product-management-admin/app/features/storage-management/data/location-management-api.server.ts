import {
  locationErrorResponseSchema,
  locationTreeNodeSchema,
  type LocationErrorResponse,
  type LocationTreeNode as LocationTreeNodeTransport,
} from "@product-repos/contracts/locations";
import type { ZodType } from "zod/v4";
import { sendBackendRequest, type BackendMethod, type BackendRequestContext } from "../../../core/data/backend-api.server";
import type { CreateLocation, LocationTreeNode, UpdateLocation } from "../domain/location";

const locationTreeSchema = locationTreeNodeSchema.array();
type LocationRequestBody = CreateLocation | UpdateLocation;

/** Classified backend Location protocol failure. */
export class LocationApiError extends Error {
  readonly kind = "LocationApiFailure";
  readonly code: LocationErrorResponse["code"];

  /** Create a safe backend API error. */
  constructor(readonly status: number, readonly body: LocationErrorResponse) {
    super(body.message);
    this.code = body.code;
  }
}

/** Fetch the active or archived location forest with the incoming session. */
export async function getLocationTree(status: "active" | "archived", context: BackendRequestContext): Promise<LocationTreeNode[]> {
  const path = status === "archived" ? "/locations?status=archived" : "/locations";
  return (await requestBackend(path, context, locationTreeSchema)).map(mapLocationTreeNode);
}

/** Create one root or child location. */
export async function createLocation(input: CreateLocation, context: BackendRequestContext): Promise<LocationTreeNode> {
  return mapLocationTreeNode(await requestBackend("/locations", context, locationTreeNodeSchema, "POST", input));
}

/** Rename and/or move one location. */
export async function updateLocation(id: number, input: UpdateLocation, context: BackendRequestContext): Promise<LocationTreeNode> {
  return mapLocationTreeNode(await requestBackend(`/locations/${id}`, context, locationTreeNodeSchema, "PATCH", input));
}

/** Archive one active location. */
export async function archiveLocation(id: number, context: BackendRequestContext): Promise<LocationTreeNode> {
  return mapLocationTreeNode(await requestBackend(`/locations/${id}/archive`, context, locationTreeNodeSchema, "POST"));
}

/** Restore one directly archived location. */
export async function restoreLocation(id: number, context: BackendRequestContext): Promise<LocationTreeNode> {
  return mapLocationTreeNode(await requestBackend(`/locations/${id}/restore`, context, locationTreeNodeSchema, "POST"));
}

/** Map a validated recursive location DTO into the frontend model. */
function mapLocationTreeNode(dto: LocationTreeNodeTransport): LocationTreeNode {
  return { ...dto, children: dto.children.map(mapLocationTreeNode) };
}

/** Perform one session-forwarding request and parse its endpoint contract. */
async function requestBackend<T>(path: string, context: BackendRequestContext, schema: ZodType<T>, method: BackendMethod = "GET", body?: LocationRequestBody): Promise<T> {
  const response = await sendBackendRequest(path, context, { method, body });
  if (!response.ok) throw new LocationApiError(response.status, await parseErrorResponse(response));
  return schema.parse(await response.json());
}

/** Parse a backend error without trusting malformed transport data. */
async function parseErrorResponse(response: Response): Promise<LocationErrorResponse> {
  const parsed = locationErrorResponseSchema.safeParse(await response.json().catch(() => null));
  return parsed.success
    ? parsed.data
    : { code: "INTERNAL_ERROR", message: response.statusText || "Backend request failed" };
}
