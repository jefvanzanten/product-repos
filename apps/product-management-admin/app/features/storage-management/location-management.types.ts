import type { LocationTreeNode } from "@product-repos/contracts/locations";

/** Route loader payload for one active or archived tree state. */
export type LocationLoaderData = {
  readonly status: "active" | "archived";
  readonly locations: LocationTreeNode[];
};

/** User-facing location mutation errors returned without clearing dialog state. */
export type LocationActionErrors = {
  readonly name?: string;
  readonly form?: string;
};

/** Closed action result consumed by fetcher-owned dialogs. */
export type LocationActionResult =
  | { readonly ok: true; readonly action: LocationActionName; readonly location: LocationTreeNode }
  | { readonly ok: false; readonly action: LocationActionName | null; readonly errors: LocationActionErrors };

/** Form action discriminator accepted by the protected route. */
export type LocationActionName = "create" | "rename" | "move" | "archive" | "restore";
