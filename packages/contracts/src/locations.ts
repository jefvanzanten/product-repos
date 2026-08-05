import { z } from "zod/v4";

/** Positive persistent location identifier. */
export const locationIdSchema = z.number().int().positive();

/** Strict create payload for a root location or child location. */
export const createLocationRequestSchema = z.object({
  name: z.string(),
  parentId: locationIdSchema.nullable(),
}).strict();

/** Strict atomic rename and/or move payload. */
export const updateLocationRequestSchema = z.object({
  name: z.string().optional(),
  parentId: locationIdSchema.nullable().optional(),
}).strict().refine(
  (value) => value.name !== undefined || value.parentId !== undefined,
  { message: "At least one of name or parentId is required" },
);

/** Stable Location API error codes. */
export const locationErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "ADMIN_ROLE_REQUIRED",
  "LOCATION_NOT_FOUND",
  "PARENT_LOCATION_NOT_FOUND",
  "LOCATION_ALREADY_EXISTS",
  "LOCATION_ARCHIVED",
  "PARENT_LOCATION_ARCHIVED",
  "LOCATION_CYCLE",
  "LOCATION_ARCHIVED_BY_ANCESTOR",
  "UNAUTHENTICATED",
  "AUTH_UNAVAILABLE",
  "INTERNAL_ERROR",
]);

/** Strict error response returned by Location routes. */
export const locationErrorResponseSchema = z.object({
  code: locationErrorCodeSchema,
  message: z.string().min(1),
  fields: z.record(z.string(), z.string()).optional(),
}).strict();

/** Recursive strict location tree response node. */
export const locationTreeNodeSchema: z.ZodType<LocationTreeNode> = z.lazy(() => z.object({
  id: locationIdSchema,
  name: z.string().min(1).max(100),
  parentId: locationIdSchema.nullable(),
  path: z.string().min(1),
  archivedAt: z.iso.datetime().nullable(),
  isEffectivelyArchived: z.boolean(),
  children: z.array(locationTreeNodeSchema),
}).strict());

/** Recursive location tree node returned by the API. */
export type LocationTreeNode = {
  readonly id: number;
  readonly name: string;
  readonly parentId: number | null;
  readonly path: string;
  readonly archivedAt: string | null;
  readonly isEffectivelyArchived: boolean;
  readonly children: LocationTreeNode[];
};

export type CreateLocationRequest = z.infer<typeof createLocationRequestSchema>;
export type UpdateLocationRequest = z.infer<typeof updateLocationRequestSchema>;
export type LocationErrorCode = z.infer<typeof locationErrorCodeSchema>;
export type LocationErrorResponse = z.infer<typeof locationErrorResponseSchema>;
