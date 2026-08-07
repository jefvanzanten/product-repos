import type { Dish, PackageSearchResult } from "@product-repos/contracts/calorie-tracker";
import type { TrackerUrlState } from "../../../domain/consumption-types";

/** Data supplied by the protected create-dish route loader. */
export type DishFormLoaderData = {
  readonly timezone: string | null;
  readonly routeState: TrackerUrlState | null;
  readonly initialPackages: ReadonlyArray<PackageSearchResult>;
  readonly loadFailed: boolean;
};

/** Result returned by the protected create-dish route action. */
export type DishFormActionResult =
  | { readonly ok: true; readonly dish: Dish }
  | { readonly ok: false; readonly error: string };
