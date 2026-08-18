import { describe, expect, test } from "bun:test";
import { concreteProductDetailSchema, concreteProductPageSchema, productCompositionDtoSchema } from "@product-repos/contracts";
import { requestAsAdmin, testCatalog } from "./test-app.ts";

/** Send an authenticated JSON request. */
function requestJson<Body>(path: string, method: "POST" | "PUT", body: Body): Promise<Response> {
  return requestAsAdmin(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

describe("product model v2", () => {
  test("creates a composition and a concrete product and archives idempotently", async () => {
    const name = `V2 product ${crypto.randomUUID()}`;
    const compositionResponse = await requestJson("/product-compositions", "POST", {
      name,
      categoryId: testCatalog.categoryId,
      brandId: testCatalog.brandId,
      consumptionType: "DRINK",
      macroProfile: {
        referenceBasis: "PER_100_ML",
        caloriesKcal: "42",
        proteinG: null,
        carbohydratesG: "10",
        fatG: null,
        caloriesSource: "MANUAL",
      },
    });
    expect(compositionResponse.status).toBe(201);
    const composition = productCompositionDtoSchema.parse(await compositionResponse.json());

    const productResponse = await requestJson("/products", "POST", {
      productCompositionId: composition.id,
      packageTypeId: testCatalog.packageTypeId,
      content: { amount: "1.5", unitTypeId: testCatalog.unitTypeId },
      barcode: crypto.randomUUID(),
      portion: { singularName: "glas", pluralName: "glazen", amount: "250", unitTypeId: testCatalog.unitTypeId, portionsPerProduct: 6 },
    });
    expect(productResponse.status).toBe(201);
    const product = concreteProductDetailSchema.parse(await productResponse.json());
    expect(product.displayName).toContain(name);
    expect(product.portion?.pluralName).toBe("glazen");

    const pageResponse = await requestAsAdmin(`/products?query=${encodeURIComponent(name)}`);
    expect(pageResponse.status).toBe(200);
    const page = concreteProductPageSchema.parse(await pageResponse.json());
    expect(page.items.some((item) => item.productId === product.productId)).toBe(true);

    const firstArchive = await requestAsAdmin(`/products/${product.productId}/archive`, { method: "POST" });
    const secondArchive = await requestAsAdmin(`/products/${product.productId}/archive`, { method: "POST" });
    expect(firstArchive.status).toBe(200);
    expect(secondArchive.status).toBe(200);
    expect(concreteProductDetailSchema.parse(await secondArchive.json()).archivedAt).not.toBeNull();
  });
});
