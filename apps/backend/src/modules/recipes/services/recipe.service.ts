import type {
  CreateRecipe,
  RecipeArchiveResult,
  RecipeDetail,
  RecipeIngredientInput,
  RecipeIngredientInputOptions,
  RecipeErrorCode,
  RecipePage,
  RecipeProductSearchResult,
  RecipeSort,
  UpdateRecipe,
} from "@product-repos/contracts/recipes";
import { canonicalDecimal, deriveConsumptionQuantity, parsePositiveDecimal } from "../../calorie-tracker/domain/calorie-tracker-domain.ts";
import { ingredientsEqual, normalizeInstructions } from "../domain/recipe-domain.ts";
import type { DishIngredientRecord, DishRecord, DishRepository } from "../repositories/dish.repository.ts";
import { nextTimestamp, type Clock } from "../../calorie-tracker/services/calorie-tracker-service-support.ts";
import { toProductSearchResult, toQuantityPackage, toUnitType } from "../../calorie-tracker/services/calorie-tracker-projections.ts";
import { formatConcreteProductDisplayName } from "@product-repos/shared/product-presentation";
import type { ConsumptionCatalogReader, UnitTypeRecord } from "../../catalog/repositories/consumption-catalog.repository.ts";

/** Expected recipe API failure. */
export type RecipeError = {
  readonly code: RecipeErrorCode;
  readonly message: string;
  readonly fields?: Readonly<Record<string, string>>;
};

/** Explicit outcome of a recipe use case. */
export type RecipeResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: RecipeError };

/** Recipe list options after HTTP query parsing. */
export type RecipeListOptions = {
  readonly query: string;
  readonly sort: RecipeSort;
  readonly cursor?: string;
  readonly limit: number;
  readonly archived?: boolean;
};

/** Recipe application use cases. */
export type RecipeService = ReturnType<typeof createRecipeService>;

/** Create recipe use cases around dishes and concrete catalog products. */
export function createRecipeService(dependencies: {
  readonly catalogReader: ConsumptionCatalogReader;
  readonly dishRepository: DishRepository;
  readonly clock: Clock;
}) {
  const { catalogReader, dishRepository, clock } = dependencies;

  /** Parse ingredient quantities and validate product/unit compatibility. */
  function parseIngredients(inputs: ReadonlyArray<RecipeIngredientInput>): RecipeResult<ReadonlyArray<RecipeIngredientInput>> {
    if (inputs.length === 0) return failure("VALIDATION_ERROR", "A recipe requires at least one ingredient", { ingredients: "Minimum one ingredient" });
    const parsed: RecipeIngredientInput[] = [];
    for (const input of inputs) {
      const product = catalogReader.findCatalogProduct(input.productId);
      if (product === undefined) return failure("REFERENCE_NOT_FOUND", "Product not found");
      if (product.productArchivedAt !== null) return failure("PRODUCT_ARCHIVED", "Archived products must be replaced");
      if (product.consumptionType === null) return failure("PRODUCT_NOT_CONSUMABLE", "Non-consumable products must be replaced");
      const quantity = parsePositiveDecimal(input.quantity);
      if (!quantity.ok) return failure("VALIDATION_ERROR", "Ingredient quantity is invalid");
      const inputUnit = input.inputUnitTypeId == null ? null : catalogReader.findUnitType(input.inputUnitTypeId) ?? null;
      if (input.inputMode === "CONTENT_UNIT" && inputUnit === null) return failure("REFERENCE_NOT_FOUND", "Input unit not found");
      if (product.macroProfile !== null) {
        const derived = deriveConsumptionQuantity(toQuantityPackage(product), {
          quantity: quantity.value,
          inputMode: input.inputMode,
          inputUnit,
        });
        if (!derived.ok) return failure("VALIDATION_ERROR", "Ingredient unit is incompatible");
      } else if (input.inputMode === "PRODUCT_PORTION" && product.portionName === null) {
        return failure("VALIDATION_ERROR", "Product portion is unavailable");
      }
      parsed.push({ ...input, quantity: quantity.value, inputUnitTypeId: input.inputUnitTypeId ?? null });
    }
    return success(parsed);
  }

  /** Project live recipe stem fields into the public summary contract. */
  function toSummary(stem: DishRecord): RecipePage["items"][number] {
    return {
      id: stem.id,
      userId: stem.userId,
      makerDisplayName: dishRepository.findMakerDisplayName(stem.userId),
      name: stem.name,
      visibility: stem.visibility,
      archivedAt: stem.archivedAt,
      createdAt: stem.createdAt,
      updatedAt: stem.updatedAt,
    };
  }

  /** List public, non-archived recipes. */
  function listPublic(options: RecipeListOptions): RecipeResult<RecipePage> {
    return listRecipes(undefined, undefined, { ...options, archived: false });
  }

  /** List recipes on a maker route under viewer visibility rules. */
  function listForUser(viewerUserId: string | undefined, userId: string, options: RecipeListOptions): RecipeResult<RecipePage> {
    const isOwner = viewerUserId === userId;
    if (options.archived === true && !isOwner) return notFound();
    return listRecipes(userId, isOwner ? userId : undefined, options);
  }

  /** Read a recipe detail without revealing inaccessible stems. */
  function getRecipe(viewerUserId: string | undefined, userId: string, dishId: string): RecipeResult<RecipeDetail> {
    const stem = dishRepository.findDishById(dishId);
    if (stem === undefined || stem.userId !== userId || stem.deletedAt !== null) return notFound();
    const owner = stem.userId === viewerUserId;
    if (!owner && (stem.visibility !== "PUBLIC" || stem.archivedAt !== null)) return notFound();
    return projectDetail(stem, owner);
  }

  /** Create one private-by-default recipe and its first immutable content version. */
  function createRecipe(userId: string, input: CreateRecipe): RecipeResult<RecipeDetail> {
    const parsed = parseIngredients(input.ingredients);
    if (!parsed.ok) return parsed;
    if (dishRepository.existsActiveDishWithName(userId, input.name)) return duplicateName();
    const now = clock.now().toISOString();
    const dishId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const stem = dishRepository.insertDish({
      dish: {
        id: dishId,
        userId,
        name: input.name.trim(),
        imageUrl: null,
        visibility: input.visibility ?? "PRIVATE",
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      version: {
        id: versionId,
        dishId,
        servings: canonicalDecimal(input.servings),
        instructions: normalizeInstructions(input.instructions),
        createdAt: now,
      },
      ingredients: toIngredientRows(versionId, parsed.value),
    });
    if (stem === undefined) return duplicateName();
    return projectDetail(stem, true);
  }

  /** Replace live fields and append a version only when content changed. */
  function updateRecipe(userId: string, dishId: string, input: UpdateRecipe): RecipeResult<RecipeDetail> {
    const stem = dishRepository.findDishById(dishId);
    if (stem === undefined || stem.userId !== userId || stem.deletedAt !== null) return notFound();
    if (stem.updatedAt !== input.expectedUpdatedAt) return conflict();
    if (input.name.trim().toLocaleLowerCase() !== stem.name.trim().toLocaleLowerCase()
      && dishRepository.existsActiveDishWithName(userId, input.name)) return duplicateName();
    const currentVersion = dishRepository.findNewestVersion(dishId);
    if (currentVersion === undefined) return internalFailure();
    const currentIngredients = dishRepository.findIngredientsByVersionId(currentVersion.id);
    const instructions = normalizeInstructions(input.instructions);
    const contentChanged = canonicalDecimal(currentVersion.servings) !== canonicalDecimal(input.servings)
      || currentVersion.instructions !== instructions
      || !ingredientsEqual(currentIngredients, input.ingredients);
    const parsed = contentChanged ? parseIngredients(input.ingredients) : success(input.ingredients);
    if (!parsed.ok) return parsed;
    const updatedAt = nextTimestamp(clock.now(), stem.updatedAt);
    const updatedStem = dishRepository.updateDishStem(userId, dishId, input.expectedUpdatedAt, {
      name: input.name.trim(),
      imageUrl: null,
      visibility: input.visibility,
      updatedAt,
    });
    if (updatedStem === undefined) return conflict();
    if (contentChanged) {
      const versionId = crypto.randomUUID();
      dishRepository.insertVersion({
        id: versionId,
        dishId,
        servings: canonicalDecimal(input.servings),
        instructions,
        createdAt: updatedAt,
      });
      dishRepository.insertIngredients(toIngredientRows(versionId, parsed.value));
    }
    return projectDetail(updatedStem, true);
  }

  /** Archive one owner recipe while retaining all version history. */
  function archiveRecipe(userId: string, dishId: string): RecipeResult<RecipeArchiveResult> {
    const stem = dishRepository.findDishById(dishId);
    if (stem === undefined || stem.userId !== userId || stem.deletedAt !== null) return notFound();
    const archivedAt = nextTimestamp(clock.now(), stem.updatedAt);
    const archived = dishRepository.archiveDish(userId, dishId, archivedAt);
    return archived === undefined ? notFound() : success({ id: dishId, archivedAt });
  }

  /** Restore one owner recipe with the visibility it had before archiving. */
  function restoreRecipe(userId: string, dishId: string): RecipeResult<RecipeDetail> {
    const stem = dishRepository.findDishById(dishId);
    if (stem === undefined || stem.userId !== userId || stem.deletedAt !== null || stem.archivedAt === null) return notFound();
    const restored = dishRepository.restoreDish(userId, dishId, nextTimestamp(clock.now(), stem.updatedAt));
    return restored === undefined ? notFound() : projectDetail(restored, true);
  }

  /** Search active concrete products for ingredient autocomplete. */
  function searchProducts(query: string, limit: number): RecipeResult<ReadonlyArray<RecipeProductSearchResult>> {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return failure("VALIDATION_ERROR", "Search query must contain at least two characters", { query: "Minimum length is 2" });
    return success(catalogReader.searchActiveCatalogProducts(normalizedQuery, limit).map((record) => {
      const product = toProductSearchResult(record);
      return {
        productId: product.productId,
        displayName: product.displayName,
        compositionName: product.productName,
        brandName: product.brand?.name ?? null,
        packageSummary: product.packageSummary || null,
        imageUrl: product.imageUrl,
      };
    }));
  }

  /** Resolve available recipe quantity modes for one active product. */
  function getInputOptions(productId: string): RecipeResult<RecipeIngredientInputOptions> {
    const product = catalogReader.findCatalogProduct(productId);
    if (product === undefined || product.productArchivedAt !== null) return failure("REFERENCE_NOT_FOUND", "Product not found");
    if (product.consumptionType === null) return failure("PRODUCT_NOT_CONSUMABLE", "Product is not consumable");
    const units = product.macroProfile === null
      ? catalogReader.findAllUnitTypes()
      : catalogReader.findCompatibleUnitTypes(dimensionForBasis(product.macroProfile.referenceBasis));
    const modes: RecipeIngredientInputOptions["modes"] = [
      { inputMode: "FULL_PRODUCT", unitType: null, label: product.packageTypeName },
    ];
    if (product.portionName !== null) modes.push({ inputMode: "PRODUCT_PORTION", unitType: null, label: product.portionName });
    modes.push(...units.map((unit) => ({ inputMode: "CONTENT_UNIT" as const, unitType: toUnitType(unit), label: unit.name })));
    return success({
      productId,
      package: {
        singularName: product.packageTypeName,
        pluralName: product.packageTypePluralName,
        contentAmount: canonicalDecimal(product.contentAmount),
        contentUnitType: toUnitType({
          id: product.contentUnitId,
          name: product.contentUnitName,
          symbol: product.contentUnitSymbol,
          dimension: product.contentUnitDimension,
          conversionToBase: product.contentUnitConversionToBase,
        }),
        portionsPerProduct: product.portionsPerProduct,
      },
      modes,
    });
  }

  /** Execute the shared recipe list projection and offset cursor. */
  function listRecipes(userId: string | undefined, privateUserId: string | undefined, options: RecipeListOptions): RecipeResult<RecipePage> {
    const offset = decodeCursor(options.cursor);
    if (offset === null) return failure("VALIDATION_ERROR", "Cursor is invalid");
    const rows = dishRepository.listRecipeDishes({
      userId,
      includePrivateForUserId: privateUserId,
      archived: options.archived ?? false,
      query: options.query.trim(),
      sort: options.sort,
      offset,
      limit: options.limit + 1,
    });
    const hasMore = rows.length > options.limit;
    const items = rows.slice(0, options.limit).map(toSummary);
    return success({ items, hasMore, cursor: hasMore ? encodeCursor(offset + options.limit) : null });
  }

  /** Project one accessible dish with newest version and catalog labels. */
  function projectDetail(stem: DishRecord, owner: boolean): RecipeResult<RecipeDetail> {
    const version = dishRepository.findNewestVersion(stem.id);
    if (version === undefined) return internalFailure();
    const rows = dishRepository.findIngredientsByVersionId(version.id);
    const products = new Map(catalogReader.findCatalogProductsByIds(rows.map((row) => row.productId)).map((product) => [product.productId, product]));
    const units = new Map(catalogReader.findUnitTypesByIds(rows.flatMap((row) => row.inputUnitTypeId === null ? [] : [row.inputUnitTypeId])).map((unit) => [unit.id, unit]));
    if (products.size !== new Set(rows.map((row) => row.productId)).size) return internalFailure();
    return success({
      ...toSummary(stem),
      servings: canonicalDecimal(version.servings),
      instructions: version.instructions,
      versionId: version.id,
      versionCreatedAt: version.createdAt,
      ingredients: rows.map((row) => ({
        productId: row.productId,
        displayName: productDisplayName(products.get(row.productId)!),
        quantity: canonicalDecimal(row.quantity),
        inputMode: row.inputMode,
        inputUnitType: row.inputUnitTypeId === null ? null : toUnitType(units.get(row.inputUnitTypeId)!),
        productArchived: products.get(row.productId)!.productArchivedAt !== null,
      })),
      ownerActions: {
        canEdit: owner && stem.archivedAt === null,
        canArchive: owner && stem.archivedAt === null,
        canRestore: owner && stem.archivedAt !== null,
      },
    });
  }

  return { listPublic, listForUser, getRecipe, createRecipe, updateRecipe, archiveRecipe, restoreRecipe, searchProducts, getInputOptions };
}

/** Format a current catalog product without requiring current consumability. */
function productDisplayName(product: NonNullable<ReturnType<ConsumptionCatalogReader["findCatalogProduct"]>>): string {
  return formatConcreteProductDisplayName({
    brandName: product.brandName,
    compositionName: product.productName,
    packageTypeName: product.packageTypeName,
    contentAmount: canonicalDecimal(product.contentAmount),
    contentUnitSymbol: product.contentUnitSymbol,
  });
}

/** Convert validated ingredient values into immutable persistence rows. */
function toIngredientRows(versionId: string, ingredients: ReadonlyArray<RecipeIngredientInput>): ReadonlyArray<DishIngredientRecord> {
  return ingredients.map((ingredient) => ({
    id: crypto.randomUUID(),
    dishVersionId: versionId,
    productId: ingredient.productId,
    quantity: canonicalDecimal(ingredient.quantity),
    inputMode: ingredient.inputMode,
    inputUnitTypeId: ingredient.inputUnitTypeId ?? null,
  }));
}

/** Map a nutritional reference basis to its compatible unit dimension. */
function dimensionForBasis(basis: "PER_100_G" | "PER_100_ML" | "PER_UNIT"): UnitTypeRecord["dimension"] {
  if (basis === "PER_100_G") return "MASS";
  if (basis === "PER_100_ML") return "VOLUME";
  return "COUNT";
}

/** Encode a stable list offset as an opaque cursor. */
function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

/** Decode an optional opaque list cursor. */
function decodeCursor(cursor: string | undefined): number | null {
  if (cursor === undefined) return 0;
  try {
    const value = Number(Buffer.from(cursor, "base64url").toString("utf8"));
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

/** Construct a successful use-case result. */
function success<T>(value: T): RecipeResult<T> {
  return { ok: true, value };
}

/** Construct an expected use-case failure. */
function failure(code: RecipeError["code"], message: string, fields?: Readonly<Record<string, string>>): RecipeResult<never> {
  return fields === undefined ? { ok: false, error: { code, message } } : { ok: false, error: { code, message, fields } };
}

/** Return the neutral inaccessible-recipe response. */
function notFound(): RecipeResult<never> {
  return failure("DISH_NOT_FOUND", "Recipe not found");
}

/** Return the normalized duplicate-name conflict. */
function duplicateName(): RecipeResult<never> {
  return failure("DISH_ALREADY_EXISTS", "A recipe with this name already exists", { name: "Deze naam is al in gebruik" });
}

/** Return the optimistic concurrency conflict. */
function conflict(): RecipeResult<never> {
  return failure("DISH_UPDATE_CONFLICT", "The recipe was changed elsewhere");
}

/** Return a safe projection invariant failure. */
function internalFailure(): RecipeResult<never> {
  return failure("INTERNAL_ERROR", "Stored recipe could not be projected");
}
