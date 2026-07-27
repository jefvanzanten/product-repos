import { describe, expect, it } from "bun:test";
import { app, sqliteConnection, testCatalog } from "./test-app";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("product creation", () => {
  it("creates a product with selected category, selected brand and package", async () => {
    const response = await createProductRequest({ name: uniqueName("Zero Sugar"), brandId: testCatalog.brandId });

    expect(response.status).toBe(201);
    const created = await response.json() as CreatedProductResponse;

    expect(created.id).toMatch(uuidPattern);
    expect(created.name.startsWith("Zero Sugar")).toBe(true);
    expect(created.category).toEqual({ id: testCatalog.categoryId, name: "Frisdrank", parentId: null });
    expect(created.brand).toEqual({ id: testCatalog.brandId, name: "Testmerk" });
    expect(created.package.id).toMatch(uuidPattern);
    expect(created.package.packageType).toEqual({ id: testCatalog.packageTypeId, name: "fles" });
    expect(created.package.unitContent.amount).toBe("1.5");
    expect(created.package.unitContent.unitType).toEqual({ id: testCatalog.unitTypeId, name: "liter" });
    expect(created.package.unitsPerPackage).toBe(1);
  });

  it("creates a product without a brand", async () => {
    const productName = uniqueName("Merkloos water");
    const response = await createProductRequest({ name: productName, brandId: null });

    expect(response.status).toBe(201);
    const created = await response.json() as CreatedProductResponse;
    expect(created.name).toBe(productName);
    expect(created.brand).toBeNull();
    expect(created.package.id).toMatch(uuidPattern);
  });

  it("rejects invalid product and package input", async () => {
    const emptyNameResponse = await createProductRequest({ name: "   ", brandId: null });
    expect(emptyNameResponse.status).toBe(400);
    expect(await emptyNameResponse.json()).toMatchObject({ code: "VALIDATION_ERROR" });

    const invalidPackageResponse = await createProductRequest({ name: uniqueName("Ongeldige verpakking"), amount: "0", brandId: null });
    expect(invalidPackageResponse.status).toBe(400);
    expect(await invalidPackageResponse.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("does not persist a product when creation fails before package insertion", async () => {
    const productName = uniqueName("Rollback cola");
    const failedResponse = await createProductRequest({ name: productName, packageTypeId: 999_999, brandId: null });
    expect(failedResponse.status).toBe(400);

    expect(countProductsByNormalizedName(productName)).toBe(0);

    const successfulResponse = await createProductRequest({ name: productName, brandId: null });
    expect(successfulResponse.status).toBe(201);
    expect(countProductsByNormalizedName(productName)).toBe(1);
  });

  it("rejects duplicate brand names with different casing and surrounding spaces", async () => {
    const response = await app.request("/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  testMERK  " }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: testCatalog.brandId, name: "Testmerk" });
  });

  it("rejects duplicate root categories", async () => {
    const response = await app.request("/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  frisDRANK  ", parentId: null }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "CATEGORY_ALREADY_EXISTS" });
  });

  it("rejects duplicate sibling categories", async () => {
    const suffix = crypto.randomUUID();
    const parent = await createCategory(`Snacks ${suffix}`, null);
    await createCategory("Chips", parent.id);

    const duplicateResponse = await app.request("/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  chips  ", parentId: parent.id }),
    });

    expect(duplicateResponse.status).toBe(409);
    expect(await duplicateResponse.json()).toMatchObject({ code: "CATEGORY_ALREADY_EXISTS" });
  });

  it("rejects duplicate products with a brand", async () => {
    const productName = uniqueName("Dubbele merkcola");
    const firstResponse = await createProductRequest({ name: productName, brandId: testCatalog.brandId });
    expect(firstResponse.status).toBe(201);
    const firstProduct = await firstResponse.json() as CreatedProductResponse;

    const duplicateResponse = await createProductRequest({ name: `  ${productName.toUpperCase()}  `, brandId: testCatalog.brandId });
    expect(duplicateResponse.status).toBe(409);
    expect(await duplicateResponse.json()).toMatchObject({ code: "PRODUCT_ALREADY_EXISTS", existingProductId: firstProduct.id });
  });

  it("rejects duplicate products without a brand", async () => {
    const productName = uniqueName("Dubbele merkloze cola");
    const firstResponse = await createProductRequest({ name: productName, brandId: null });
    expect(firstResponse.status).toBe(201);

    const duplicateResponse = await createProductRequest({ name: `  ${productName.toUpperCase()}  `, brandId: null });
    expect(duplicateResponse.status).toBe(409);
    expect(await duplicateResponse.json()).toMatchObject({ code: "PRODUCT_ALREADY_EXISTS" });
  });

  it("reuses canonical unit content for equivalent decimal strings", async () => {
    await expectCreated(createProductRequest({ name: uniqueName("Decimal 1"), amount: "1.5", brandId: null }));
    await expectCreated(createProductRequest({ name: uniqueName("Decimal 2"), amount: "1.50", brandId: null }));
    await expectCreated(createProductRequest({ name: uniqueName("Decimal 3"), amount: "01.500", brandId: null }));

    const row = sqliteConnection.query("SELECT COUNT(*) AS count FROM unit_content WHERE unit_type_id = ? AND amount = ?").get(testCatalog.unitTypeId, 1.5) as { count: number };
    expect(row.count).toBe(1);
  });
});

type CreatedProductResponse = {
  readonly id: string;
  readonly name: string;
  readonly category: { readonly id: number; readonly name: string; readonly parentId: number | null };
  readonly brand: { readonly id: string; readonly name: string } | null;
  readonly package: {
    readonly id: string;
    readonly packageType: { readonly id: number; readonly name: string };
    readonly unitContent: { readonly id: number; readonly amount: string; readonly unitType: { readonly id: number; readonly name: string } };
    readonly unitsPerPackage: number;
  };
};

type CreateProductOverrides = {
  readonly name: string;
  readonly brandId: string | null;
  readonly amount?: string;
  readonly packageTypeId?: number;
};

async function createProductRequest(overrides: CreateProductOverrides): Promise<Response> {
  return app.request("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: overrides.name,
      categoryId: testCatalog.categoryId,
      brandId: overrides.brandId,
      package: {
        packageTypeId: overrides.packageTypeId ?? testCatalog.packageTypeId,
        amount: overrides.amount ?? "1.5",
        unitTypeId: testCatalog.unitTypeId,
        unitsPerPackage: 1,
      },
    }),
  });
}

async function createCategory(name: string, parentId: number | null): Promise<{ readonly id: number; readonly name: string; readonly parentId: number | null }> {
  const response = await app.request("/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, parentId }),
  });
  expect(response.status).toBe(201);
  return response.json() as Promise<{ readonly id: number; readonly name: string; readonly parentId: number | null }>;
}

async function expectCreated(responsePromise: Promise<Response>): Promise<void> {
  const response = await responsePromise;
  expect(response.status).toBe(201);
}

function countProductsByNormalizedName(name: string): number {
  const row = sqliteConnection.query("SELECT COUNT(*) AS count FROM product WHERE lower(trim(name)) = lower(trim(?))").get(name) as { count: number };
  return row.count;
}

function uniqueName(prefix: string): string {
  return `${prefix} ${crypto.randomUUID()}`;
}
