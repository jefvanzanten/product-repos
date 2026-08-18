import type { ConcreteProductDetail, ConcreteProductPage, ConcreteProductSummary, CreateConcreteProduct, CreateProductComposition, MacroProfile, ProductCompositionDto, UpdateConcreteProduct, UpdateProductComposition } from "@product-repos/contracts";
import { and, eq, like, or, sql } from "drizzle-orm";
import type { BackendDatabase } from "../../../db/index.ts";
import { brand, category, concreteProduct, packageType, productComposition, productCompositionMacroProfile, productPortion, unitContent, unitType } from "../../../db/schema.ts";
import { err, ok, type Result } from "../domain/catalog-domain.ts";
import { findCategoryPath, formatCategoryPath } from "../domain/category-path.ts";
import { formatConcreteProductName, formatPackageSummary } from "../domain/product-display.ts";

/** Catalog v2 persistence capabilities. */
export type ProductV2Repository = {
  readonly searchCompositions: (query: string, limit: number) => ProductCompositionDto[];
  readonly createComposition: (input: CreateProductComposition) => Result<ProductCompositionDto>;
  readonly updateComposition: (compositionId: string, input: UpdateProductComposition) => Result<ProductCompositionDto>;
  readonly updateMacroProfile: (compositionId: string, profile: MacroProfile | null) => Result<ProductCompositionDto>;
  readonly listProducts: (input: { readonly query?: string; readonly categoryId?: number; readonly brandId?: string; readonly archived?: boolean; readonly cursor?: string; readonly limit: number }) => ConcreteProductPage;
  readonly getProduct: (productId: string) => Result<ConcreteProductDetail>;
  readonly createProduct: (input: CreateConcreteProduct) => Result<ConcreteProductDetail>;
  readonly updateProduct: (productId: string, input: UpdateConcreteProduct) => Result<ConcreteProductDetail>;
  readonly setArchived: (productId: string, archived: boolean) => Result<ConcreteProductDetail>;
};

type CompositionRow = typeof productComposition.$inferSelect;
type MacroRow = typeof productCompositionMacroProfile.$inferSelect;

/** Create the additive product-model-v2 repository. */
export function createProductV2Repository(database: BackendDatabase): ProductV2Repository {
  /** Search compositions by composition or brand name. */
  function searchCompositions(query: string, limit: number): ProductCompositionDto[] {
    const normalized = `%${query.trim().toLowerCase()}%`;
    return database.select({ composition: productComposition })
      .from(productComposition)
      .leftJoin(brand, eq(productComposition.brandId, brand.id))
      .where(or(like(sql`lower(${productComposition.name})`, normalized), like(sql`lower(coalesce(${brand.name}, ''))`, normalized)))
      .orderBy(productComposition.name, productComposition.id)
      .limit(limit)
      .all()
      .map(({ composition }) => toCompositionDetail(composition));
  }

  /** Create one composition and its optional macro profile atomically. */
  function createComposition(input: CreateProductComposition): Result<ProductCompositionDto> {
    const references = validateCompositionReferences(input);
    if (!references.ok) return references;
    if (findCompositionDuplicate(input)) return err({ code: "PRODUCT_COMPOSITION_ALREADY_EXISTS", message: "Product composition already exists" });
    const id = crypto.randomUUID();
    database.transaction((tx) => {
      tx.insert(productComposition).values({ id, name: input.name.trim(), categoryId: input.categoryId, brandId: input.brandId ?? null, consumptionType: input.consumptionType }).run();
      persistMacro(tx, id, input.macroProfile ?? null);
    });
    return getComposition(id);
  }

  /** Update shared composition fields and optional macro values. */
  function updateComposition(compositionId: string, input: UpdateProductComposition): Result<ProductCompositionDto> {
    if (!findComposition(compositionId)) return err({ code: "PRODUCT_COMPOSITION_NOT_FOUND", message: "Product composition not found" });
    const references = validateCompositionReferences(input);
    if (!references.ok) return references;
    if (findCompositionDuplicate(input, compositionId)) return err({ code: "PRODUCT_COMPOSITION_ALREADY_EXISTS", message: "Product composition already exists" });
    database.transaction((tx) => {
      tx.update(productComposition).set({ name: input.name.trim(), categoryId: input.categoryId, brandId: input.brandId ?? null, consumptionType: input.consumptionType, updatedAt: new Date().toISOString() }).where(eq(productComposition.id, compositionId)).run();
      persistMacro(tx, compositionId, input.macroProfile ?? null);
    });
    return getComposition(compositionId);
  }

  /** Replace composition macros while blocking an in-use basis change. */
  function updateMacroProfile(compositionId: string, profile: MacroProfile | null): Result<ProductCompositionDto> {
    if (!findComposition(compositionId)) return err({ code: "PRODUCT_COMPOSITION_NOT_FOUND", message: "Product composition not found" });
    const current = database.select().from(productCompositionMacroProfile).where(eq(productCompositionMacroProfile.productCompositionId, compositionId)).get();
    if (current && profile && current.referenceBasis !== profile.referenceBasis && compositionIsUsedByDish(compositionId)) {
      return err({ code: "REFERENCE_BASIS_IN_USE", message: "Nutrition reference basis is used by recipe ingredients" });
    }
    persistMacro(database, compositionId, profile);
    return getComposition(compositionId);
  }

  /** List flat concrete products using bounded offset cursors. */
  function listProducts(input: { readonly query?: string; readonly categoryId?: number; readonly brandId?: string; readonly archived?: boolean; readonly cursor?: string; readonly limit: number }): ConcreteProductPage {
    const offset = parseCursor(input.cursor);
    const rows = queryConcreteProducts();
    const normalized = input.query?.trim().toLowerCase() ?? "";
    const filtered = rows.filter((row) => {
      if (input.categoryId !== undefined && row.composition.categoryId !== input.categoryId) return false;
      if (input.brandId !== undefined && row.composition.brandId !== input.brandId) return false;
      if (input.archived !== undefined && (row.product.archivedAt !== null) !== input.archived) return false;
      return normalized.length === 0 || [row.composition.name, row.brandName ?? "", row.barcode ?? ""].some((value) => value.toLowerCase().includes(normalized));
    });
    const selected = filtered.slice(offset, offset + input.limit + 1);
    return {
      items: selected.slice(0, input.limit).map(toProductSummary),
      hasMore: selected.length > input.limit,
      cursor: selected.length > input.limit ? String(offset + input.limit) : null,
    };
  }

  /** Read one concrete product detail. */
  function getProduct(productId: string): Result<ConcreteProductDetail> {
    const row = queryConcreteProducts().find((candidate) => candidate.product.id === productId);
    if (!row) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });
    const portionRow = database.select({ portion: productPortion, content: unitContent, unit: unitType })
      .from(productPortion)
      .innerJoin(unitContent, eq(productPortion.unitContentId, unitContent.id))
      .innerJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
      .where(eq(productPortion.productId, productId)).get();
    return ok({
      ...toProductSummary(row),
      composition: toCompositionDetail(row.composition),
      packageTypeId: row.product.packageTypeId,
      content: row.contentId === null || row.contentAmount === null || row.unitTypeId === null || row.unitSymbol === null || row.unitDimension === null
        ? null
        : { amount: row.contentAmount, unitTypeId: row.unitTypeId, symbol: row.unitSymbol, dimension: row.unitDimension },
      portion: portionRow ? { singularName: portionRow.portion.singularName, pluralName: portionRow.portion.pluralName, amount: portionRow.content.amount, unitTypeId: portionRow.unit.id, portionsPerProduct: portionRow.portion.portionsPerProduct } : null,
    });
  }

  /** Create one concrete product and optional portion atomically. */
  function createProduct(input: CreateConcreteProduct): Result<ConcreteProductDetail> {
    const references = resolveProductReferences(input);
    if (!references.ok) return references;
    if (findProductDuplicate(input)) return err({ code: "PRODUCT_ALREADY_EXISTS", message: "Concrete product already exists" });
    if (input.barcode && findBarcode(input.barcode)) return err({ code: "BARCODE_ALREADY_EXISTS", message: "Barcode already exists" });
    const id = crypto.randomUUID();
    database.transaction((tx) => {
      const contentId = input.content ? findOrCreateContent(tx, input.content.unitTypeId, input.content.amount) : null;
      tx.insert(concreteProduct).values({ id, productCompositionId: input.productCompositionId, packageTypeId: input.packageTypeId ?? null, unitContentId: contentId, imageUrl: input.imageUrl ?? null, barcode: normalizeBarcode(input.barcode) }).run();
      persistPortion(tx, id, input);
    });
    return getProduct(id);
  }

  /** Update product-specific fields and optional portion atomically. */
  function updateProduct(productId: string, input: UpdateConcreteProduct): Result<ConcreteProductDetail> {
    const current = findConcreteProduct(productId);
    if (!current) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });
    const completeInput: CreateConcreteProduct = { ...input, productCompositionId: current.productCompositionId };
    const references = resolveProductReferences(completeInput);
    if (!references.ok) return references;
    if (findProductDuplicate(completeInput, productId)) return err({ code: "PRODUCT_ALREADY_EXISTS", message: "Concrete product already exists" });
    if (completeInput.barcode && findBarcode(completeInput.barcode, productId)) return err({ code: "BARCODE_ALREADY_EXISTS", message: "Barcode already exists" });
    database.transaction((tx) => {
      const contentId = completeInput.content ? findOrCreateContent(tx, completeInput.content.unitTypeId, completeInput.content.amount) : null;
      tx.update(concreteProduct).set({ packageTypeId: completeInput.packageTypeId ?? null, unitContentId: contentId, imageUrl: completeInput.imageUrl ?? null, barcode: normalizeBarcode(completeInput.barcode), updatedAt: new Date().toISOString() }).where(eq(concreteProduct.id, productId)).run();
      tx.delete(productPortion).where(eq(productPortion.productId, productId)).run();
      persistPortion(tx, productId, completeInput);
    });
    return getProduct(productId);
  }

  /** Archive or restore one concrete product idempotently. */
  function setArchived(productId: string, archived: boolean): Result<ConcreteProductDetail> {
    if (!findConcreteProduct(productId)) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });
    database.update(concreteProduct).set({ archivedAt: archived ? new Date().toISOString() : null, updatedAt: new Date().toISOString() }).where(eq(concreteProduct.id, productId)).run();
    return getProduct(productId);
  }

  /** Read one composition detail. */
  function getComposition(compositionId: string): Result<ProductCompositionDto> {
    const row = findComposition(compositionId);
    return row ? ok(toCompositionDetail(row)) : err({ code: "PRODUCT_COMPOSITION_NOT_FOUND", message: "Product composition not found" });
  }

  /** Project a composition with its references and macro profile. */
  function toCompositionDetail(row: CompositionRow): ProductCompositionDto {
    const brandRow = row.brandId ? database.select().from(brand).where(eq(brand.id, row.brandId)).get() : undefined;
    const categories = database.select().from(category).all();
    const categoryPath = findCategoryPath(row.categoryId, categories);
    const categoryRow = categoryPath.at(-1);
    const macro = database.select().from(productCompositionMacroProfile).where(eq(productCompositionMacroProfile.productCompositionId, row.id)).get();
    const products = database.select().from(concreteProduct).where(eq(concreteProduct.productCompositionId, row.id)).all();
    return {
      id: row.id,
      name: row.name,
      brand: brandRow ? { id: brandRow.id, name: brandRow.name } : null,
      category: { id: row.categoryId, name: categoryRow?.name ?? "Onbekende categorie", parentId: categoryRow?.parentId ?? null },
      categoryPath: categoryPath.map((item) => ({ id: item.id, name: item.name, parentId: item.parentId })),
      consumptionType: row.consumptionType,
      macroProfile: toMacroProfile(macro),
      productCount: products.length,
      activeProductCount: products.filter((item) => item.archivedAt === null).length,
    };
  }

  /** Validate composition references. */
  function validateCompositionReferences(input: CreateProductComposition | UpdateProductComposition): Result<true> {
    if (!database.select({ id: category.id }).from(category).where(eq(category.id, input.categoryId)).get()) return err({ code: "REFERENCE_NOT_FOUND", message: "Category not found" });
    if (input.brandId && !database.select({ id: brand.id }).from(brand).where(eq(brand.id, input.brandId)).get()) return err({ code: "REFERENCE_NOT_FOUND", message: "Brand not found" });
    return ok(true);
  }

  /** Resolve and validate all concrete-product references and dimensions. */
  function resolveProductReferences(input: CreateConcreteProduct): Result<true> {
    const composition = findComposition(input.productCompositionId);
    if (!composition) return err({ code: "REFERENCE_NOT_FOUND", message: "Product composition not found" });
    if (input.packageTypeId && !database.select({ id: packageType.id }).from(packageType).where(eq(packageType.id, input.packageTypeId)).get()) return err({ code: "REFERENCE_NOT_FOUND", message: "Package type not found" });
    const contentUnit = input.content ? database.select().from(unitType).where(eq(unitType.id, input.content.unitTypeId)).get() : undefined;
    const portionUnit = input.portion ? database.select().from(unitType).where(eq(unitType.id, input.portion.unitTypeId)).get() : undefined;
    if ((input.content && !contentUnit) || (input.portion && !portionUnit)) return err({ code: "REFERENCE_NOT_FOUND", message: "Unit type not found" });
    if (contentUnit && portionUnit && contentUnit.dimension !== portionUnit.dimension) return err({ code: "UNIT_DIMENSION_INCOMPATIBLE", message: "Portion and content dimensions differ" });
    const macro = database.select().from(productCompositionMacroProfile).where(eq(productCompositionMacroProfile.productCompositionId, composition.id)).get();
    const expected = macro?.referenceBasis === "PER_100_G" ? "MASS" : macro?.referenceBasis === "PER_100_ML" ? "VOLUME" : macro?.referenceBasis === "PER_UNIT" ? "COUNT" : null;
    if (expected && contentUnit && contentUnit.dimension !== expected) return err({ code: "UNIT_DIMENSION_INCOMPATIBLE", message: "Content dimension is incompatible with nutrition basis" });
    return ok(true);
  }

  /** Persist one optional macro profile through a transaction-compatible executor. */
  function persistMacro(executor: Pick<BackendDatabase, "insert" | "delete">, compositionId: string, profile: MacroProfile | null): void {
    if (!profile) {
      executor.delete(productCompositionMacroProfile).where(eq(productCompositionMacroProfile.productCompositionId, compositionId)).run();
      return;
    }
    const values = { productCompositionId: compositionId, ...profile };
    executor.insert(productCompositionMacroProfile).values(values).onConflictDoUpdate({ target: productCompositionMacroProfile.productCompositionId, set: { ...values, updatedAt: new Date().toISOString() } }).run();
  }

  /** Persist an optional portion and canonical unit content. */
  function persistPortion(executor: Pick<BackendDatabase, "insert" | "select">, productId: string, input: CreateConcreteProduct): void {
    if (!input.portion) return;
    const unitContentId = findOrCreateContent(executor, input.portion.unitTypeId, input.portion.amount);
    executor.insert(productPortion).values({ productId, singularName: input.portion.singularName.trim(), pluralName: input.portion.pluralName.trim(), unitContentId, portionsPerProduct: input.portion.portionsPerProduct ?? null }).run();
  }

  /** Find or create canonical unit content. */
  function findOrCreateContent(executor: Pick<BackendDatabase, "insert" | "select">, unitTypeId: number, amount: string): number {
    const canonical = String(Number(amount));
    const existing = executor.select().from(unitContent).where(and(eq(unitContent.unitTypeId, unitTypeId), eq(unitContent.amount, canonical))).get();
    if (existing) return existing.id;
    return executor.insert(unitContent).values({ unitTypeId, amount: canonical }).returning({ id: unitContent.id }).get().id;
  }

  /** Find one normalized composition duplicate. */
  function findCompositionDuplicate(input: CreateProductComposition | UpdateProductComposition, excludedId?: string): CompositionRow | undefined {
    const name = input.name.trim().toLowerCase();
    return database.select().from(productComposition).all().find((row) => row.id !== excludedId && row.categoryId === input.categoryId && row.brandId === (input.brandId ?? null) && row.name.trim().toLowerCase() === name);
  }

  /** Find one composition by identifier. */
  function findComposition(id: string): CompositionRow | undefined {
    return database.select().from(productComposition).where(eq(productComposition.id, id)).get();
  }

  /** Find one concrete product row. */
  function findConcreteProduct(id: string): typeof concreteProduct.$inferSelect | undefined {
    return database.select().from(concreteProduct).where(eq(concreteProduct.id, id)).get();
  }

  /** Find a product with the same concrete identity. */
  function findProductDuplicate(input: CreateConcreteProduct, excludedId?: string): typeof concreteProduct.$inferSelect | undefined {
    if (!input.packageTypeId || !input.content) return undefined;
    const canonical = String(Number(input.content.amount));
    const content = database.select().from(unitContent).where(and(eq(unitContent.unitTypeId, input.content.unitTypeId), eq(unitContent.amount, canonical))).get();
    if (!content) return undefined;
    return database.select().from(concreteProduct).all().find((row) => row.id !== excludedId && row.productCompositionId === input.productCompositionId && row.packageTypeId === input.packageTypeId && row.unitContentId === content.id);
  }

  /** Find a normalized barcode conflict. */
  function findBarcode(value: string, excludedId?: string): boolean {
    const normalized = value.trim();
    return database.select().from(concreteProduct).all().some((row) => row.id !== excludedId && row.barcode === normalized);
  }

  /** Return whether any retained recipe ingredient uses this composition. */
  function compositionIsUsedByDish(compositionId: string): boolean {
    const row = database.get<{ count: number }>(sql`SELECT COUNT(*) AS count FROM dish_ingredient di JOIN product cp ON cp.id = di.product_id WHERE cp.product_composition_id = ${compositionId}`);
    return Number(row?.count ?? 0) > 0;
  }

  /** Normalize an optional barcode. */
  function normalizeBarcode(value: string | null | undefined): string | null {
    return value?.trim() || null;
  }

  /** Parse a safe offset cursor. */
  function parseCursor(value: string | undefined): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  }

  /** Project an optional macro persistence row. */
  function toMacroProfile(row: MacroRow | undefined): MacroProfile | null {
    if (!row) return null;
    return { referenceBasis: row.referenceBasis, caloriesKcal: row.caloriesKcal, proteinG: row.proteinG, carbohydratesG: row.carbohydratesG, fatG: row.fatG, caloriesSource: row.caloriesSource };
  }

  /** Query all denormalized concrete product rows for bounded catalog projection. */
  function queryConcreteProducts() {
    return database.select({
      product: concreteProduct,
      composition: productComposition,
      brandName: brand.name,
      packageTypeName: packageType.singularName,
      contentId: unitContent.id,
      contentAmount: unitContent.amount,
      unitTypeId: unitType.id,
      unitSymbol: unitType.symbol,
      unitDimension: unitType.dimension,
      barcode: concreteProduct.barcode,
    }).from(concreteProduct)
      .innerJoin(productComposition, eq(concreteProduct.productCompositionId, productComposition.id))
      .leftJoin(brand, eq(productComposition.brandId, brand.id))
      .leftJoin(packageType, eq(concreteProduct.packageTypeId, packageType.id))
      .leftJoin(unitContent, eq(concreteProduct.unitContentId, unitContent.id))
      .leftJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
      .orderBy(productComposition.name, concreteProduct.id).all();
  }

  /** Project one denormalized concrete product row. */
  function toProductSummary(row: ReturnType<typeof queryConcreteProducts>[number]): ConcreteProductSummary {
    const categories = database.select().from(category).all();
    const packageSummary = formatPackageSummary({ packageType: row.packageTypeName, amount: row.contentAmount, symbol: row.unitSymbol });
    return { productId: row.product.id, productCompositionId: row.composition.id, displayName: formatConcreteProductName(row.brandName, row.composition.name, packageSummary), compositionName: row.composition.name, brandName: row.brandName, categoryPath: formatCategoryPath(findCategoryPath(row.composition.categoryId, categories)), consumptionType: row.composition.consumptionType, packageSummary, imageUrl: row.product.imageUrl, barcode: row.product.barcode, archivedAt: row.product.archivedAt };
  }

  return { searchCompositions, createComposition, updateComposition, updateMacroProfile, listProducts, getProduct, createProduct, updateProduct, setArchived };
}
