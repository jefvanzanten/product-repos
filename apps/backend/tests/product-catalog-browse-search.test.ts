import { describe, expect, it } from "bun:test";
import { app, sqliteConnection, testCatalog } from "./test-app";

describe("product catalog browse and search", () => {
  it("returns empty grouped search results for queries shorter than two characters", async () => {
    const response = await app.request("/products/search?query=c");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ products: [], brands: [], categories: [], hasMore: { products: false, brands: false, categories: false } });
  });

  it("searches product names, brand names and category paths but not package fields", async () => {
    const suffix = crypto.randomUUID();
    const root = await createCategory(`Padzoek Root ${suffix}`, null);
    const child = await createCategory(`Frisdrank ${suffix}`, root.id);
    const brand = await createBrand(`Zoekmerk ${suffix}`);
    const packageOnlyName = `NietZoekenVerpakking ${suffix}`;
    const packageTypeId = await createPackageType(packageOnlyName);

    const productByName = await createProduct({ name: `Cola Product ${suffix}`, categoryId: child.id, brandId: null });
    const productByBrand = await createProduct({ name: `Water ${suffix}`, categoryId: child.id, brandId: brand.id });
    await createProduct({ name: `Package Only ${suffix}`, categoryId: child.id, brandId: null, packageTypeId });

    const productSearch = await getJson<CatalogSearchResponse>(`/products/search?query=${encodeURIComponent(`cola product ${suffix}`)}`);
    expect(productSearch.products.map((product) => product.id)).toContain(productByName.id);
    expect(productSearch.products[0]?.packageSummary).toBe("fles 1.5 liter");

    const brandSearch = await getJson<CatalogSearchResponse>(`/products/search?query=${encodeURIComponent(`zoekmerk ${suffix}`)}`);
    expect(brandSearch.brands).toContainEqual({ id: brand.id, name: brand.name, productCount: 1 });
    expect(brandSearch.products.map((product) => product.id)).toContain(productByBrand.id);

    const categoryPathSearch = await getJson<CatalogSearchResponse>(`/products/search?query=${encodeURIComponent(`padzoek root ${suffix}`)}`);
    expect(categoryPathSearch.categories.map((category) => category.id)).toContain(root.id);
    expect(categoryPathSearch.products.map((product) => product.id)).toContain(productByName.id);

    const packageSearch = await getJson<CatalogSearchResponse>(`/products/search?query=${encodeURIComponent(packageOnlyName)}`);
    expect(packageSearch).toEqual({ products: [], brands: [], categories: [], hasMore: { products: false, brands: false, categories: false } });
  });

  it("applies search group limits and reports more results", async () => {
    const suffix = crypto.randomUUID();
    const firstCategory = await createCategory(`Limit Cat A ${suffix}`, null);
    const secondCategory = await createCategory(`Limit Cat B ${suffix}`, null);
    const firstBrand = await createBrand(`Limit Brand A ${suffix}`);
    const secondBrand = await createBrand(`Limit Brand B ${suffix}`);
    await createProduct({ name: `Limit Product A ${suffix}`, categoryId: firstCategory.id, brandId: firstBrand.id });
    await createProduct({ name: `Limit Product B ${suffix}`, categoryId: secondCategory.id, brandId: secondBrand.id });

    const response = await getJson<CatalogSearchResponse>(`/products/search?query=${encodeURIComponent(suffix)}&productLimit=1&brandLimit=1&categoryLimit=1`);
    expect(response.products).toHaveLength(1);
    expect(response.brands).toHaveLength(1);
    expect(response.categories).toHaveLength(1);
    expect(response.hasMore).toEqual({ products: true, brands: true, categories: true });
  });

  it("browses root categories without returning a flat product list", async () => {
    const suffix = crypto.randomUUID();
    const category = await createCategory(`Root Browse ${suffix}`, null);
    await createProduct({ name: `Root Browse Product ${suffix}`, categoryId: category.id, brandId: null });

    const response = await getJson<CatalogBrowseResponse>("/products");
    expect(response.state).toBe("root");
    if (response.state !== "root") throw new Error("Expected root browse response");
    expect(response.categories.map((item) => item.id)).toContain(category.id);
    expect(Object.hasOwn(response, "products")).toBe(false);
  });

  it("browses direct subcategories and direct category products only", async () => {
    const suffix = crypto.randomUUID();
    const parent = await createCategory(`Parent Browse ${suffix}`, null);
    const child = await createCategory(`Child Browse ${suffix}`, parent.id);
    const directProduct = await createProduct({ name: `Direct Product ${suffix}`, categoryId: parent.id, brandId: null });
    const childProduct = await createProduct({ name: `Child Product ${suffix}`, categoryId: child.id, brandId: null });

    const response = await getJson<CatalogBrowseResponse>(`/products?categoryId=${parent.id}`);
    expect(response.state).toBe("category");
    if (response.state !== "category") throw new Error("Expected category browse response");
    expect(response.subcategories.map((item) => item.id)).toContain(child.id);
    expect(response.products.items.map((product) => product.id)).toContain(directProduct.id);
    expect(response.products.items.map((product) => product.id)).not.toContain(childProduct.id);
  });

  it("browses brand products grouped by category", async () => {
    const suffix = crypto.randomUUID();
    const brand = await createBrand(`Groep Merk ${suffix}`);
    const firstCategory = await createCategory(`Groep Cat A ${suffix}`, null);
    const secondCategory = await createCategory(`Groep Cat B ${suffix}`, null);
    const firstProduct = await createProduct({ name: `Groep Product A ${suffix}`, categoryId: firstCategory.id, brandId: brand.id });
    const secondProduct = await createProduct({ name: `Groep Product B ${suffix}`, categoryId: secondCategory.id, brandId: brand.id });

    const response = await getJson<CatalogBrowseResponse>(`/products?brandId=${brand.id}`);
    expect(response.state).toBe("brand");
    if (response.state !== "brand") throw new Error("Expected brand browse response");
    expect(response.brand).toEqual(brand);
    expect(response.productGroups.map((group) => group.categoryPath)).toContain(firstCategory.name);
    expect(response.productGroups.map((group) => group.categoryPath)).toContain(secondCategory.name);
    expect(response.productGroups.flatMap((group) => group.products.map((product) => product.id))).toContain(firstProduct.id);
    expect(response.productGroups.flatMap((group) => group.products.map((product) => product.id))).toContain(secondProduct.id);
  });

  it("uses cumulative limits for browse more-load states", async () => {
    const suffix = crypto.randomUUID();
    const category = await createCategory(`Meer Laden Cat ${suffix}`, null);
    await createProduct({ name: `Meer Laden Product A ${suffix}`, categoryId: category.id, brandId: null });
    await createProduct({ name: `Meer Laden Product B ${suffix}`, categoryId: category.id, brandId: null });

    const firstPage = await getJson<CatalogBrowseResponse>(`/products?categoryId=${category.id}&limit=1`);
    expect(firstPage.state).toBe("category");
    if (firstPage.state !== "category") throw new Error("Expected category browse response");
    expect(firstPage.products.items).toHaveLength(1);
    expect(firstPage.products.hasMore).toBe(true);
    expect(firstPage.products.cursor).toBe("51");

    const expandedPage = await getJson<CatalogBrowseResponse>(`/products?categoryId=${category.id}&limit=${firstPage.products.cursor}`);
    expect(expandedPage.state).toBe("category");
    if (expandedPage.state !== "category") throw new Error("Expected category browse response");
    expect(expandedPage.products.items).toHaveLength(2);
    expect(expandedPage.products.hasMore).toBe(false);
  });
});

type CatalogSearchResponse = {
  readonly products: ReadonlyArray<{ readonly id: string; readonly packageSummary: string }>;
  readonly brands: ReadonlyArray<{ readonly id: string; readonly name: string; readonly productCount: number }>;
  readonly categories: ReadonlyArray<{ readonly id: number }>;
  readonly hasMore: { readonly products: boolean; readonly brands: boolean; readonly categories: boolean };
};

type CatalogBrowseResponse =
  | { readonly state: "root"; readonly categories: ReadonlyArray<{ readonly id: number }>; readonly isEmpty: boolean }
  | { readonly state: "category"; readonly subcategories: ReadonlyArray<{ readonly id: number }>; readonly products: { readonly items: ReadonlyArray<{ readonly id: string }>; readonly hasMore: boolean; readonly cursor: string | null } }
  | { readonly state: "brand"; readonly brand: BrandResponse; readonly productGroups: ReadonlyArray<{ readonly categoryPath: string; readonly products: ReadonlyArray<{ readonly id: string }> }> };

type BrandResponse = { readonly id: string; readonly name: string };
type CategoryResponse = { readonly id: number; readonly name: string; readonly parentId: number | null };
type CreatedProductResponse = { readonly id: string };

async function getJson<T>(path: string): Promise<T> {
  const response = await app.request(path);
  expect(response.status).toBe(200);
  return response.json() as Promise<T>;
}

async function createBrand(name: string): Promise<BrandResponse> {
  const response = await app.request("/brands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  expect(response.status).toBe(201);
  return response.json() as Promise<BrandResponse>;
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

async function createProduct(input: { readonly name: string; readonly categoryId: number; readonly brandId: string | null; readonly packageTypeId?: number }): Promise<CreatedProductResponse> {
  const response = await app.request("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      categoryId: input.categoryId,
      brandId: input.brandId,
      package: {
        packageTypeId: input.packageTypeId ?? testCatalog.packageTypeId,
        amount: "1.5",
        unitTypeId: testCatalog.unitTypeId,
        unitsPerPackage: 1,
      },
    }),
  });
  expect(response.status).toBe(201);
  return response.json() as Promise<CreatedProductResponse>;
}

async function createPackageType(name: string): Promise<number> {
  const row = sqliteConnection.query("INSERT INTO package_type (name) VALUES (?) RETURNING id").get(name) as { readonly id: number };
  return row.id;
}
