import { createLocationRequestSchema, updateLocationRequestSchema } from "@product-repos/contracts/locations";
import type { CreateLocation, UpdateLocation } from "../domain/location";

/** Parse an untrusted create-location command. */
export function parseCreateLocation(input: Parameters<typeof createLocationRequestSchema.safeParse>[0]): CreateLocation | null {
  const parsed = createLocationRequestSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

/** Parse an untrusted update-location command. */
export function parseUpdateLocation(input: Parameters<typeof updateLocationRequestSchema.safeParse>[0]): UpdateLocation | null {
  const parsed = updateLocationRequestSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}
