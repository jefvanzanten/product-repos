import { describe, expect, it } from "bun:test";
import { app, sqliteConnection, testCatalog } from "./test-app";

describe("product detail", () => {
  it("returns a read-only product detail with category path and all packages", async () => {
    const parentCategory = await createCategory(`Voeding ${crypto.randomUUID()}`, null);
    const childCategory = await createCategory("Cola", parentCategory.id);
    const createdResponse = await createProductRequest({ name: uniqueName("Zero Sugar"), categoryId: childCategory.id, brandId: testCatalog.brandId });
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json() as CreatedProductResponse;

    const canUnitTypeId = insertUnitType("milliliter");
    const canPackageTypeId = insertPackageType("blik");
    const canUnitContentId = insertUnitContent(canUnitTypeId, 330);
    const canPackageId = crypto.randomUUID();
    sqliteConnection.query("INSERT INTO product_package (id, product_id, unit_content_id, package_type_id, units_per_package) VALUES (?, ?, ?, ?, ?)").run(canPackageId, created.id, canUnitContentId, canPackageTypeId, 6);

    const response = await app.request(`/products/${created.id}`);
    expect(response.status).toBe(200);
    const detail = await response.json() as ProductDetailResponse;

    expect(detail.id).toBe(created.id);
    expect(detail.name).toBe(created.name);
    expect(detail.displayName).toBe(`Testmerk ${created.name}`);
    expect(detail.category).toEqual(childCategory);
    expect(detail.categoryPath).toEqual([parentCategory, childCategory]);
    expect(detail.brand).toEqual({ id: testCatalog.brandId, name: "Testmerk" });
    expect(detail.packages).toHaveLength(2);
    expect(detail.packages.map((productPackage) => productPackage.id)).toContain(created.package.id);
    expect(detail.packages.map((productPackage) => productPackage.id)).toContain(canPackageId);
    expect(detail.packages.map((productPackage) => productPackage.summary)).toContain("fles 1.5 liter");
    expect(detail.packages.map((productPackage) => productPackage.summary)).toContain("blik 6 x 330 milliliter");
  });

  it("returns PRODUCT_NOT_FOUND for unknown or invalid product ids", async () => {
    const unknownResponse = await app.request(`/products/${crypto.randomUUID()}`);
    expect(unknownResponse.status).toBe(404);
    expect(await unknownResponse.json()).toEqual({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

    const invalidResponse = await app.request("/products/not-a-uuid");
    expect(invalidResponse.status).toBe(404);
    expect(await invalidResponse.json()).toEqual({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });
  });
});

type CreatedProductResponse = {
  readonly id: string;
  readonly name: string;
  readonly package: { readonly id: string };
};

type ProductDetailResponse = {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly category: CategoryResponse;
  readonly categoryPath: ReadonlyArray<CategoryResponse>;
  readonly brand: { readonly id: string; readonly name: string } | null;
  readonly packages: ReadonlyArray<{ readonly id: string; readonly summary: string }>;
};

type CategoryResponse = { readonly id: number; readonly name: string; readonly parentId: number | null };

async function createProductRequest(input: { readonly name: string; readonly categoryId: number; readonly brandId: string | null }): Promise<Response> {
  return app.request("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      categoryId: input.categoryId,
      brandId: input.brandId,
      package: {
        packageTypeId: testCatalog.packageTypeId,
        amount: "1.5",
        unitTypeId: testCatalog.unitTypeId,
        unitsPerPackage: 1,
      },
    }),
  });
}

async function createCategory(name: string, parentId: number | null): Promise<CategoryResponse> {
  const response = await app.request("/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, parentId }),
  });
  expect(response.status).toBe(201);
  return response.json() as Promise<CategoryResponse>;
}

function insertUnitType(name: string): number {
  const row = sqliteConnection.query("INSERT INTO unit_type (name) VALUES (?) RETURNING id").get(name) as { id: number };
  return row.id;
}

function insertPackageType(name: string): number {
  const row = sqliteConnection.query("INSERT INTO package_type (name) VALUES (?) RETURNING id").get(name) as { id: number };
  return row.id;
}

function insertUnitContent(unitTypeId: number, amount: number): number {
  const row = sqliteConnection.query("INSERT INTO unit_content (unit_type_id, amount) VALUES (?, ?) RETURNING id").get(unitTypeId, amount) as { id: number };
  return row.id;
}

function uniqueName(prefix: string): string {
  return `${prefix} ${crypto.randomUUID()}`;
}
