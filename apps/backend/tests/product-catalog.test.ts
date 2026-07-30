import { describe, expect, it } from "bun:test";
import { requestAsAdmin, testCatalog } from "./test-app";

/** Create a catalog product through the authenticated API test boundary. */
async function createTestProduct(name: string) {
  const response = await requestAsAdmin("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      categoryId: testCatalog.categoryId,
      brandId: testCatalog.brandId,
      consumptionType: "DRINK",
      macroProfile: null,
      package: {
        packageTypeId: testCatalog.packageTypeId,
        amount: "1.5",
        unitTypeId: testCatalog.unitTypeId,
        unitsPerPackage: 1,
      },
    }),
  });
  expect(response.status).toBe(201);
  return await response.json() as { id: string };
}

describe("product catalog browsing", () => {
  it("returns root categories without a flat product list", async () => {
    const response = await requestAsAdmin("/products");
    expect(response.status).toBe(200);
    const body = await response.json() as { state: string; categories: Array<{ name: string }>; products?: unknown };

    expect(body.state).toBe("root");
    expect(body.categories.some((category) => category.name === "Frisdrank")).toBe(true);
    expect(body.products).toBeUndefined();
  });

  it("returns category browse products and product detail", async () => {
    const created = await createTestProduct(`Browse ${crypto.randomUUID()}`);

    const browseResponse = await requestAsAdmin(`/products?categoryId=${testCatalog.categoryId}`);
    expect(browseResponse.status).toBe(200);
    const browse = await browseResponse.json() as { state: string; products: { items: Array<{ id: string; consumptionType: string; packageSummary: string }> } };
    expect(browse.state).toBe("category");
    expect(browse.products.items.some((product) => product.id === created.id && product.consumptionType === "DRINK" && product.packageSummary === "fles 1.5 liter")).toBe(true);

    const detailResponse = await requestAsAdmin(`/products/${created.id}`);
    expect(detailResponse.status).toBe(200);
    const detail = await detailResponse.json() as { id: string; displayName: string; consumptionType: string; macroProfile: unknown; packages: Array<{ summary: string }> };
    expect(detail.id).toBe(created.id);
    expect(detail.consumptionType).toBe("DRINK");
    expect(detail.macroProfile).toBeNull();
    expect(detail.displayName).toContain("Testmerk");
    expect(detail.packages[0]?.summary).toBe("fles 1.5 liter");
  });

  it("searches products, brands and categories", async () => {
    const created = await createTestProduct(`Search ${crypto.randomUUID()}`);

    const response = await requestAsAdmin("/products/search?query=Testmerk");
    expect(response.status).toBe(200);
    const body = await response.json() as {
      products: Array<{ id: string }>;
      brands: Array<{ name: string }>;
      categories: Array<{ path: string }>;
    };

    expect(body.products.some((product) => product.id === created.id)).toBe(true);
    expect(body.brands.some((brand) => brand.name === "Testmerk")).toBe(true);

    const categoryResponse = await requestAsAdmin("/products/search?query=Frisdrank");
    const categoryBody = await categoryResponse.json() as { categories: Array<{ path: string }> };
    expect(categoryBody.categories.some((category) => category.path === "Frisdrank")).toBe(true);
  });
});
