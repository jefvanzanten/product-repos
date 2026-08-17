import type { ConsumptionType, ConsumptionTypeFilter } from "../../../core/domain/consumption-types";

/** Ways a product quantity can be logged. */
export type ConsumptionInputMode = "FULL_PRODUCT" | "PRODUCT_PORTION" | "CONTENT_UNIT";

/** Unit information needed by the log flow. */
export type UnitType = {
  readonly id: number;
  readonly name: string;
  readonly symbol: string;
  readonly dimension: "MASS" | "VOLUME" | "COUNT";
  readonly conversionToBase: string;
};

/** Product package type shown in consumption views. */
export type ProductPackageType = {
  readonly id: number;
  readonly name: string;
};

/** Optional product portion shown in consumption views. */
export type ProductPortion = {
  readonly name: string;
  readonly contentAmount: string;
  readonly contentUnit: UnitType;
  readonly portionsPerPackage: number | null;
};

/** Product available for consumption logging. */
export type ProductSearchResult = {
  readonly productId: string;
  readonly productName: string;
  readonly displayName: string;
  readonly brand: { readonly id: string; readonly name: string } | null;
  readonly consumptionType: ConsumptionType;
  readonly packageType: ProductPackageType;
  readonly contentAmount: string;
  readonly contentUnit: UnitType;
  readonly portion: ProductPortion | null;
  readonly packageSummary: string;
  readonly imageUrl: string | null;
};

/** Input unit available for one product. */
export type AvailableInputUnit = {
  readonly inputMode: ConsumptionInputMode;
  readonly unitType: UnitType | null;
  readonly label: string;
};

/** Nutrition values attached to a log. */
export type MacroValues = {
  readonly caloriesKcal: string | null;
  readonly proteinG: string | null;
  readonly carbohydratesG: string | null;
  readonly fatG: string | null;
};

type ConsumptionLogBase = {
  readonly id: string;
  readonly quantity: string;
  readonly consumedAt: string;
  readonly timezone: string;
  readonly localDate: string;
  readonly derivedQuantityLabel: string;
  readonly macroValues: MacroValues | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** Existing product consumption log. */
export type ProductConsumptionLog = ConsumptionLogBase & {
  readonly type: "PRODUCT";
  readonly product: ProductSearchResult & { readonly archived: boolean };
  readonly inputMode: ConsumptionInputMode;
  readonly inputUnitType: UnitType | null;
};

/** Existing dish consumption log. */
export type DishConsumptionLog = ConsumptionLogBase & {
  readonly type: "DISH";
  readonly dish: {
    readonly id: string;
    readonly userId: string;
    readonly name: string;
    readonly imageUrl: string | null;
    readonly versionId: string;
    readonly servings: string;
    readonly recipeAccessible: boolean;
  };
};

/** Existing consumption log. */
export type ConsumptionLog = ProductConsumptionLog | DishConsumptionLog;

/** Date-scoped list of consumption logs. */
export type ConsumptionLogList = {
  readonly date: string;
  readonly timezone: string;
  readonly type: ConsumptionTypeFilter;
  readonly items: ReadonlyArray<ConsumptionLog>;
};

/** Search result used by the combined consumable picker. */
export type UnifiedSearchResult =
  | ({ readonly kind: "PRODUCT" } & ProductSearchResult)
  | {
      readonly kind: "DISH";
      readonly id: string;
      readonly userId: string;
      readonly name: string;
      readonly makerDisplayName: string | null;
      readonly isOwnedByViewer: boolean;
      readonly imageUrl: string | null;
      readonly servings: string;
      readonly caloriesPerServing: string | null;
    };

/** Add/edit form mode with current data when editing. */
export type LogFormMode =
  | { readonly tag: "Create" }
  | { readonly tag: "Edit"; readonly log: ConsumptionLog };

/** Command for creating a consumption log. */
export type CreateConsumptionLog =
  | {
      readonly id: string;
      readonly type: "PRODUCT";
      readonly productId: string;
      readonly quantity: string;
      readonly inputMode: ConsumptionInputMode;
      readonly inputUnitTypeId: number | null;
      readonly consumedAt: string;
    }
  | {
      readonly id: string;
      readonly type: "DISH";
      readonly dishId: string;
      readonly quantity: string;
      readonly consumedAt: string;
    };

/** Command for updating a consumption log. */
export type UpdateConsumptionLog =
  | {
      readonly expectedUpdatedAt: string;
      readonly type: "PRODUCT";
      readonly productId: string;
      readonly quantity: string;
      readonly inputMode: ConsumptionInputMode;
      readonly inputUnitTypeId: number | null;
      readonly consumedAt: string;
    }
  | {
      readonly expectedUpdatedAt: string;
      readonly type: "DISH";
      readonly quantity: string;
      readonly consumedAt: string;
    };

/** Result of soft-deleting a consumption log. */
export type DeleteLogResult = {
  readonly id: string;
  readonly deletedAt: string;
  readonly restoreUntil: string;
};
