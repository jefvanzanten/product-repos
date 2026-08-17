import { describe, expect, test } from "bun:test";
import type { RecipeDetail, RecipePage } from "@product-repos/contracts/recipes";
import { app, createTestProduct, requestAsOtherUser, requestAsUser, testCatalog } from "./test-app.ts";

const jsonHeaders = { "Content-Type": "application/json" };

/** Build a complete recipe creation body for one concrete product. */
function createBody(productId: string, name: string, visibility: "PRIVATE" | "PUBLIC" = "PRIVATE") {
  return {
    name,
    visibility,
    servings: "2",
    instructions: "Rustig mengen.",
    ingredients: [{ productId, quantity: "1", inputMode: "FULL_PRODUCT", inputUnitTypeId: null }],
  } as const;
}

/** Create one authenticated recipe and return its strict response projection. */
async function createRecipe(productId: string, name: string, visibility: "PRIVATE" | "PUBLIC" = "PRIVATE"): Promise<RecipeDetail> {
  const response = await requestAsUser("/recipes", { method: "POST", headers: jsonHeaders, body: JSON.stringify(createBody(productId, name, visibility)) });
  expect(response.status).toBe(201);
  return response.json() as Promise<RecipeDetail>;
}

describe("recipe endpoints", () => {
  test("public reads are anonymous and private recipes use a neutral 404", async () => {
    const product = await createTestProduct({ name: "Recept product publiek", amount: "1", unitTypeId: testCatalog.countUnitTypeId });
    const privateRecipe = await createRecipe(product.productId, `Privé recept ${crypto.randomUUID()}`);

    const anonymousPrivate = await app.request(`/recipes/users/${privateRecipe.userId}/${privateRecipe.id}`);
    expect(anonymousPrivate.status).toBe(404);
    expect(await anonymousPrivate.json()).toEqual({ code: "DISH_NOT_FOUND", message: "Recipe not found" });

    const ownerList = await requestAsUser(`/recipes/users/${privateRecipe.userId}`);
    expect(ownerList.status).toBe(200);
    expect((await ownerList.json() as RecipePage).items.some((item) => item.id === privateRecipe.id)).toBe(true);

    const publicRecipe = await createRecipe(product.productId, `Publiek recept ${crypto.randomUUID()}`, "PUBLIC");
    const publicList = await app.request(`/recipes?query=${encodeURIComponent(publicRecipe.name)}`);
    expect(publicList.status).toBe(200);
    expect(publicList.headers.get("cache-control")).toContain("public");
    expect((await publicList.json() as RecipePage).items.map((item) => item.id)).toEqual([publicRecipe.id]);
  });

  test("content versions are immutable while name-only updates retain the version", async () => {
    const product = await createTestProduct({ name: "Recept product versie", amount: "500", unitTypeId: testCatalog.massUnitTypeId });
    const created = await createRecipe(product.productId, `Versierecept ${crypto.randomUUID()}`);
    const renamedResponse = await requestAsUser(`/recipes/${created.id}`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify({ ...createBody(product.productId, `${created.name} gewijzigd`), expectedUpdatedAt: created.updatedAt }),
    });
    expect(renamedResponse.status).toBe(200);
    const renamed = await renamedResponse.json() as RecipeDetail;
    expect(renamed.versionId).toBe(created.versionId);

    const contentResponse = await requestAsUser(`/recipes/${created.id}`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify({ ...createBody(product.productId, renamed.name), servings: "3", expectedUpdatedAt: renamed.updatedAt }),
    });
    expect(contentResponse.status).toBe(200);
    const changed = await contentResponse.json() as RecipeDetail;
    expect(changed.versionId).not.toBe(created.versionId);
    expect(changed.servings).toBe("3");

    const stale = await requestAsUser(`/recipes/${created.id}`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify({ ...createBody(product.productId, changed.name), expectedUpdatedAt: renamed.updatedAt }),
    });
    expect(stale.status).toBe(409);
    expect((await stale.json() as { readonly code: string }).code).toBe("DISH_UPDATE_CONFLICT");
  });

  test("archive and restore preserve visibility and owner authorization", async () => {
    const product = await createTestProduct({ name: "Recept product archief", amount: "1", unitTypeId: testCatalog.countUnitTypeId });
    const recipe = await createRecipe(product.productId, `Archiefrecept ${crypto.randomUUID()}`, "PUBLIC");

    const forbidden = await requestAsOtherUser(`/recipes/${recipe.id}/archive`, { method: "POST" });
    expect(forbidden.status).toBe(404);

    const archived = await requestAsUser(`/recipes/${recipe.id}/archive`, { method: "POST" });
    expect(archived.status).toBe(200);
    expect((await app.request(`/recipes/users/${recipe.userId}/${recipe.id}`)).status).toBe(404);

    const restored = await requestAsUser(`/recipes/${recipe.id}/restore`, { method: "POST" });
    expect(restored.status).toBe(200);
    expect((await restored.json() as RecipeDetail).visibility).toBe("PUBLIC");
    expect((await app.request(`/recipes/users/${recipe.userId}/${recipe.id}`)).status).toBe(200);
  });

  test("writes and product selection require authentication", async () => {
    const product = await createTestProduct({ name: "Recept product auth", amount: "1", unitTypeId: testCatalog.countUnitTypeId });
    const createResponse = await app.request("/recipes", { method: "POST", headers: jsonHeaders, body: JSON.stringify(createBody(product.productId, "Geen sessie")) });
    expect(createResponse.status).toBe(401);
    expect((await app.request("/recipes/products/search?query=auth")).status).toBe(401);

    const search = await requestAsUser("/recipes/products/search?query=Recept%20product%20auth");
    expect(search.status).toBe(200);
    expect((await search.json() as ReadonlyArray<{ readonly productId: string }>).some((item) => item.productId === product.productId)).toBe(true);
  });
});
