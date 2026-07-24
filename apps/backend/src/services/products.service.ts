import type {
  CreateProductInput,
  Product,
  UpdateProductInput,
} from "@product-repos/contracts";
import { ProductRepository } from "../repositories/products.repository";

interface iProductsService {
  getAllProducts: () => Promise<Product[]>;
  createNewProduct: (input: CreateProductInput) => Promise<void>;
  updateExistingProduct: (
    id: string,
    input: UpdateProductInput,
  ) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

class ProductsService implements iProductsService {
  private productRepository: ProductRepository;

  constructor(productRepository: ProductRepository) {
    this.productRepository = new ProductRepository();
  }

  async getAllProducts(): Promise<Product[]> {
    // Implementation for fetching all products
  }

  async createNewProduct(input: CreateProductInput): Promise<void> {
    // Implementation for creating a new product
  }

  async updateExistingProduct(
    id: string,
    input: UpdateProductInput,
  ): Promise<void> {
    // Implementation for updating an existing product
  }

  async deleteProduct(id: string): Promise<void> {
    // Implementation for deleting a product
  }
}

// getAllBrands: () => Promise<Brand[]>;
// getAllPackagingTypes: () => Promise<{ id: number; name: string }[]>;
