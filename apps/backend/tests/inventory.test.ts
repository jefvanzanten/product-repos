import { describe, expect, it } from "bun:test";
import { productCreatedDtoSchema } from "@product-repos/contracts";
import { inventoryPageSchema } from "@product-repos/contracts/inventory";
import { inventoryItem, location } from "../src/db/schema.ts";
import { app, requestAsAdmin, requestAsUser, testCatalog, testDatabase } from "./test-app";

/**
 * Create one active catalog package through the real admin route.
 *
 * @param productName - Unique product name used by the integration scenario.
 * @returns The created product and package identifiers.
 */
async function createInventoryPackage(productName: string): Promise<{ readonly productId: string; readonly packageId: number }> {
  const response = await requestAsAdmin("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: productName,
      categoryId: testCatalog.categoryId,
      brandId: testCatalog.brandId,
      consumptionType: "DRINK",
      macroProfile: null,
      package: {
        packageTypeId: testCatalog.packageTypeId,
        amount: "2",
        unitTypeId: testCatalog.unitTypeId,
        portion: null,
      },
    }),
  });
  expect(response.status).toBe(201);
  const created = productCreatedDtoSchema.parse(await response.json());
  return { productId: created.id, packageId: created.package.id };
}

/**
 * Insert one location and return its generated identifier.
 *
 * @param name - Location name stored by the test fixture.
 * @param parentId - Optional parent location identifier.
 * @returns The generated location identifier.
 */
function createLocation(name: string, parentId: number | null = null): number {
  const inserted = testDatabase
    .insert(location)
    .values({ name, parentId })
    .returning({ id: location.id })
    .get();
  if (inserted === undefined) throw new Error("Inventory test location was not created");
  return inserted.id;
}

describe("Inventory authenticated route integration", () => {
  it("requires a session and validates search length", async () => {
    const publicResponse = await app.request("/inventory-items");
    expect(publicResponse.status).toBe(401);
    expect(await publicResponse.json()).toEqual({
      code: "UNAUTHENTICATED",
      message: "Authentication is required",
    });

    const invalidSearch = await requestAsUser("/inventory-items?query=x");
    expect(invalidSearch.status).toBe(400);
    expect(await invalidSearch.json()).toEqual({
      code: "VALIDATION_ERROR",
      message: "Search query needs at least 2 characters",
    });
  });

  it("groups real stock and projects package, location, expiry, and image fields", async () => {
    const productName = `Voorraadproduct ${crypto.randomUUID()}`;
    const created = await createInventoryPackage(productName);
    const rootLocationId = createLocation(`Keuken ${crypto.randomUUID()}`);
    const childLocationId = createLocation("Koelkast", rootLocationId);
    const secondLocationId = createLocation(`Garage ${crypto.randomUUID()}`);

    testDatabase.insert(inventoryItem).values([
      {
        id: crypto.randomUUID(),
        productPackageId: created.packageId,
        locationId: childLocationId,
        expiryDate: "2026-08-05",
        quantity: 2,
        version: 1,
      },
      {
        id: crypto.randomUUID(),
        productPackageId: created.packageId,
        locationId: secondLocationId,
        expiryDate: null,
        quantity: 3,
        version: 2,
      },
    ]).run();

    const response = await requestAsUser(`/inventory-items?query=${encodeURIComponent(productName)}&limit=10`);
    expect(response.status).toBe(200);
    const page = inventoryPageSchema.parse(await response.json());
    expect(page.groups).toHaveLength(1);
    const group = page.groups[0]!;
    expect(group).toMatchObject({
      productId: created.productId,
      productPackageId: created.packageId,
      displayName: productName,
      brandName: "Testmerk",
      packageSummary: "fles 2 liter",
      categoryPath: "Frisdrank",
      imageUrl: null,
      totalQuantity: 5,
      earliestExpiryDate: "2026-08-05",
      archivedAt: null,
    });
    expect(group.items.map((item) => item.quantity)).toEqual([2, 3]);
    expect(group.items[0]!.locationPath).toContain("Koelkast");
    expect(group.items[1]!.expiryDate).toBeNull();
  });
});
