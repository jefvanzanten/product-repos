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

export function getProductById(id: number) {
  return findProductById(id);
}

export function createNewProduct(input: CreateProductInput) {
  return createProduct(input);
}

export function updateExistingProduct(id: number, input: UpdateProductInput) {
  return updateProduct(id, input);
}

export function removeProduct(id: number) {
  return deleteProduct(id);
}
