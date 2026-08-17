import { createLocationRequestSchema, updateLocationRequestSchema } from "@product-repos/contracts/locations";
import type { CreateLocation, UpdateLocation } from "../domain/location";

/** Parse an untrusted create-location command. */
export function parseCreateLocation(input: unknown): CreateLocation | null {
  const parsed = createLocationRequestSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

/** Parse an untrusted update-location command. */
export function parseUpdateLocation(input: unknown): UpdateLocation | null {
  const parsed = updateLocationRequestSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}
