import type { CreateProductTypeInput, UpdateProductTypeInput } from '@product-repos/contracts/product-types';
import {
  createProductType,
  deleteProductType,
  findAllProductTypes,
  findProductTypeById,
  findProductTypeByName,
  updateProductType,
} from '../repositories/product-types.repository';

export function getAllProductTypes() {
  return findAllProductTypes();
}

export function getProductTypeById(id: string) {
  return findProductTypeById(id);
}

export function createNewProductType(input: CreateProductTypeInput) {
  const name = input.name.trim();
  const existingProductType = findProductTypeByName(name);

  if (existingProductType) {
    return existingProductType;
  }

  return createProductType({ ...input, name });
}

export function updateExistingProductType(id: string, input: UpdateProductTypeInput) {
  return updateProductType(id, input.name ? { ...input, name: input.name.trim() } : input);
}

export function removeProductType(id: string) {
  return deleteProductType(id);
}
