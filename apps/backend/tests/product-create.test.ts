import { describe, expect, it } from "bun:test";
import { catalogSearchResponseSchema, productCreatedDtoSchema, productDetailDtoSchema } from "@product-repos/contracts";
import { requestAsAdmin, testCatalog } from "./test-app";

/** Build a unique product name for the shared integration database. */
function uniqueProductName(prefix: string): string {
  return `${prefix} ${crypto.randomUUID()}`;
}

/** Send a product creation request through the authenticated HTTP boundary. */
function createProduct(body: Record<string, unknown>): Promise<Response> {
  return requestAsAdmin("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const manualMacroProfile = {
  referenceBasis: "PER_100_G",
  caloriesKcal: "218",
  proteinG: "7.4",
  carbohydratesG: "18",
  fatG: "13.2",
  caloriesSource: "MANUAL",
} as const;

describe("product creation", () => {
  it("stores consumption type, package, and a manual macro profile atomically", async () => {
    const response = await createProduct({
      name: uniqueProductName("Zero Sugar"),
      categoryId: testCatalog.categoryId,
      brandId: testCatalog.brandId,
      consumptionType: "FOOD",
      macroProfile: manualMacroProfile,
      package: {
        packageTypeId: testCatalog.packageTypeId,
        amount: "100",
        unitTypeId: testCatalog.massUnitTypeId,
        portion: null,
      },
    });

    expect(response.status).toBe(201);
    const created = productCreatedDtoSchema.parse(await response.json());
    expect(created.consumptionType).toBe("FOOD");
    expect(created.macroProfile).toEqual(manualMacroProfile);
    expect(created.package.unitContent.amount).toBe("100");
    expect(created.package.unitContent.unitType).toMatchObject({ id: testCatalog.massUnitTypeId, symbol: "g", dimension: "MASS", conversionToBase: "1" });

    const detailResponse = await requestAsAdmin(`/products/${created.id}`);
    expect(detailResponse.status).toBe(200);
    const detail = productDetailDtoSchema.parse(await detailResponse.json());
    expect(detail.consumptionType).toBe("FOOD");
    expect(detail.macroProfile).toEqual(manualMacroProfile);
    expect(detail.packages).toHaveLength(1);
  });

  it("stores exact total content and separate optional rounded portion data", async () => {
    const portionedPackageResponse = await createProduct({
      name: uniqueProductName("Wafels"),
      categoryId: testCatalog.categoryId,
      brandId: null,
      consumptionType: "FOOD",
      macroProfile: manualMacroProfile,
      package: {
        packageTypeId: testCatalog.packageTypeId,
        amount: "88",
        unitTypeId: testCatalog.massUnitTypeId,
        portion: { name: "wafel", amount: "4.9", unitTypeId: testCatalog.massUnitTypeId, portionsPerPackage: 18 },
      },
    });
    expect(portionedPackageResponse.status).toBe(201);
    const productPackage = productCreatedDtoSchema.parse(await portionedPackageResponse.json()).package;
    expect(productPackage.unitContent.amount).toBe("88");
    expect(productPackage.portion).toMatchObject({ name: "wafel", unitContent: { amount: "4.9" }, portionsPerPackage: 18 });

    const optionalCountResponse = await createProduct({
      name: uniqueProductName("Portie zonder aantal"),
      categoryId: testCatalog.categoryId,
      brandId: null,
      consumptionType: "FOOD",
      macroProfile: manualMacroProfile,
      package: {
        packageTypeId: testCatalog.packageTypeId,
        amount: "88",
        unitTypeId: testCatalog.massUnitTypeId,
        portion: { name: "wafel", amount: "4.9", unitTypeId: testCatalog.massUnitTypeId, portionsPerPackage: null },
      },
    });
    expect(optionalCountResponse.status).toBe(201);
    expect(productCreatedDtoSchema.parse(await optionalCountResponse.json()).package.portion?.portionsPerPackage).toBeNull();

    const incompatiblePortionResponse = await createProduct({
      name: uniqueProductName("Ongeldige portiedimensie"),
      categoryId: testCatalog.categoryId,
      brandId: null,
      consumptionType: "FOOD",
      macroProfile: manualMacroProfile,
      package: {
        packageTypeId: testCatalog.packageTypeId,
        amount: "88",
        unitTypeId: testCatalog.massUnitTypeId,
        portion: { name: "wafel", amount: "4.9", unitTypeId: testCatalog.unitTypeId, portionsPerPackage: 18 },
      },
    });
    expect(incompatiblePortionResponse.status).toBe(400);
    expect(await incompatiblePortionResponse.json()).toMatchObject({ code: "UNIT_DIMENSION_INCOMPATIBLE" });
  });

  it("creates a valid product without a macro profile", async () => {
    const response = await createProduct({
      name: uniqueProductName("Water"),
      categoryId: testCatalog.categoryId,
      brandId: null,
      consumptionType: "DRINK",
      macroProfile: null,
      package: { packageTypeId: testCatalog.packageTypeId, amount: "1.5", unitTypeId: testCatalog.unitTypeId, portion: null },
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ consumptionType: "DRINK", macroProfile: null });
  });

  it("automatically calculates calories from a complete macro set", async () => {
    const response = await createProduct({
      name: uniqueProductName("Automatisch"),
      categoryId: testCatalog.categoryId,
      brandId: null,
      consumptionType: "FOOD",
      macroProfile: {
        referenceBasis: "PER_100_G",
        caloriesKcal: null,
        proteinG: "7.4",
        carbohydratesG: "18",
        fatG: "13.2",
        caloriesSource: null,
      },
      package: { packageTypeId: testCatalog.packageTypeId, amount: "100", unitTypeId: testCatalog.massUnitTypeId, portion: null },
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ macroProfile: { caloriesKcal: "220.4", caloriesSource: "AUTOMATIC" } });
  });

  it("rejects an incompatible reference basis without creating the product", async () => {
    const name = uniqueProductName("Incompatibel");
    const response = await createProduct({
      name,
      categoryId: testCatalog.categoryId,
      brandId: null,
      consumptionType: "DRINK",
      macroProfile: { ...manualMacroProfile, referenceBasis: "PER_100_G" },
      package: { packageTypeId: testCatalog.packageTypeId, amount: "1", unitTypeId: testCatalog.unitTypeId, portion: null },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "UNIT_DIMENSION_INCOMPATIBLE" });

    const search = await requestAsAdmin(`/products/search?query=${encodeURIComponent(name)}`);
    const searchBody = catalogSearchResponseSchema.parse(await search.json());
    expect(searchBody.products.some((product) => product.displayName.includes(name))).toBe(false);
  });

  it("rejects an enabled but empty macro profile", async () => {
    const response = await createProduct({
      name: uniqueProductName("Leeg profiel"),
      categoryId: testCatalog.categoryId,
      brandId: null,
      consumptionType: "FOOD",
      macroProfile: {
        referenceBasis: "PER_100_G",
        caloriesKcal: null,
        proteinG: null,
        carbohydratesG: null,
        fatG: null,
        caloriesSource: null,
      },
      package: { packageTypeId: testCatalog.packageTypeId, amount: "100", unitTypeId: testCatalog.massUnitTypeId, portion: null },
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "PRODUCT_MACRO_PROFILE_INVALID" });
  });
});
