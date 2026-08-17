import { describe, expect, it } from "bun:test";
import {
  calorieTrackerErrorResponseSchema,
  consumptionLogSchema,
  dailyStatisticsSchema,
  deleteLogResultSchema,
  logListSchema,
  nutritionGoalSchema,
  productSearchResultSchema,
} from "@product-repos/contracts/calorie-tracker";
import { app, createTestProduct, executeTestSql, requestAsOtherUser, requestAsUser, testCatalog } from "./test-app.ts";

/** Send JSON through the authenticated regular-user HTTP boundary. */
function requestJson(path: string, method: "POST" | "PATCH" | "PUT", body: unknown): Promise<Response> {
  return requestAsUser(path, {
    method,
    headers: { "Content-Type": "application/json", "X-Browser-Timezone": "UTC" },
    body: JSON.stringify(body),
  });
}

/** Create a unique active concrete product with a complete macro profile. */
async function createLoggablePackage(consumptionType: "FOOD" | "DRINK" | "SUPPLEMENT" = "FOOD"): Promise<string> {
  const created = await createTestProduct({
    name: "Calorie product",
    consumptionType,
    macroProfile: { referenceBasis: "PER_100_G", caloriesKcal: "200", proteinG: "10", carbohydratesG: "20", fatG: "5", caloriesSource: "MANUAL" },
    amount: "100",
    unitTypeId: testCatalog.massUnitTypeId,
  });
  return created.productId;
}

/** Build a valid create request for a recently consumed UTC instant. */
function createLogBody(productId: string, id = crypto.randomUUID()) {
  return {
    id,
    type: "PRODUCT",
    productId,
    quantity: "1.50",
    inputMode: "FULL_PRODUCT",
    inputUnitTypeId: null,
    consumedAt: new Date(Date.now() - 60_000).toISOString(),
  } as const;
}

describe("Calorie Tracker authenticated route integration", () => {
  it("returns a strict generic response for an unexpected backend defect", async () => {
    const response = await requestAsUser("/__test/defect");
    expect(response.status).toBe(500);
    const error = calorieTrackerErrorResponseSchema.parse(await response.json());
    expect(error).toMatchObject({ code: "INTERNAL_ERROR", message: "Internal server error" });
    expect(JSON.stringify(error)).not.toContain("sensitive persistence detail");
  });

  it("requires a session and exposes package search and compatible input units", async () => {
    const unauthenticated = await app.request("/calorie-tracker/products/search");
    expect(unauthenticated.status).toBe(401);

    const packageId = await createLoggablePackage("FOOD");
    const search = await requestAsUser("/calorie-tracker/products/search?query=Calorie&limit=10");
    expect(search.status).toBe(200);
    const packages = productSearchResultSchema.array().parse(await search.json());
    expect(packages.some((item) => item.productId === packageId)).toBe(true);

    const units = await requestAsUser(`/calorie-tracker/products/${packageId}/input-units`);
    expect(units.status).toBe(200);
    expect(await units.json()).toEqual(expect.arrayContaining([
      expect.objectContaining({ inputMode: "FULL_PRODUCT", unitType: null }),
      expect.objectContaining({ inputMode: "CONTENT_UNIT", unitType: expect.objectContaining({ symbol: "g" }) }),
    ]));

    const shortSearch = await requestAsUser("/calorie-tracker/products/search?query=x");
    expect(shortSearch.status).toBe(400);
    const unknownCreateField = await requestJson("/calorie-tracker/logs", "POST", { ...createLogBody(packageId), unknown: true });
    expect(unknownCreateField.status).toBe(400);
  });

  it("enforces create idempotency, ownership, concurrency, soft-delete, and restore", async () => {
    const packageId = await createLoggablePackage();
    const createBody = createLogBody(packageId);
    const createdResponse = await requestJson("/calorie-tracker/logs", "POST", createBody);
    expect(createdResponse.status).toBe(201);
    const created = consumptionLogSchema.parse(await createdResponse.json());
    expect(created.quantity).toBe("1.5");

    const retry = await requestJson("/calorie-tracker/logs", "POST", createBody);
    expect(retry.status).toBe(200);
    expect(consumptionLogSchema.parse(await retry.json()).id).toBe(created.id);

    executeTestSql("UPDATE product SET archived_at = ? WHERE id = ?", new Date().toISOString(), packageId);
    const retryAfterCatalogArchive = await requestJson("/calorie-tracker/logs", "POST", createBody);
    expect(retryAfterCatalogArchive.status).toBe(200);
    expect(consumptionLogSchema.parse(await retryAfterCatalogArchive.json())).toMatchObject({
      id: created.id,
      product: { archived: true },
    });

    const conflictingCreate = await requestJson("/calorie-tracker/logs", "POST", { ...createBody, quantity: "2" });
    expect(conflictingCreate.status).toBe(409);
    expect(await conflictingCreate.json()).toMatchObject({ code: "LOG_CREATE_CONFLICT" });

    const privateLookup = await requestAsOtherUser(`/calorie-tracker/logs/${created.id}`);
    expect(privateLookup.status).toBe(404);
    expect(await privateLookup.json()).toMatchObject({ code: "LOG_NOT_FOUND" });

    const updateBody = {
      expectedUpdatedAt: created.updatedAt,
      type: "PRODUCT",
      productId: packageId,
      quantity: "2",
      inputMode: "CONTENT_UNIT",
      inputUnitTypeId: testCatalog.massUnitTypeId,
      consumedAt: created.consumedAt,
    } as const;
    const archivedInputChange = await requestJson(`/calorie-tracker/logs/${created.id}`, "PATCH", updateBody);
    expect(archivedInputChange.status).toBe(409);
    expect(await archivedInputChange.json()).toMatchObject({ code: "PRODUCT_ARCHIVED" });

    executeTestSql("UPDATE product SET archived_at = NULL WHERE id = ?", packageId);
    const update = await requestJson(`/calorie-tracker/logs/${created.id}`, "PUT", updateBody);
    expect(update.status).toBe(200);
    const updated = consumptionLogSchema.parse(await update.json());
    expect(updated.quantity).toBe("2");

    const staleUpdate = await requestJson(`/calorie-tracker/logs/${created.id}`, "PUT", updateBody);
    expect(staleUpdate.status).toBe(409);
    expect(await staleUpdate.json()).toMatchObject({ code: "LOG_UPDATE_CONFLICT" });

    const deletedResponse = await requestAsUser(`/calorie-tracker/logs/${created.id}`, { method: "DELETE" });
    expect(deletedResponse.status).toBe(200);
    deleteLogResultSchema.parse(await deletedResponse.json());
    expect((await requestAsUser(`/calorie-tracker/logs/${created.id}`)).status).toBe(404);

    const restoredResponse = await requestAsUser(`/calorie-tracker/logs/${created.id}/restore`, { method: "POST" });
    expect(restoredResponse.status).toBe(200);
    consumptionLogSchema.parse(await restoredResponse.json());

    await requestAsUser(`/calorie-tracker/logs/${created.id}`, { method: "DELETE" });
    executeTestSql("UPDATE consumption_log SET deleted_at = ? WHERE id = ?", new Date(Date.now() - 6_000).toISOString(), created.id);
    const expiredRestore = await requestAsUser(`/calorie-tracker/logs/${created.id}/restore`, { method: "POST" });
    expect(expiredRestore.status).toBe(409);
    expect(await expiredRestore.json()).toMatchObject({ code: "LOG_RESTORE_WINDOW_EXPIRED" });
  });

  it("persists goals and calculates exact date-scoped totals through current catalog joins", async () => {
    const packageId = await createLoggablePackage("FOOD");
    const createBody = { ...createLogBody(packageId), consumedAt: "2026-07-07T12:00:00.000Z" };
    const createdResponse = await requestJson("/calorie-tracker/logs", "POST", createBody);
    const created = consumptionLogSchema.parse(await createdResponse.json());
    const date = created.localDate;

    const goalsResponse = await requestJson("/calorie-tracker/goals", "PUT", {
      caloriesKcal: 2200,
      proteinG: "120.0",
      carbohydratesG: null,
      fatG: "70",
    });
    expect(goalsResponse.status).toBe(200);
    const goals = nutritionGoalSchema.parse(await goalsResponse.json());
    expect(goals).toMatchObject({ caloriesKcal: 2200, proteinG: "120", carbohydratesG: null, fatG: "70" });

    const listResponse = await requestAsUser(`/calorie-tracker/logs?date=${date}&type=food`, {
      headers: { "X-Browser-Timezone": "UTC" },
    });
    expect(listResponse.status).toBe(200);
    const list = logListSchema.parse(await listResponse.json());
    expect(list.items.some((item) => item.id === created.id)).toBe(true);

    const statisticsResponse = await requestAsUser(`/calorie-tracker/statistics?date=${date}`, {
      headers: { "X-Browser-Timezone": "UTC" },
    });
    expect(statisticsResponse.status).toBe(200);
    const statistics = dailyStatisticsSchema.parse(await statisticsResponse.json());
    expect(statistics.totals).toEqual({ caloriesKcal: "300", proteinG: "15", carbohydratesG: "30", fatG: "7.5" });
    expect(statistics.goals).toMatchObject({ caloriesKcal: 2200, proteinG: "120" });

    const recentResponse = await requestAsUser("/calorie-tracker/products/search?limit=5");
    const recent = productSearchResultSchema.array().parse(await recentResponse.json());
    expect(recent[0]?.productId).toBe(packageId);
  });
});
