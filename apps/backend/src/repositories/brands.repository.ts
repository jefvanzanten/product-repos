import { asc, eq, like, sql } from "drizzle-orm";
import { db } from "../db/index";
import { brand } from "../db/schema";

export type BrandRow = typeof brand.$inferSelect;

export function findAllBrands(): BrandRow[] {
  return db.select().from(brand).all();
}

export function searchBrands(query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  return db.select().from(brand).where(like(sql`lower(${brand.name})`, `%${trimmed.toLowerCase()}%`)).orderBy(asc(sql`lower(${brand.name})`)).limit(10).all();
}

export function findBrandById(id: string) {
  return db.select().from(brand).where(eq(brand.id, id)).get();
}

export function findBrandByNormalizedName(name: string) {
  return db.select().from(brand).where(eq(sql`lower(trim(${brand.name}))`, name.trim().toLowerCase())).get();
}

export function findOrCreateBrand(name: string) {
  const existing = findBrandByNormalizedName(name);
  if (existing) return { brand: existing, created: false };
  const created = db.insert(brand).values({ name }).returning().get();
  return { brand: created, created: true };
}
