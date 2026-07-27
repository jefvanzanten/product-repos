import { createProduct, type CreateProductInput } from "../repositories/products.repository";

export function createNewProduct(input: CreateProductInput) { return createProduct(input); }
export function getAllProducts() { return []; }
export function getProductById(_id: string) { return undefined; }
export function updateExistingProduct(_id: string, _input: unknown) { return undefined; }
export function removeProduct(_id: string) { return undefined; }
