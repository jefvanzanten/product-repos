import type {
  BrandDto,
  CreateProductRequest,
  ProductCreatedDto,
  ProductDetailDto,
  UpdateProductRequest,
} from "@product-repos/contracts";
import { describe, expect, it } from "vitest";
import { submitCreateProductForm, submitUpdateProductForm } from "./product-mutations.server";

const productId = "11111111-1111-4111-8111-111111111111";
const brandId = "22222222-2222-4222-8222-222222222222";
const category = { id: 34, name: "Drinken", parentId: null } as const;
const productPackage = {
  id: 7,
  packageType: { id: 3, name: "fles" },
  unitContent: {
    id: 5,
    amount: "500",
    unitType: { id: 4, name: "milliliter", symbol: "ml", dimension: "VOLUME" as const, conversionToBase: "1" },
  },
  unitsPerPackage: 1,
  summary: "fles 500 milliliter",
} as const;

/** Fail when a test unexpectedly attempts to create a brand. */
async function rejectUnexpectedBrandCreation(_input: { readonly name: string }): Promise<BrandDto> {
  throw new Error("Brand creation was not expected");
}

/** Build valid shared product form data from mock browser input. */
function createProductFormData(): FormData {
  const form = new FormData();
  form.set("productName", "Mock limonade");
  form.set("categoryId", String(category.id));
  form.set("brandId", brandId);
  form.set("consumptionType", "DRINK");
  form.set("amount", "500");
  form.set("packageTypeId", "3");
  form.set("unitTypeId", "4");
  form.set("unitsPerPackage", "1");
  return form;
}

describe("product create and edit mutations", () => {
  it("creates a product from mock form data", async () => {
    const submitted: CreateProductRequest[] = [];

    /** Record and return a created mock product. */
    async function createProduct(input: CreateProductRequest): Promise<ProductCreatedDto> {
      submitted.push(input);
      return {
        id: productId,
        name: input.name,
        consumptionType: input.consumptionType,
        category,
        brand: { id: brandId, name: "Mockmerk" },
        macroProfile: input.macroProfile ?? null,
        package: productPackage,
      };
    }

    const result = await submitCreateProductForm(createProductFormData(), {
      createBrand: rejectUnexpectedBrandCreation,
      createProduct,
    });

    expect(result).toMatchObject({ ok: true, product: { id: productId, consumptionType: "DRINK" } });
    expect(submitted).toEqual([{
      name: "Mock limonade",
      categoryId: 34,
      brandId,
      consumptionType: "DRINK",
      macroProfile: null,
      package: { amount: "500", packageTypeId: 3, unitTypeId: 4, unitsPerPackage: 1 },
    }]);
  });

  it("edits a product and adds nutritional values from mock form data", async () => {
    const form = createProductFormData();
    form.set("productName", "Mock limonade zero");
    form.set("macroEnabled", "on");
    form.set("referenceBasis", "PER_100_ML");
    form.set("caloriesKcal", "2");
    form.set("proteinG", "0");
    form.set("carbohydratesG", "0,5");
    form.set("fatG", "0");
    form.set("caloriesChanged", "true");
    const submitted: Array<{ readonly productId: string; readonly input: UpdateProductRequest }> = [];

    /** Record and return an updated mock product detail. */
    async function updateProduct(id: string, input: UpdateProductRequest): Promise<ProductDetailDto> {
      submitted.push({ productId: id, input });
      return {
        id,
        name: input.name,
        displayName: `Mockmerk ${input.name}`,
        consumptionType: input.consumptionType,
        category,
        categoryPath: [category],
        brand: { id: brandId, name: "Mockmerk" },
        macroProfile: input.macroProfile,
        packages: [productPackage],
      };
    }

    const result = await submitUpdateProductForm(productId, form, {
      createBrand: rejectUnexpectedBrandCreation,
      updateProduct,
    });

    expect(result).toMatchObject({
      ok: true,
      product: {
        id: productId,
        name: "Mock limonade zero",
        macroProfile: { referenceBasis: "PER_100_ML", caloriesKcal: "2", carbohydratesG: "0.5", caloriesSource: "MANUAL" },
        packages: [{ id: 7 }],
      },
    });
    expect(submitted).toEqual([{
      productId,
      input: {
        name: "Mock limonade zero",
        categoryId: 34,
        brandId,
        consumptionType: "DRINK",
        macroProfile: {
          referenceBasis: "PER_100_ML",
          caloriesKcal: "2",
          proteinG: "0",
          carbohydratesG: "0.5",
          fatG: "0",
          caloriesSource: "MANUAL",
        },
      },
    }]);
  });
});
