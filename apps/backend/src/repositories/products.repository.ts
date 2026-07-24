import { Product } from "@product-repos/contracts";
import { product } from "../db/schema";
import { db } from "../db";

class ProductRepository {
  async getAllProducts(): Promise<Product[]> {
    const products = await db.select().from(product);
    return products.map((prod) => ({
      id: prod.id,
      name: prod.name,
    }));
  }

  async createProduct(name: string): Promise<void> {
    await db.insert(product).values({ name });
  }
}

export { ProductRepository };
