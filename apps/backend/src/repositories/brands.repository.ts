import { eq } from "drizzle-orm";
import type {
  CreateBrandInput,
  UpdateBrandInput,
} from "@product-repos/contracts";
import { db } from "../db/index";
import { brand } from "../db/schema";

export function findAllBrands() {
  return db.select().from(brand).all();
}

export function findBrandById(id: string) {
  return db.select().from(brand).where(eq(brand.id, id)).get();
}

export function createBrand(input: CreateBrandInput) {
  return db.insert(brand).values(input).returning().get();
}

export function updateBrand(id: string, input: UpdateBrandInput) {
  return db.update(brand).set(input).where(eq(brand.id, id)).returning().get();
}

export function deleteBrand(id: string) {
  return db.delete(brand).where(eq(brand.id, id)).returning().get();
}
