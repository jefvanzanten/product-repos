import type { CreateBrandInput, UpdateBrandInput } from '@product-repos/contracts';
import {
  createBrand,
  deleteBrand,
  findAllBrands,
  findBrandById,
  updateBrand,
} from '../repositories/brands.repository';
import { findOrCreateBrandProduct } from '../repositories/products.repository';

export function getAllBrands() {
  return findAllBrands();
}

export function getBrandById(id: string) {
  return findBrandById(id);
}

export function createNewBrand(input: CreateBrandInput) {
  return createBrand(input);
}

export function createBrandForProductType(
  productTypeId: string,
  input: CreateBrandInput,
) {
  const name = input.name.trim();
  return findOrCreateBrandProduct(productTypeId, name).brand;
}

export function updateExistingBrand(id: string, input: UpdateBrandInput) {
  return updateBrand(id, input);
}

export function removeBrand(id: string) {
  return deleteBrand(id);
}
