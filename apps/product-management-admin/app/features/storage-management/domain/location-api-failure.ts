/** Stable location failure codes understood by the admin UI. */
export type LocationFailureCode = "VALIDATION_ERROR" | "ADMIN_ROLE_REQUIRED" | "LOCATION_NOT_FOUND" | "PARENT_LOCATION_NOT_FOUND" | "LOCATION_ALREADY_EXISTS" | "LOCATION_ARCHIVED" | "PARENT_LOCATION_ARCHIVED" | "LOCATION_CYCLE" | "LOCATION_ARCHIVED_BY_ANCESTOR" | "UNAUTHENTICATED" | "AUTH_UNAVAILABLE" | "INTERNAL_ERROR";

/** Classified location failure exposed by the data boundary. */
export type LocationApiFailure = Error & {
  readonly kind: "LocationApiFailure";
  readonly status: number;
  readonly code: LocationFailureCode;
};

/** Determine whether an unknown failure is a classified location API failure. */
export function isLocationApiFailure(error: unknown): error is LocationApiFailure {
  return error instanceof Error && Reflect.get(error, "kind") === "LocationApiFailure";
}
