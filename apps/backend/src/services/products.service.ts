import { createProduct, findProductDetailById, type CreateProductInput } from "../repositories/products.repository";

export function createNewProduct(input: CreateProductInput) { return createProduct(input); }
export function getAllProducts() { return []; }
export function getProductById(id: string) { return findProductDetailById(id); }
export function updateExistingProduct(_id: string, _input: unknown) { return undefined; }
export function removeProduct(_id: string) { return undefined; }
