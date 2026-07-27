import type { CreateBrandInput, UpdateBrandInput } from "@product-repos/contracts";
import { findBrandById, findOrCreateBrand, searchBrands } from "../repositories/brands.repository";

export function getAllBrands() { return searchBrands(""); }
export { findBrandById as getBrandById };
export function createNewBrand(input: CreateBrandInput) { return findOrCreateBrand(input.name).brand; }
export function updateExistingBrand(_id: string, _input: UpdateBrandInput) { return undefined; }
export function removeBrand(_id: string) { return undefined; }
