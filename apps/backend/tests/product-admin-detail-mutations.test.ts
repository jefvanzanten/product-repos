import { describe, expect, it } from "bun:test";
import { app, sqliteConnection, testCatalog } from "./test-app";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("product detail mutations", () => {
  it("updates product name, category and nullable brand", async () => {
    const product = await createProduct({ name: uniqueName("Te bewerken cola"), brandId: testCatalog.brandId });
    const category = await createCategory(uniqueName("Nieuwe frisdrankcategorie"), null);

    const response = await app.request(`/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `  ${product.name} updated  `, categoryId: category.id, brandId: null }),
    });

    expect(response.status).toBe(200);
    const detail = await response.json() as ProductDetailResponse;
    expect(detail.id).toBe(product.id);
    expect(detail.name).toBe(`${product.name} updated`);
    expect(detail.displayName).toBe(`${product.name} updated`);
    expect(detail.category).toEqual(category);
    expect(detail.categoryPath).toEqual([category]);
    expect(detail.brand).toBeNull();
  });

  it("blocks duplicate product updates while excluding the current product", async () => {
    const duplicateName = uniqueName("Dubbele update cola");
    const first = await createProduct({ name: duplicateName, brandId: testCatalog.brandId });
    const second = await createProduct({ name: uniqueName("Andere update cola"), brandId: testCatalog.brandId });

    const sameProductResponse = await app.request(`/products/${first.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `  ${duplicateName.toUpperCase()}  `, categoryId: testCatalog.categoryId, brandId: testCatalog.brandId }),
    });
    expect(sameProductResponse.status).toBe(200);

    const duplicateResponse = await app.request(`/products/${second.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `  ${duplicateName.toUpperCase()}  `, categoryId: testCatalog.categoryId, brandId: testCatalog.brandId }),
    });

    expect(duplicateResponse.status).toBe(409);
    expect(await duplicateResponse.json()).toMatchObject({ code: "PRODUCT_ALREADY_EXISTS", existingProductId: first.id });
  });

  it("returns PRODUCT_NOT_FOUND for product updates to unknown ids", async () => {
    const response = await app.request(`/products/${crypto.randomUUID()}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: uniqueName("Onbekend product"), categoryId: testCatalog.categoryId, brandId: null }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });
  });

  it("adds, reads and updates product packages", async () => {
    const product = await createProduct({ name: uniqueName("Verpakkingen cola"), brandId: null });
    const gramUnitTypeId = await createUnitType(uniqueName("gram"));
    const boxPackageTypeId = await createPackageType(uniqueName("doos"));

    const createResponse = await app.request(`/products/${product.id}/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageTypeId: boxPackageTypeId, amount: "01.500", unitTypeId: gramUnitTypeId, unitsPerPackage: 12 }),
    });

    expect(createResponse.status).toBe(201);
    const createdPackage = await createResponse.json() as ProductPackageDetailResponse;
    expect(createdPackage.id).toMatch(uuidPattern);
    expect(createdPackage.productId).toBe(product.id);
    expect(createdPackage.unitContent.amount).toBe("1.5");
    expect(createdPackage.unitsPerPackage).toBe(12);
    expect(createdPackage.summary).toContain("12 x 1.5");

    const getResponse = await app.request(`/products/${product.id}/packages/${createdPackage.id}`);
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toEqual(createdPackage);

    const milliliterUnitTypeId = await createUnitType(uniqueName("milliliter"));
    const trayPackageTypeId = await createPackageType(uniqueName("tray"));
    const updateResponse = await app.request(`/products/${product.id}/packages/${createdPackage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageTypeId: trayPackageTypeId, amount: "330.0", unitTypeId: milliliterUnitTypeId, unitsPerPackage: 6 }),
    });

    expect(updateResponse.status).toBe(200);
    const updatedPackage = await updateResponse.json() as ProductPackageDetailResponse;
    expect(updatedPackage.id).toBe(createdPackage.id);
    expect(updatedPackage.productId).toBe(product.id);
    expect(updatedPackage.unitContent.amount).toBe("330");
    expect(updatedPackage.unitsPerPackage).toBe(6);
    expect(updatedPackage.summary).toContain("6 x 330");
  });

  it("blocks duplicate package creation and updates while excluding the current package", async () => {
    const product = await createProduct({ name: uniqueName("Dubbele verpakking cola"), brandId: null });

    const duplicateCreateResponse = await app.request(`/products/${product.id}/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageTypeId: testCatalog.packageTypeId, amount: "1.50", unitTypeId: testCatalog.unitTypeId, unitsPerPackage: 1 }),
    });
    expect(duplicateCreateResponse.status).toBe(409);
    expect(await duplicateCreateResponse.json()).toMatchObject({ code: "PRODUCT_PACKAGE_ALREADY_EXISTS" });

    const packageTypeId = await createPackageType(uniqueName("krat"));
    const addResponse = await app.request(`/products/${product.id}/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageTypeId, amount: "0.5", unitTypeId: testCatalog.unitTypeId, unitsPerPackage: 6 }),
    });
    expect(addResponse.status).toBe(201);
    const addedPackage = await addResponse.json() as ProductPackageDetailResponse;

    const samePackageResponse = await app.request(`/products/${product.id}/packages/${addedPackage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageTypeId, amount: "0.50", unitTypeId: testCatalog.unitTypeId, unitsPerPackage: 6 }),
    });
    expect(samePackageResponse.status).toBe(200);

    const duplicateUpdateResponse = await app.request(`/products/${product.id}/packages/${addedPackage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageTypeId: testCatalog.packageTypeId, amount: "1.5", unitTypeId: testCatalog.unitTypeId, unitsPerPackage: 1 }),
    });
    expect(duplicateUpdateResponse.status).toBe(409);
    expect(await duplicateUpdateResponse.json()).toMatchObject({ code: "PRODUCT_PACKAGE_ALREADY_EXISTS" });
  });

  it("returns product and package not-found states for package endpoints", async () => {
    const firstProduct = await createProduct({ name: uniqueName("Eerste verpakking eigenaar"), brandId: null });
    const secondProduct = await createProduct({ name: uniqueName("Tweede verpakking eigenaar"), brandId: null });

    const unknownProductResponse = await app.request(`/products/${crypto.randomUUID()}/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageTypeId: testCatalog.packageTypeId, amount: "1.5", unitTypeId: testCatalog.unitTypeId, unitsPerPackage: 1 }),
    });
    expect(unknownProductResponse.status).toBe(404);
    expect(await unknownProductResponse.json()).toEqual({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

    const unknownPackageResponse = await app.request(`/products/${firstProduct.id}/packages/${crypto.randomUUID()}`);
    expect(unknownPackageResponse.status).toBe(404);
    expect(await unknownPackageResponse.json()).toEqual({ code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" });

    const otherProductPackageResponse = await app.request(`/products/${firstProduct.id}/packages/${secondProduct.package.id}`);
    expect(otherProductPackageResponse.status).toBe(404);
    expect(await otherProductPackageResponse.json()).toEqual({ code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" });
  });
});

type ProductDetailResponse = {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly category: CategoryResponse;
  readonly categoryPath: ReadonlyArray<CategoryResponse>;
  readonly brand: { readonly id: string; readonly name: string } | null;
};

type ProductPackageDetailResponse = {
  readonly id: string;
  readonly productId: string;
  readonly packageType: { readonly id: number; readonly name: string };
  readonly unitContent: { readonly id: number; readonly amount: string; readonly unitType: { readonly id: number; readonly name: string } };
  readonly unitsPerPackage: number;
  readonly summary: string;
};

type CreatedProductResponse = {
  readonly id: string;
  readonly name: string;
  readonly package: { readonly id: string };
};

type CategoryResponse = { readonly id: number; readonly name: string; readonly parentId: number | null };

async function createProduct(input: { readonly name: string; readonly brandId: string | null }): Promise<CreatedProductResponse> {
  const response = await app.request("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      categoryId: testCatalog.categoryId,
      brandId: input.brandId,
      package: {
        packageTypeId: testCatalog.packageTypeId,
        amount: "1.5",
        unitTypeId: testCatalog.unitTypeId,
        unitsPerPackage: 1,
      },
    }),
  });
  expect(response.status).toBe(201);
  return response.json() as Promise<CreatedProductResponse>;
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

async function createUnitType(name: string): Promise<number> {
  const row = sqliteConnection.query("INSERT INTO unit_type (name) VALUES (?) RETURNING id").get(name) as { readonly id: number };
  return row.id;
}

async function createPackageType(name: string): Promise<number> {
  const row = sqliteConnection.query("INSERT INTO package_type (name) VALUES (?) RETURNING id").get(name) as { readonly id: number };
  return row.id;
}

function uniqueName(prefix: string): string {
  return `${prefix} ${crypto.randomUUID()}`;
}
