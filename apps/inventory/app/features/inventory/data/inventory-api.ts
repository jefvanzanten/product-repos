import {
  inventoryErrorResponseSchema,
  inventoryProductSearchResultSchema,
  physicalInventoryItemDetailSchema,
  physicalInventoryItemSchema,
  physicalInventoryPageSchema,
  productStockThresholdSchema,
  type InventoryErrorCode,
} from "@product-repos/contracts/inventory";
import { locationTreeNodeSchema } from "@product-repos/contracts/locations";
import { readUnknownJson } from "@product-repos/shared/backend-response";
import { sendBackendRequest, type BackendRequest, type BackendTransportFailure } from "../../../core/data/backend-api";
import { redirectExpiredInventorySession } from "../../../core/data/auth/session-expiry";
import { deriveInventoryItemChanges } from "../domain/inventory-item-edit";
import type {
  AddPhysicalInventoryItems,
  InventoryFilter,
  InventoryItemDraft,
  InventoryLocation,
  InventoryProduct,
  PhysicalInventoryItem,
  PhysicalInventoryItemDetail,
  PhysicalInventoryPage,
  ProductStockThreshold,
  UpdateStockThreshold,
} from "../domain/inventory";
import {
  mapInventoryLocation,
  mapInventoryProduct,
  mapPhysicalInventoryItem,
  mapPhysicalInventoryItemDetail,
  mapPhysicalInventoryPage,
} from "./inventory-mappers";

/** Parsed success or classified Inventory API failure. */
export type InventoryApiOutcome<T> =
  | { readonly tag: "Success"; readonly value: T }
  | { readonly tag: "Failure"; readonly error: InventoryApiFailure };

/** Failures classified by the Inventory browser adapter. */
export type InventoryApiFailure =
  | BackendTransportFailure
  | { readonly tag: "SessionExpired" }
  | { readonly tag: "HttpFailure"; readonly status: number; readonly code: InventoryErrorCode; readonly message: string }
  | { readonly tag: "InvalidResponse"; readonly issues: ReadonlyArray<string> };

type ProtocolSchema<T> = {
  readonly safeParse: (input: unknown) =>
    | { readonly success: true; readonly data: T }
    | { readonly success: false; readonly error: { readonly issues: ReadonlyArray<{ readonly message: string }> } };
};

type InventoryListRequest = {
  readonly query: string | null;
  readonly filter: InventoryFilter;
  readonly cursor: string | null;
  readonly signal?: AbortSignal;
};

/** Fetch one page of physical-inventory product groups. */
export async function getPhysicalInventoryItems(request: InventoryListRequest): Promise<InventoryApiOutcome<PhysicalInventoryPage>> {
  const search = new URLSearchParams({ limit: "30", filter: request.filter });
  if (request.query !== null) search.set("query", request.query);
  if (request.cursor !== null) search.set("cursor", request.cursor);
  return requestJson(`/inventory-items?${search}`, physicalInventoryPageSchema, mapPhysicalInventoryPage, { method: "GET", signal: request.signal });
}

/** Fetch one physical-inventory item detail. */
export async function getPhysicalInventoryItem(itemId: string, signal?: AbortSignal): Promise<InventoryApiOutcome<PhysicalInventoryItemDetail>> {
  return requestJson(`/inventory-items/${encodeURIComponent(itemId)}`, physicalInventoryItemDetailSchema, mapPhysicalInventoryItemDetail, { method: "GET", signal });
}

/** Search active concrete products with measurable content. */
export async function searchInventoryProducts(query: string, signal?: AbortSignal): Promise<InventoryApiOutcome<ReadonlyArray<InventoryProduct>>> {
  return requestJson(
    `/inventory-items/products/search?${new URLSearchParams({ query, limit: "20" })}`,
    inventoryProductSearchResultSchema.array(),
    (dtos) => dtos.map(mapInventoryProduct),
    { method: "GET", signal },
  );
}

/** Create separate full physical-inventory packages. */
export async function addPhysicalInventoryItems(input: AddPhysicalInventoryItems): Promise<InventoryApiOutcome<ReadonlyArray<PhysicalInventoryItem>>> {
  return requestJson("/inventory-items", physicalInventoryItemSchema.array(), (dtos) => dtos.map(mapPhysicalInventoryItem), { method: "POST", body: input });
}

/** Persist all changed fields while carrying the latest optimistic version forward. */
export async function persistPhysicalInventoryItem(item: PhysicalInventoryItemDetail, draft: InventoryItemDraft): Promise<InventoryApiOutcome<PhysicalInventoryItemDetail | null>> {
  const changes = deriveInventoryItemChanges(item, draft);
  if (changes === null) return { tag: "Failure", error: { tag: "InvalidResponse", issues: ["Invalid inventory item draft"] } };
  let current = item;
  for (const change of changes) {
    const result = change.tag === "Move"
      ? await updatePhysicalInventoryLocation(item.id, change.locationId, current.version)
      : change.tag === "ChangeExpiry"
        ? await updatePhysicalInventoryExpiry(item.id, change.expiryDate, current.version)
        : await updatePhysicalInventoryContent(item.id, change.remainingAmountBase, current.version);
    if (result.tag === "Failure") return result;
    if (result.value === null) return result;
    current = result.value;
  }
  return { tag: "Success", value: current };
}

/** Remove one physical package from active inventory. */
export async function removePhysicalInventoryItem(itemId: string, version: number): Promise<InventoryApiOutcome<null>> {
  return requestOptionalJson(`/inventory-items/${encodeURIComponent(itemId)}`, nullSchema, (value) => value, { method: "DELETE", body: { version } });
}

/** Set a product's manual low-stock threshold. */
export async function updateProductStockThreshold(productId: string, input: UpdateStockThreshold): Promise<InventoryApiOutcome<ProductStockThreshold>> {
  return requestJson(
    `/inventory-items/products/${encodeURIComponent(productId)}/low-stock-threshold`,
    productStockThresholdSchema,
    (dto) => ({ ...dto }),
    { method: "PUT", body: input },
  );
}

/** Fetch the active storage-location tree. */
export async function getActiveLocations(signal?: AbortSignal): Promise<InventoryApiOutcome<ReadonlyArray<InventoryLocation>>> {
  return requestJson("/locations", locationTreeNodeSchema.array(), (dtos) => dtos.map(mapInventoryLocation), { method: "GET", signal });
}

/** Update one physical package's remaining content. */
async function updatePhysicalInventoryContent(itemId: string, remainingAmountBase: string, version: number): Promise<InventoryApiOutcome<PhysicalInventoryItemDetail | null>> {
  return requestOptionalJson(`/inventory-items/${encodeURIComponent(itemId)}/content`, physicalInventoryItemDetailSchema, mapPhysicalInventoryItemDetail, { method: "PUT", body: { remainingAmountBase, version } });
}

/** Move one physical package. */
async function updatePhysicalInventoryLocation(itemId: string, locationId: number, version: number): Promise<InventoryApiOutcome<PhysicalInventoryItemDetail>> {
  return requestJson(`/inventory-items/${encodeURIComponent(itemId)}/location`, physicalInventoryItemDetailSchema, mapPhysicalInventoryItemDetail, { method: "PUT", body: { locationId, version } });
}

/** Set or clear one physical package's expiry date. */
async function updatePhysicalInventoryExpiry(itemId: string, expiryDate: string | null, version: number): Promise<InventoryApiOutcome<PhysicalInventoryItemDetail>> {
  return requestJson(`/inventory-items/${encodeURIComponent(itemId)}/expiry`, physicalInventoryItemDetailSchema, mapPhysicalInventoryItemDetail, { method: "PUT", body: { expiryDate, version } });
}

/** Perform a request and map its validated response into the domain model. */
async function requestJson<Dto, Model>(path: string, schema: ProtocolSchema<Dto>, map: (dto: Dto) => Model, request: BackendRequest): Promise<InventoryApiOutcome<Model>> {
  const response = await performRequest(path, request);
  if (response.tag === "Failure") return response;
  const parsed = schema.safeParse(response.value.body);
  return parsed.success
    ? { tag: "Success", value: map(parsed.data) }
    : { tag: "Failure", error: { tag: "InvalidResponse", issues: parsed.error.issues.map((issue) => issue.message) } };
}

/** Perform a request that may intentionally return an empty 204 body. */
async function requestOptionalJson<Dto, Model>(path: string, schema: ProtocolSchema<Dto>, map: (dto: Dto) => Model, request: BackendRequest): Promise<InventoryApiOutcome<Model | null>> {
  const response = await performRequest(path, request);
  if (response.tag === "Failure") return response;
  if (response.value.status === 204) return { tag: "Success", value: null };
  const parsed = schema.safeParse(response.value.body);
  return parsed.success
    ? { tag: "Success", value: map(parsed.data) }
    : { tag: "Failure", error: { tag: "InvalidResponse", issues: parsed.error.issues.map((issue) => issue.message) } };
}

type DecodedResponse = { readonly status: number; readonly body: unknown };

/** Perform transport, decode JSON and classify HTTP errors. */
async function performRequest(path: string, request: BackendRequest): Promise<InventoryApiOutcome<DecodedResponse>> {
  const transport = await sendBackendRequest(path, request);
  if (transport.tag === "Failure") return transport;
  const raw = await readUnknownJson(transport.response);
  if (transport.response.ok) return { tag: "Success", value: { status: transport.response.status, body: raw } };
  const parsed = inventoryErrorResponseSchema.safeParse(raw);
  if (!parsed.success) return { tag: "Failure", error: { tag: "InvalidResponse", issues: parsed.error.issues.map((issue) => issue.message) } };
  if (transport.response.status === 401 && parsed.data.code === "UNAUTHENTICATED") {
    redirectExpiredInventorySession();
    return { tag: "Failure", error: { tag: "SessionExpired" } };
  }
  return { tag: "Failure", error: { tag: "HttpFailure", status: transport.response.status, code: parsed.data.code, message: parsed.data.message } };
}

const nullSchema: ProtocolSchema<null> = {
  /** Parse only an intentional JSON null body. */
  safeParse: (value: unknown) => value === null
    ? { success: true, data: null }
    : { success: false, error: { issues: [{ message: "Expected no response body" }] } },
};
