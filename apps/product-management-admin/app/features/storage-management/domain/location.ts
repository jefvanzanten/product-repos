/** Location tree node owned by the frontend domain. */
export type LocationTreeNode = {
  readonly id: number;
  readonly name: string;
  readonly parentId: number | null;
  readonly path: string;
  readonly archivedAt: string | null;
  readonly isEffectivelyArchived: boolean;
  readonly children: LocationTreeNode[];
};

/** Input for creating a root or child location. */
export type CreateLocation = { readonly name: string; readonly parentId: number | null };

/** Input for renaming or moving a location. */
export type UpdateLocation = { readonly name?: string; readonly parentId?: number | null };
