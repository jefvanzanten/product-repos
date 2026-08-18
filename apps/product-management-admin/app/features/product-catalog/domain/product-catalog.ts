/** Product consumption types supported by the catalog. */
export type ConsumptionType = "FOOD" | "DRINK" | "SUPPLEMENT";

/** Reference bases supported by product macro profiles. */
export type MacroReferenceBasis = "PER_100_G" | "PER_100_ML" | "PER_UNIT";

/** Origin of a stored calorie value. */
export type CaloriesSource = "AUTOMATIC" | "MANUAL";

/** Frontend-owned macro values. */
export type MacroProfile = {
  readonly referenceBasis: MacroReferenceBasis;
  readonly caloriesKcal: string | null;
  readonly proteinG: string | null;
  readonly carbohydratesG: string | null;
  readonly fatG: string | null;
  readonly caloriesSource: CaloriesSource | null;
};

/** Persisted macro values and their calculation status. */
export type StoredMacroProfile = MacroProfile & { readonly enabled: boolean };

/** Explicit nutrition activation or non-destructive deactivation. */
export type MacroProfileMutation =
  | { readonly enabled: true; readonly profile: MacroProfile }
  | { readonly enabled: false };

/** Frontend-owned brand model. */
export type Brand = { readonly id: string; readonly name: string };

/** Frontend-owned category model. */
export type Category = { readonly id: number; readonly name: string; readonly parentId: number | null };

/** Frontend-owned package-type reference model. */
export type PackageType = { readonly id: number; readonly singularName: string; readonly pluralName: string };

/** Supported unit dimensions. */
export type UnitDimension = "MASS" | "VOLUME" | "COUNT";

/** Frontend-owned unit-type reference model. */
export type UnitType = {
  readonly id: number;
  readonly name: string;
  readonly symbol: string;
  readonly dimension: UnitDimension;
  readonly conversionToBase: string;
};

/** Shared product composition shown and edited by the admin app. */
export type ProductComposition = {
  readonly id: string;
  readonly name: string;
  readonly brand: Brand | null;
  readonly category: Category;
  readonly categoryPath: ReadonlyArray<Category>;
  readonly consumptionType: ConsumptionType | null;
  readonly macroProfile: StoredMacroProfile | null;
  readonly productCount: number;
  readonly activeProductCount?: number;
};

/** Concrete product summary used by catalog projections. */
export type ConcreteProductSummary = {
  readonly productId: string;
  readonly productCompositionId: string;
  readonly displayName: string;
  readonly compositionName: string;
  readonly brandName: string | null;
  readonly categoryPath: string;
  readonly consumptionType: ConsumptionType | null;
  readonly packageSummary: string | null;
  readonly imageUrl: string | null;
  readonly barcode: string | null;
  readonly archivedAt: string | null;
};

/** Cursor page of concrete products. */
export type ConcreteProductPage = {
  readonly items: ReadonlyArray<ConcreteProductSummary>;
  readonly cursor: string | null;
  readonly hasMore: boolean;
};

/** Complete concrete-product model used by detail and edit screens. */
export type ConcreteProductDetail = ConcreteProductSummary & {
  readonly composition: ProductComposition;
  readonly packageTypeId: number | null;
  readonly content: { readonly amount: string; readonly unitTypeId: number; readonly symbol: string; readonly dimension: UnitDimension } | null;
  readonly imageUrl: string | null;
  readonly barcode: string | null;
  readonly portion: { readonly singularName: string; readonly pluralName: string; readonly amount: string; readonly unitTypeId: number; readonly portionsPerProduct: number | null } | null;
  readonly archivedAt: string | null;
};

/** Input for creating a shared composition. */
export type CreateProductComposition = {
  readonly name: string;
  readonly brandId?: string | null;
  readonly categoryId: number;
  readonly consumptionType: ConsumptionType | null;
  readonly macroProfile?: MacroProfile | null;
};

/** Input for updating shared composition identity and classification. */
export type UpdateProductComposition = Omit<CreateProductComposition, "macroProfile">;

/** Product-specific portion mutation input. */
export type ConcreteProductPortionInput = {
  readonly singularName: string;
  readonly pluralName: string;
  readonly amount: string;
  readonly unitTypeId: number;
  readonly portionsPerProduct?: number | null;
};

/** Input for creating one concrete product. */
export type CreateConcreteProduct = {
  readonly productCompositionId: string;
  readonly packageTypeId?: number | null;
  readonly content?: { readonly amount: string; readonly unitTypeId: number } | null;
  readonly imageUrl?: string | null;
  readonly barcode?: string | null;
  readonly portion?: ConcreteProductPortionInput | null;
};

/** Input for updating fields owned by one concrete product. */
export type UpdateConcreteProduct = Omit<CreateConcreteProduct, "productCompositionId">;
