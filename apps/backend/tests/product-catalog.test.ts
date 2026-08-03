import { describe, expect, it } from "bun:test";
import { catalogBrowseResponseSchema, catalogSearchResponseSchema, productCreatedDtoSchema, productDetailDtoSchema } from "@product-repos/contracts";
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
        portion: null,
      },
    }),
  });
  expect(response.status).toBe(201);
  return productCreatedDtoSchema.parse(await response.json());
}

describe("product catalog browsing", () => {
  it("returns root categories without a flat product list", async () => {
    const response = await requestAsAdmin("/products");
    expect(response.status).toBe(200);
    const body = catalogBrowseResponseSchema.parse(await response.json());

    expect(body.state).toBe("root");
    if (body.state !== "root") throw new Error("Root catalog response was expected");
    expect(body.categories.some((category) => category.name === "Frisdrank")).toBe(true);
    expect("products" in body).toBe(false);
  });

  it("returns category browse products and product detail", async () => {
    const created = await createTestProduct(`Browse ${crypto.randomUUID()}`);

    const browseResponse = await requestAsAdmin(`/products?categoryId=${testCatalog.categoryId}`);
    expect(browseResponse.status).toBe(200);
    const browse = catalogBrowseResponseSchema.parse(await browseResponse.json());
    expect(browse.state).toBe("category");
    if (browse.state !== "category") throw new Error("Category catalog response was expected");
    expect(browse.products.items.some((product) => product.id === created.id && product.consumptionType === "DRINK" && product.packageSummary === "fles 1.5 liter")).toBe(true);

    const detailResponse = await requestAsAdmin(`/products/${created.id}`);
    expect(detailResponse.status).toBe(200);
    const detail = productDetailDtoSchema.parse(await detailResponse.json());
    expect(detail.id).toBe(created.id);
    expect(detail.consumptionType).toBe("DRINK");
    expect(detail.macroProfile).toBeNull();
    expect(detail.displayName).toContain("Testmerk");
    expect(detail.packages[0]?.summary).toBe("fles 1.5 liter");
  });

  it("persists total package content and optional portion data through create and update routes", async () => {
    const created = await createTestProduct(`Packages ${crypto.randomUUID()}`);
    const addResponse = await requestAsAdmin(`/products/${created.id}/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageTypeId: testCatalog.packageTypeId,
        imageUrl: "https://example.com/multipack.jpg",
        amount: "1980",
        unitTypeId: testCatalog.unitTypeId,
        portion: { name: "blikje", amount: "330", unitTypeId: testCatalog.unitTypeId, portionsPerPackage: 6 },
      }),
    });
    expect(addResponse.status).toBe(201);

    const detailAfterAdd = productDetailDtoSchema.parse(await (await requestAsAdmin(`/products/${created.id}`)).json());
    const multiPackage = detailAfterAdd.packages.find((item) => item.portion?.portionsPerPackage === 6);
    expect(multiPackage?.unitContent.amount).toBe("1980");
    expect(multiPackage?.imageUrl).toBe("https://example.com/multipack.jpg");
    expect(multiPackage?.portion).toMatchObject({ name: "blikje", unitContent: { amount: "330" }, portionsPerPackage: 6 });
    expect(multiPackage?.summary).toContain("6 ×");
    if (multiPackage === undefined) throw new Error("Created multi-package was not returned by product detail");

    const updateResponse = await requestAsAdmin(`/products/${created.id}/packages/${multiPackage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageTypeId: testCatalog.packageTypeId,
        imageUrl: "https://example.com/single-package.jpg",
        amount: "330",
        unitTypeId: testCatalog.unitTypeId,
        portion: null,
      }),
    });
    expect(updateResponse.status).toBe(200);
    const detailAfterUpdate = productDetailDtoSchema.parse(await (await requestAsAdmin(`/products/${created.id}`)).json());
    const updatedPackage = detailAfterUpdate.packages.find((item) => item.id === multiPackage.id);
    expect(updatedPackage?.portion).toBeNull();
    expect(updatedPackage?.imageUrl).toBe("https://example.com/single-package.jpg");
  });

  it("validates and serves an uploaded package image", async () => {
    const created = await createTestProduct(`Image ${crypto.randomUUID()}`);
    const form = new FormData();
    const validPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    form.set("image", new File([validPng], "package.png", { type: "image/png" }));

    const uploadResponse = await requestAsAdmin(`/products/${created.id}/packages/${created.package.id}/image`, { method: "POST", body: form });

    expect(uploadResponse.status).toBe(201);
    const upload = await uploadResponse.json() as { readonly imageUrl: string };
    const imagePath = new URL(upload.imageUrl).pathname;
    const imageResponse = await requestAsAdmin(imagePath);
    expect(imageResponse.status).toBe(200);
    expect(imageResponse.headers.get("content-type")).toBe("image/png");
    expect(imageResponse.headers.get("x-content-type-options")).toBe("nosniff");

    const cleanupResponse = await requestAsAdmin(`/products/${created.id}/packages/${created.package.id}/image`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: upload.imageUrl }),
    });
    expect(cleanupResponse.status).toBe(204);
    expect((await requestAsAdmin(imagePath)).status).toBe(404);
  });

  it("searches products, brands and categories", async () => {
    const created = await createTestProduct(`Search ${crypto.randomUUID()}`);

    const response = await requestAsAdmin("/products/search?query=Testmerk");
    expect(response.status).toBe(200);
    const body = catalogSearchResponseSchema.parse(await response.json());

    expect(body.products.some((product) => product.id === created.id)).toBe(true);
    expect(body.brands.some((brand) => brand.name === "Testmerk")).toBe(true);

    const categoryResponse = await requestAsAdmin("/products/search?query=Frisdrank");
    const categoryBody = catalogSearchResponseSchema.parse(await categoryResponse.json());
    expect(categoryBody.categories.some((category) => category.path === "Frisdrank")).toBe(true);
  });
});
