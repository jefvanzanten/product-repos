import { describe, expect, it } from "bun:test";
import { app, testCatalog } from "./test-app";

describe("product creation", () => {
  it("creates a product with selected category, selected brand and package", async () => {
    const response = await app.request("/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Zero Sugar",
        categoryId: testCatalog.categoryId,
        brandId: testCatalog.brandId,
        package: {
          packageTypeId: testCatalog.packageTypeId,
          amount: "1.5",
          unitTypeId: testCatalog.unitTypeId,
          unitsPerPackage: 1,
        },
      }),
    });

    expect(response.status).toBe(201);
    const created = await response.json() as {
      id: string;
      name: string;
      category: { id: number; name: string; parentId: number | null };
      brand: { id: string; name: string } | null;
      package: { packageType: { id: number; name: string }; unitContent: { amount: string; unitType: { id: number; name: string } }; unitsPerPackage: number };
    };

    expect(created.name).toBe("Zero Sugar");
    expect(created.category).toEqual({ id: testCatalog.categoryId, name: "Frisdrank", parentId: null });
    expect(created.brand).toEqual({ id: testCatalog.brandId, name: "Testmerk" });
    expect(created.package.packageType).toEqual({ id: testCatalog.packageTypeId, name: "fles" });
    expect(created.package.unitContent.amount).toBe("1.5");
    expect(created.package.unitContent.unitType).toEqual({ id: testCatalog.unitTypeId, name: "liter" });
    expect(created.package.unitsPerPackage).toBe(1);
  });
});
