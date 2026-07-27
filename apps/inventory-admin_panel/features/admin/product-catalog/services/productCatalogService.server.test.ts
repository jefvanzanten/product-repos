import assert from "node:assert/strict";
import test from "node:test";
import { createProductPackageRequestSchema, createProductRequestSchema, updateProductPackageRequestSchema, updateProductRequestSchema } from "@product-repos/contracts";
import { browseCatalog, createProduct, createProductPackage, getBrandById, getProductDetail, getProductPackageDetail, searchCatalog, updateProduct, updateProductPackage } from "./productCatalogService.server";

const validRequest = {
  name: "Zero Sugar",
  categoryId: 1,
  brandId: null,
  package: {
    packageTypeId: 2,
    amount: "1.5",
    unitTypeId: 3,
    unitsPerPackage: 1,
  },
} as const;

const validResponse = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Zero Sugar",
  category: { id: 1, name: "Frisdrank", parentId: null },
  brand: null,
  package: {
    id: "22222222-2222-4222-8222-222222222222",
    packageType: { id: 2, name: "fles" },
    unitContent: { id: 4, amount: "1.5", unitType: { id: 3, name: "liter" } },
    unitsPerPackage: 1,
    summary: "fles 1.5 liter",
  },
} as const;

const validDetailResponse = {
  id: validResponse.id,
  name: validResponse.name,
  displayName: "Zero Sugar",
  category: validResponse.category,
  categoryPath: [validResponse.category],
  brand: validResponse.brand,
  packages: [validResponse.package],
} as const;

const validPackageDetailResponse = {
  ...validResponse.package,
  productId: validResponse.id,
} as const;

test("createProduct posts and parses the shared product creation contract", async () => {
  const successfulCall = await withFetchResponse({ responseBody: validResponse, status: 201 }, () => createProduct(validRequest));

  assert.equal(successfulCall.requestUrl, "http://localhost:3000/products");
  assert.deepEqual(successfulCall.requestBody, createProductRequestSchema.parse(validRequest));
  assert.equal(successfulCall.result.id, validResponse.id);
  assert.equal(successfulCall.result.package.id, validResponse.package.id);
  assert.equal(successfulCall.result.package.summary, "fles 1.5 liter");

  const numericPackageIdResponse = { ...validResponse, package: { ...validResponse.package, id: 1 } };
  let rejectedNumericPackageId = false;
  await withFetchResponse({ responseBody: numericPackageIdResponse, status: 201 }, async () => {
    try {
      await createProduct(validRequest);
    } catch {
      rejectedNumericPackageId = true;
    }
  });

  assert.equal(rejectedNumericPackageId, true);
});

test("getBrandById parses a selected brand and maps BRAND_NOT_FOUND to null", async () => {
  const brand = { id: "33333333-3333-4333-8333-333333333333", name: "Testmerk" };
  const successfulCall = await withFetchResponse({ responseBody: brand, status: 200 }, () => getBrandById(brand.id));

  assert.equal(successfulCall.requestUrl, `http://localhost:3000/brands/${brand.id}`);
  assert.deepEqual(successfulCall.result, brand);

  const notFoundCall = await withFetchResponse({ responseBody: { code: "BRAND_NOT_FOUND", message: "Brand not found" }, status: 404 }, () => getBrandById(brand.id));
  assert.equal(notFoundCall.result, null);
});

test("getProductDetail parses product detail and maps PRODUCT_NOT_FOUND to null", async () => {
  const successfulCall = await withFetchResponse({ responseBody: validDetailResponse, status: 200 }, () => getProductDetail(validDetailResponse.id));

  assert.equal(successfulCall.requestUrl, `http://localhost:3000/products/${validDetailResponse.id}`);
  assert.equal(successfulCall.result?.packages[0]?.summary, "fles 1.5 liter");

  const notFoundCall = await withFetchResponse({ responseBody: { code: "PRODUCT_NOT_FOUND", message: "Product not found" }, status: 404 }, () => getProductDetail(validDetailResponse.id));
  assert.equal(notFoundCall.result, null);
});

test("updateProduct patches and parses the shared product update contract", async () => {
  const request = { name: "Zero", categoryId: 1, brandId: null };
  const successfulCall = await withFetchResponse({ responseBody: { ...validDetailResponse, name: "Zero" }, status: 200 }, () => updateProduct(validDetailResponse.id, request));

  assert.equal(successfulCall.requestMethod, "PATCH");
  assert.equal(successfulCall.requestUrl, `http://localhost:3000/products/${validDetailResponse.id}`);
  assert.deepEqual(successfulCall.requestBody, updateProductRequestSchema.parse(request));
  assert.equal(successfulCall.result.name, "Zero");
});

test("createProductPackage posts and parses the shared package create contract", async () => {
  const request = { amount: "1.5", packageTypeId: 2, unitTypeId: 3, unitsPerPackage: 1 };
  const successfulCall = await withFetchResponse({ responseBody: validPackageDetailResponse, status: 201 }, () => createProductPackage(validResponse.id, request));

  assert.equal(successfulCall.requestMethod, "POST");
  assert.equal(successfulCall.requestUrl, `http://localhost:3000/products/${validResponse.id}/packages`);
  assert.deepEqual(successfulCall.requestBody, createProductPackageRequestSchema.parse(request));
  assert.equal(successfulCall.result.summary, "fles 1.5 liter");
});

test("getProductPackageDetail parses package detail and distinguishes not-found states", async () => {
  const successfulCall = await withFetchResponse({ responseBody: validPackageDetailResponse, status: 200 }, () => getProductPackageDetail(validResponse.id, validResponse.package.id));

  assert.equal(successfulCall.requestUrl, `http://localhost:3000/products/${validResponse.id}/packages/${validResponse.package.id}`);
  assert.equal(successfulCall.result.state, "found");
  if (successfulCall.result.state === "found") assert.equal(successfulCall.result.productPackage.id, validResponse.package.id);

  const productNotFoundCall = await withFetchResponse({ responseBody: { code: "PRODUCT_NOT_FOUND", message: "Product not found" }, status: 404 }, () => getProductPackageDetail(validResponse.id, validResponse.package.id));
  assert.equal(productNotFoundCall.result.state, "productNotFound");

  const packageNotFoundCall = await withFetchResponse({ responseBody: { code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" }, status: 404 }, () => getProductPackageDetail(validResponse.id, validResponse.package.id));
  assert.equal(packageNotFoundCall.result.state, "packageNotFound");
});

test("updateProductPackage patches and parses the shared package update contract", async () => {
  const request = { amount: "1.5", packageTypeId: 2, unitTypeId: 3, unitsPerPackage: 1 };
  const successfulCall = await withFetchResponse({ responseBody: validPackageDetailResponse, status: 200 }, () => updateProductPackage(validResponse.id, validResponse.package.id, request));

  assert.equal(successfulCall.requestMethod, "PATCH");
  assert.equal(successfulCall.requestUrl, `http://localhost:3000/products/${validResponse.id}/packages/${validResponse.package.id}`);
  assert.deepEqual(successfulCall.requestBody, updateProductPackageRequestSchema.parse(request));
  assert.equal(successfulCall.result.productId, validResponse.id);
});

test("searchCatalog calls and parses the grouped catalog search endpoint", async () => {
  const responseBody = {
    products: [{ id: validResponse.id, displayName: "Zero Sugar", brand: null, categoryPath: "Frisdrank", packageSummary: "fles 1.5 liter" }],
    brands: [{ id: "33333333-3333-4333-8333-333333333333", name: "Testmerk", productCount: 1 }],
    categories: [{ id: 1, name: "Frisdrank", parentId: null, path: "Frisdrank", productCount: 1 }],
    hasMore: { products: true, brands: false, categories: false },
  };

  const successfulCall = await withFetchResponse({ responseBody, status: 200 }, () => searchCatalog("zero sugar", { productLimit: 40 }));

  assert.equal(successfulCall.requestUrl, "http://localhost:3000/products/search?query=zero+sugar&productLimit=40");
  assert.equal(successfulCall.result.products[0]?.packageSummary, "fles 1.5 liter");
  assert.equal(successfulCall.result.brands[0]?.productCount, 1);
});

test("browseCatalog calls root and contextual browse endpoints", async () => {
  const rootResponse = { state: "root", categories: [], isEmpty: true };
  const rootCall = await withFetchResponse({ responseBody: rootResponse, status: 200 }, () => browseCatalog());
  assert.equal(rootCall.requestUrl, "http://localhost:3000/products");
  assert.deepEqual(rootCall.result, rootResponse);

  const brandResponse = { state: "brand", brand: { id: "33333333-3333-4333-8333-333333333333", name: "Testmerk" }, productGroups: [], hasMore: false, cursor: null };
  const brandCall = await withFetchResponse({ responseBody: brandResponse, status: 200 }, () => browseCatalog({ brandId: brandResponse.brand.id, limit: 100 }));
  assert.equal(brandCall.requestUrl, `http://localhost:3000/products?brandId=${brandResponse.brand.id}&limit=100`);

  const categoryResponse = { state: "category", category: { id: 1, name: "Frisdrank", parentId: null, path: "Frisdrank", productCount: 0 }, categoryPath: [{ id: 1, name: "Frisdrank", parentId: null }], subcategories: [], products: { items: [], hasMore: false, cursor: null } };
  const categoryCall = await withFetchResponse({ responseBody: categoryResponse, status: 200 }, () => browseCatalog({ categoryId: 1 }));
  assert.equal(categoryCall.requestUrl, "http://localhost:3000/products?categoryId=1");
});

test("browseCatalog maps missing browse contexts to invalid context states", async () => {
  const brandId = "33333333-3333-4333-8333-333333333333";
  const brandCall = await withFetchResponse({ responseBody: { code: "REFERENCE_NOT_FOUND", message: "Brand not found" }, status: 400 }, () => browseCatalog({ brandId }));
  assert.deepEqual(brandCall.result, { state: "invalidContext", contextType: "brand", contextId: brandId });

  const categoryCall = await withFetchResponse({ responseBody: { code: "REFERENCE_NOT_FOUND", message: "Category not found" }, status: 400 }, () => browseCatalog({ categoryId: 123 }));
  assert.deepEqual(categoryCall.result, { state: "invalidContext", contextType: "category", contextId: "123" });
});

async function withFetchResponse<T>(response: { readonly responseBody: unknown; readonly status: number }, run: () => Promise<T>): Promise<{ readonly result: T; readonly requestBody: unknown; readonly requestMethod: string; readonly requestUrl: string }> {
  const originalFetch = globalThis.fetch;
  let requestBody: unknown = undefined;
  let requestMethod = "GET";
  let requestUrl = "";

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    requestUrl = String(input);
    requestMethod = init?.method ?? "GET";
    const body = init?.body;
    if (typeof body === "string") requestBody = JSON.parse(body);
    return new Response(JSON.stringify(response.responseBody), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const result = await run();
    return { result, requestBody, requestMethod, requestUrl };
  } finally {
    globalThis.fetch = originalFetch;
  }
}
