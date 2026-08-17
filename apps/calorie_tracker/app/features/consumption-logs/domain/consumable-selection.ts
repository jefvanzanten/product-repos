import type { ProductSearchResult } from "./consumption-log";

/** Consumable selected while creating or editing a consumption log. */
export type ConsumableSelection =
  | { readonly kind: "PRODUCT"; readonly value: ProductSearchResult }
  | {
      readonly kind: "DISH";
      readonly value: {
        readonly id: string;
        readonly name: string;
        readonly imageUrl: string | null;
        readonly servings: string;
      };
    };
