import { describe, expect, it } from "bun:test";
import { productCreatedDtoSchema, productDetailDtoSchema } from "@product-repos/contracts";
import { requestAsAdmin, testCatalog } from "./test-app";

const volumeMacroProfile = {
  referenceBasis: "PER_100_ML",
  caloriesKcal: "218",
  proteinG: "7.4",
  carbohydratesG: "18",
  fatG: "13.2",
  caloriesSource: "MANUAL",
} as const;

/** Create a volume-based product through the public HTTP endpoint. */
async function createEditableProduct(): Promise<{ readonly id: string; readonly name: string }> {
  const name = `Edit ${crypto.randomUUID()}`;
  const response = await requestAsAdmin("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      categoryId: testCatalog.categoryId,
      brandId: testCatalog.brandId,
      consumptionType: "DRINK",
      macroProfile: null,
      package: { packageTypeId: testCatalog.packageTypeId, amount: "1.5", unitTypeId: testCatalog.unitTypeId, portion: null },
    }),
  });
  expect(response.status).toBe(201);
  const created = productCreatedDtoSchema.parse(await response.json());
  return { id: created.id, name };
}

/** Send a complete product PATCH request through the public HTTP endpoint. */
function patchProduct(productId: string, body: Record<string, unknown>): Promise<Response> {
  return requestAsAdmin(`/products/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("product editing", () => {
  it("persists consumption and macro changes, removes only the profile, and rolls back incompatible edits", async () => {
    const created = await createEditableProduct();
    const updatedName = `${created.name} bijgewerkt`;
    const updateRequest = {
      name: updatedName,
      categoryId: testCatalog.categoryId,
      brandId: testCatalog.brandId,
      consumptionType: "SUPPLEMENT",
      macroProfile: volumeMacroProfile,
    } as const;

    const patchResponse = await patchProduct(created.id, updateRequest);
    expect(patchResponse.status).toBe(200);
    expect(await patchResponse.json()).toMatchObject({
      id: created.id,
      name: updatedName,
      consumptionType: "SUPPLEMENT",
      macroProfile: volumeMacroProfile,
    });

    const detailResponse = await requestAsAdmin(`/products/${created.id}`);
    expect(detailResponse.status).toBe(200);
    const detail = productDetailDtoSchema.parse(await detailResponse.json());
    expect(detail).toMatchObject({ name: updatedName, consumptionType: "SUPPLEMENT", macroProfile: volumeMacroProfile });
    expect(detail.packages).toHaveLength(1);

    const incompatibleResponse = await patchProduct(created.id, {
      ...updateRequest,
      name: `${updatedName} ongeldig`,
      consumptionType: "FOOD",
      macroProfile: { ...volumeMacroProfile, referenceBasis: "PER_100_G" },
    });
    expect(incompatibleResponse.status).toBe(400);
    expect(await incompatibleResponse.json()).toMatchObject({ code: "UNIT_DIMENSION_INCOMPATIBLE" });

    const unchangedResponse = await requestAsAdmin(`/products/${created.id}`);
    const unchanged = await unchangedResponse.json();
    expect(unchanged).toMatchObject({ name: updatedName, consumptionType: "SUPPLEMENT", macroProfile: volumeMacroProfile });

    const removeResponse = await patchProduct(created.id, { ...updateRequest, macroProfile: null });
    expect(removeResponse.status).toBe(200);
    const removed = productDetailDtoSchema.parse(await removeResponse.json());
    expect(removed.consumptionType).toBe("SUPPLEMENT");
    expect(removed.macroProfile).toBeNull();
    expect(removed.packages).toHaveLength(1);
  });
});
