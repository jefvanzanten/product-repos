import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { consumptionLogSchema, unifiedSearchResultSchema } from "@product-repos/contracts/calorie-tracker";
import { dish, dishIngredient, dishVersion, user } from "../src/db/schema.ts";
import { createTestProduct, requestAsOtherUser, requestAsUser, testCatalog, testDatabase } from "./test-app.ts";

/** Send an authenticated JSON request as the primary Calorie Tracker user. */
function requestJson(path: string, method: "POST" | "PUT", body: unknown): Promise<Response> {
  return requestAsUser(path, {
    method,
    headers: { "Content-Type": "application/json", "X-Browser-Timezone": "UTC" },
    body: JSON.stringify(body),
  });
}

/** Create one concrete ingredient product through the target catalog API. */
async function createConcreteProduct(): Promise<string> {
  const created = await createTestProduct({
    name: "Dish ingredient",
    macroProfile: { referenceBasis: "PER_100_G", caloriesKcal: "100", proteinG: null, carbohydratesG: null, fatG: null, caloriesSource: "MANUAL" },
    amount: "100",
    unitTypeId: testCatalog.massUnitTypeId,
  });
  return created.productId;
}

/** Resolve a test account identifier without exposing it through an application response. */
function userId(email: string): string {
  const account = testDatabase.select({ id: user.id }).from(user).where(eq(user.email, email)).get();
  if (account === undefined) throw new Error("Test user is missing");
  return account.id;
}

/** Persist one recipe stem and two immutable versions for search and pinning tests. */
async function createRecipe(visibility: "PRIVATE" | "PUBLIC", ownerEmail = "other-user@example.test") {
  const productId = await createConcreteProduct();
  const dishId = crypto.randomUUID();
  const firstVersionId = crypto.randomUUID();
  const now = new Date().toISOString();
  testDatabase.insert(dish).values({ id: dishId, userId: userId(ownerEmail), name: `Publiek gerecht ${crypto.randomUUID()}`, imageUrl: null, visibility, archivedAt: null, createdAt: now, updatedAt: now, deletedAt: null }).run();
  testDatabase.insert(dishVersion).values({ id: firstVersionId, dishId, servings: "2", instructions: null, createdAt: now }).run();
  testDatabase.insert(dishIngredient).values({ id: crypto.randomUUID(), dishVersionId: firstVersionId, productId, quantity: "100", inputMode: "CONTENT_UNIT", inputUnitTypeId: testCatalog.massUnitTypeId }).run();
  return { dishId, firstVersionId, productId };
}

describe("Calorie Tracker accessible dishes", () => {
  it("does not expose recipe-management endpoints under the Calorie Tracker prefix", async () => {
    const response = await requestJson("/calorie-tracker/dishes", "POST", {});
    expect(response.status).toBe(404);
  });

  it("finds and logs another maker's public dish while filtering private dishes", async () => {
    const publicRecipe = await createRecipe("PUBLIC");
    const privateRecipe = await createRecipe("PRIVATE");
    const search = await requestAsUser("/calorie-tracker/search?query=Publiek%20gerecht");
    expect(search.status).toBe(200);
    const results = unifiedSearchResultSchema.array().parse(await search.json());
    const publicResult = results.find((result) => result.kind === "DISH" && result.id === publicRecipe.dishId);
    expect(publicResult).toMatchObject({ kind: "DISH", isOwnedByViewer: false, makerDisplayName: "Other Test User" });
    expect(results.some((result) => result.kind === "DISH" && result.id === privateRecipe.dishId)).toBe(false);

    const response = await requestJson("/calorie-tracker/logs", "POST", { id: crypto.randomUUID(), type: "DISH", dishId: publicRecipe.dishId, quantity: "1", consumedAt: new Date(Date.now() - 60_000).toISOString() });
    expect(response.status).toBe(201);
    expect(consumptionLogSchema.parse(await response.json())).toMatchObject({ type: "DISH", dish: { versionId: publicRecipe.firstVersionId, recipeAccessible: true } });
  });

  it("pins the newest version at create time and keeps it after a later recipe edit", async () => {
    const recipe = await createRecipe("PUBLIC", "user@example.test");
    const pinnedVersionId = crypto.randomUUID();
    const now = new Date(Date.now() + 1).toISOString();
    testDatabase.insert(dishVersion).values({ id: pinnedVersionId, dishId: recipe.dishId, servings: "4", instructions: null, createdAt: now }).run();
    testDatabase.insert(dishIngredient).values({ id: crypto.randomUUID(), dishVersionId: pinnedVersionId, productId: recipe.productId, quantity: "200", inputMode: "CONTENT_UNIT", inputUnitTypeId: testCatalog.massUnitTypeId }).run();
    const created = await requestJson("/calorie-tracker/logs", "POST", { id: crypto.randomUUID(), type: "DISH", dishId: recipe.dishId, quantity: "1", consumedAt: new Date(Date.now() - 60_000).toISOString() });
    const log = consumptionLogSchema.parse(await created.json());
    expect(log.type === "DISH" && log.dish.versionId).toBe(pinnedVersionId);

    const laterVersionId = crypto.randomUUID();
    testDatabase.insert(dishVersion).values({ id: laterVersionId, dishId: recipe.dishId, servings: "8", instructions: null, createdAt: new Date(Date.now() + 2).toISOString() }).run();
    testDatabase.insert(dishIngredient).values({ id: crypto.randomUUID(), dishVersionId: laterVersionId, productId: recipe.productId, quantity: "400", inputMode: "CONTENT_UNIT", inputUnitTypeId: testCatalog.massUnitTypeId }).run();
    const detail = await requestAsUser(`/calorie-tracker/logs/${log.id}`);
    const persisted = consumptionLogSchema.parse(await detail.json());
    expect(persisted.type === "DISH" && persisted.dish.versionId).toBe(pinnedVersionId);
  });

  it("returns neutral not-found when another user tries to log a private dish", async () => {
    const recipe = await createRecipe("PRIVATE");
    const response = await requestJson("/calorie-tracker/logs", "POST", { id: crypto.randomUUID(), type: "DISH", dishId: recipe.dishId, quantity: "1", consumedAt: new Date(Date.now() - 60_000).toISOString() });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "DISH_NOT_FOUND" });
    const ownerResponse = await requestAsOtherUser("/calorie-tracker/search?query=Publiek%20gerecht");
    expect(ownerResponse.status).toBe(200);
  });
});
