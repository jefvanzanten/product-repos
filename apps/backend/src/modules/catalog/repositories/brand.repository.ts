import { asc, eq, like, sql } from "drizzle-orm";
import type { BackendDatabase } from "../../../db/index.ts";
import { brand } from "../../../db/schema.ts";

/** Raw brand persistence row. */
export type BrandRow = typeof brand.$inferSelect;

/** Outcome of finding or creating a normalized brand. */
type FindOrCreateBrandResult =
  | { readonly brand: BrandRow; readonly created: false }
  | { readonly brand: BrandRow; readonly created: true };

/** Brand persistence operations used by current catalog use cases. */
export type BrandRepository = {
  readonly findAllBrands: () => BrandRow[];
  readonly searchBrands: (query: string) => BrandRow[];
  readonly findBrandById: (id: string) => BrandRow | undefined;
  readonly findOrCreateBrand: (name: string) => FindOrCreateBrandResult;
};

/** Create brand persistence operations for one injected database. */
export function createBrandRepository(database: BackendDatabase): BrandRepository {
  /** Read every brand. */
  function findAllBrands(): BrandRow[] {
    return database.select().from(brand).all();
  }

  /** Search brands by normalized name. */
  function searchBrands(query: string): BrandRow[] {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    return database.select().from(brand).where(like(sql`lower(${brand.name})`, `%${trimmed.toLowerCase()}%`)).orderBy(asc(sql`lower(${brand.name})`)).limit(10).all();
  }

  /** Find one brand by identifier. */
  function findBrandById(id: string): BrandRow | undefined {
    return database.select().from(brand).where(eq(brand.id, id)).get();
  }

  /** Find one brand by normalized name. */
  function findBrandByNormalizedName(name: string): BrandRow | undefined {
    return database.select().from(brand).where(eq(sql`lower(trim(${brand.name}))`, name.trim().toLowerCase())).get();
  }

  /** Reuse a normalized brand or create it. */
  function findOrCreateBrand(name: string): FindOrCreateBrandResult {
    const existing = findBrandByNormalizedName(name);
    if (existing) return { brand: existing, created: false };
    return { brand: database.insert(brand).values({ name }).returning().get(), created: true };
  }

  return { findAllBrands, searchBrands, findBrandById, findOrCreateBrand };
}
