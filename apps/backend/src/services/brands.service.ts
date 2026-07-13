import type { CreateBrandInput, UpdateBrandInput } from '@product-repos/contracts';
import {
  createBrand,
  deleteBrand,
  findAllBrands,
  findBrandById,
  updateBrand,
} from '../repositories/brands.repository';

export function getAllBrands() {
  return findAllBrands();
}

export function getBrandById(id: string) {
  return findBrandById(id);
}

export function createNewBrand(input: CreateBrandInput) {
  return createBrand(input);
}

export function updateExistingBrand(id: string, input: UpdateBrandInput) {
  return updateBrand(id, input);
}

export function removeBrand(id: string) {
  return deleteBrand(id);
}
