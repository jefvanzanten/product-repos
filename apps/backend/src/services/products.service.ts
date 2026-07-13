import type { CreateProductInput, UpdateProductInput } from '@product-repos/contracts';
import {
  createProduct,
  deleteProduct,
  findAllProducts,
  findProductById,
  updateProduct,
} from '../repositories/products.repository';

export function getAllProducts() {
  return findAllProducts();
}

export function getProductById(id: string) {
  return findProductById(id);
}

export function createNewProduct(input: CreateProductInput) {
  return createProduct(input);
}

export function updateExistingProduct(id: string, input: UpdateProductInput) {
  return updateProduct(id, input);
}

export function removeProduct(id: string) {
  return deleteProduct(id);
}
