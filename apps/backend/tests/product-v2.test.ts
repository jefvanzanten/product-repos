import { describe, expect, test } from "bun:test";
import { concreteProductDetailSchema, concreteProductPageSchema, logListSchema, productCompositionDtoSchema, storedMacroProfileSchema } from "@product-repos/contracts";
import { requestAsAdmin, requestAsUser, testCatalog } from "./test-app.ts";

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

    const detailResponse = await requestAsAdmin(`/products/${product.productId}`);
    expect(detailResponse.status).toBe(200);
    const detail = concreteProductDetailSchema.parse(await detailResponse.json());
    expect(detail.composition.id).toBe(composition.id);

    const compositionSearchResponse = await requestAsAdmin(`/product-compositions/search?query=${encodeURIComponent(name)}`);
    expect(compositionSearchResponse.status).toBe(200);
    expect(productCompositionDtoSchema.array().parse(await compositionSearchResponse.json()).some((item) => item.id === composition.id)).toBe(true);

    const updateResponse = await requestJson(`/products/${product.productId}`, "PUT", {
      packageTypeId: testCatalog.packageTypeId,
      content: { amount: "2", unitTypeId: testCatalog.unitTypeId },
      barcode: product.barcode,
      portion: null,
    });
    expect(updateResponse.status).toBe(200);
    const updated = concreteProductDetailSchema.parse(await updateResponse.json());
    expect(updated.productCompositionId).toBe(composition.id);
    expect(updated.content?.amount).toBe("2");

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

  test("keeps non-consumable products in the catalog but outside new consumption boundaries", async () => {
    const name = `Waterstofperoxide ${crypto.randomUUID()}`;
    const compositionResponse = await requestJson("/product-compositions", "POST", {
      name,
      categoryId: testCatalog.categoryId,
      brandId: null,
      consumptionType: null,
      macroProfile: null,
    });
    expect(compositionResponse.status).toBe(201);
    const composition = productCompositionDtoSchema.parse(await compositionResponse.json());
    const productResponse = await requestJson("/products", "POST", {
      productCompositionId: composition.id,
      packageTypeId: testCatalog.packageTypeId,
      content: { amount: "1", unitTypeId: testCatalog.unitTypeId },
      barcode: crypto.randomUUID(),
    });
    const product = concreteProductDetailSchema.parse(await productResponse.json());

    const catalogResponse = await requestAsAdmin(`/products?query=${encodeURIComponent(name)}`);
    expect(concreteProductPageSchema.parse(await catalogResponse.json()).items.some((item) => item.productId === product.productId)).toBe(true);

    const searchResponse = await requestAsUser(`/calorie-tracker/products/search?query=${encodeURIComponent(name)}`);
    expect(await searchResponse.json()).toEqual([]);

    const logResponse = await requestAsUser("/calorie-tracker/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Browser-Timezone": "Europe/Amsterdam" },
      body: JSON.stringify({ id: crypto.randomUUID(), type: "PRODUCT", productId: product.productId, quantity: "1", inputMode: "FULL_PRODUCT", inputUnitTypeId: null, consumedAt: "2026-01-01T12:00:00.000Z" }),
    });
    expect(logResponse.status).toBe(409);
    expect(await logResponse.json()).toMatchObject({ code: "PRODUCT_NOT_CONSUMABLE" });

    const recipeResponse = await requestAsUser("/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, servings: "1", ingredients: [{ productId: product.productId, quantity: "1", inputMode: "FULL_PRODUCT", inputUnitTypeId: null }] }),
    });
    expect(recipeResponse.status).toBe(409);
    expect(await recipeResponse.json()).toMatchObject({ code: "PRODUCT_NOT_CONSUMABLE" });
  });

  test("keeps reclassified historical logs under all without inactive macro contributions", async () => {
    const name = `Historische drank ${crypto.randomUUID()}`;
    const compositionResponse = await requestJson("/product-compositions", "POST", {
      name,
      categoryId: testCatalog.categoryId,
      brandId: null,
      consumptionType: "DRINK",
      macroProfile: { referenceBasis: "PER_100_ML", caloriesKcal: "10", proteinG: null, carbohydratesG: null, fatG: null, caloriesSource: "MANUAL" },
    });
    const composition = productCompositionDtoSchema.parse(await compositionResponse.json());
    const productResponse = await requestJson("/products", "POST", {
      productCompositionId: composition.id,
      packageTypeId: testCatalog.packageTypeId,
      content: { amount: "1", unitTypeId: testCatalog.unitTypeId },
      barcode: crypto.randomUUID(),
    });
    const product = concreteProductDetailSchema.parse(await productResponse.json());
    const logResponse = await requestAsUser("/calorie-tracker/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Browser-Timezone": "UTC" },
      body: JSON.stringify({ id: crypto.randomUUID(), type: "PRODUCT", productId: product.productId, quantity: "1", inputMode: "FULL_PRODUCT", inputUnitTypeId: null, consumedAt: "2026-01-02T12:00:00.000Z" }),
    });
    expect(logResponse.status).toBe(201);

    await requestJson(`/product-compositions/${composition.id}`, "PUT", { name, categoryId: testCatalog.categoryId, brandId: null, consumptionType: null });
    const allResponse = await requestAsUser("/calorie-tracker/logs?date=2026-01-02&type=all", { headers: { "X-Browser-Timezone": "UTC" } });
    const allLogs = logListSchema.parse(await allResponse.json());
    expect(allLogs.items).toHaveLength(1);
    expect(allLogs.items[0]?.type === "PRODUCT" ? allLogs.items[0].product.consumptionType : "unexpected").toBeNull();
    expect(allLogs.items[0]?.macroValues).toBeNull();

    const typedResponse = await requestAsUser("/calorie-tracker/logs?date=2026-01-02&type=drink", { headers: { "X-Browser-Timezone": "UTC" } });
    expect(logListSchema.parse(await typedResponse.json()).items).toEqual([]);
  });

  test("preserves macro values while consumption and nutrition are disabled", async () => {
    const name = `Niet-consumptie ${crypto.randomUUID()}`;
    const compositionResponse = await requestJson("/product-compositions", "POST", {
      name,
      categoryId: testCatalog.categoryId,
      brandId: null,
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
    const composition = productCompositionDtoSchema.parse(await compositionResponse.json());
    expect(composition.macroProfile?.enabled).toBe(true);

    const disableComposition = await requestJson(`/product-compositions/${composition.id}`, "PUT", {
      name,
      categoryId: testCatalog.categoryId,
      brandId: null,
      consumptionType: null,
    });
    expect(disableComposition.status).toBe(200);
    const disabled = productCompositionDtoSchema.parse(await disableComposition.json());
    expect(disabled.consumptionType).toBeNull();
    expect(disabled.macroProfile).toMatchObject({ enabled: false, caloriesKcal: "42", carbohydratesG: "10" });

    const restoreConsumption = await requestJson(`/product-compositions/${composition.id}`, "PUT", {
      name,
      categoryId: testCatalog.categoryId,
      brandId: null,
      consumptionType: "DRINK",
    });
    expect(productCompositionDtoSchema.parse(await restoreConsumption.json()).macroProfile?.enabled).toBe(false);

    const reactivate = await requestJson(`/product-compositions/${composition.id}/macro-profile`, "PUT", {
      enabled: true,
      profile: {
        referenceBasis: "PER_100_ML",
        caloriesKcal: "42",
        proteinG: null,
        carbohydratesG: "10",
        fatG: null,
        caloriesSource: "MANUAL",
      },
    });
    expect(reactivate.status).toBe(200);
    expect(storedMacroProfileSchema.parse(await reactivate.json()).enabled).toBe(true);

    const deactivate = await requestJson(`/product-compositions/${composition.id}/macro-profile`, "PUT", { enabled: false });
    expect(deactivate.status).toBe(200);
    expect(await deactivate.json()).toMatchObject({ enabled: false, caloriesKcal: "42" });
  });
});
