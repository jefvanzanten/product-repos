import { describe, expect, it } from "bun:test";
import { productCreatedDtoSchema } from "@product-repos/contracts";
import {
  consumptionLogSchema,
  dailyStatisticsSchema,
  deleteDishResultSchema,
  dishSchema,
  logListSchema,
  unifiedSearchResultSchema,
} from "@product-repos/contracts/calorie-tracker";
import { app, requestAsAdmin, requestAsOtherUser, requestAsUser, testCatalog } from "./test-app.ts";

/** Send JSON through the authenticated regular-user HTTP boundary. */
function requestJson(path: string, method: "POST" | "PUT" | "DELETE", body?: unknown): Promise<Response> {
  return requestAsUser(path, {
    method,
    headers: { "Content-Type": "application/json", "X-Browser-Timezone": "UTC" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Create a unique active package with one manual macro profile through the admin route. */
async function createMacroPackage(name: string): Promise<number> {
  const response = await requestAsAdmin("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `${name} ${crypto.randomUUID()}`,
      categoryId: testCatalog.categoryId,
      brandId: testCatalog.brandId,
      consumptionType: "FOOD",
      macroProfile: {
        referenceBasis: "PER_100_G",
        caloriesKcal: "200",
        proteinG: "10",
        carbohydratesG: "20",
        fatG: "5",
        caloriesSource: "MANUAL",
      },
      package: {
        packageTypeId: testCatalog.packageTypeId,
        amount: "100",
        unitTypeId: testCatalog.massUnitTypeId,
        portion: null,
      },
    }),
  });
  expect(response.status).toBe(201);
  return productCreatedDtoSchema.parse(await response.json()).package.id;
}

/** Create a unique active package without a macro profile through the admin route. */
async function createSilentPackage(name: string): Promise<number> {
  const response = await requestAsAdmin("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `${name} ${crypto.randomUUID()}`,
      categoryId: testCatalog.categoryId,
      brandId: testCatalog.brandId,
      consumptionType: "FOOD",
      macroProfile: null,
      package: {
        packageTypeId: testCatalog.packageTypeId,
        amount: "100",
        unitTypeId: testCatalog.massUnitTypeId,
        portion: null,
      },
    }),
  });
  expect(response.status).toBe(201);
  return productCreatedDtoSchema.parse(await response.json()).package.id;
}

/** Build a valid dish creation body with unique names. */
function createDishBody(packageId: number, name = `Gerecht ${crypto.randomUUID()}`) {
  return {
    name,
    imageUrl: null,
    servings: "4",
    ingredients: [
      { packageId, quantity: "100", inputMode: "CONTENT_UNIT" as const, inputUnitTypeId: testCatalog.massUnitTypeId },
    ],
  };
}

/** Build a valid dish consumption-log body for an instant three days ago, isolating statistics by date. */
function createDishLogBody(dishId: string, id = crypto.randomUUID()) {
  return {
    id,
    type: "DISH" as const,
    dishId,
    quantity: "1",
    consumedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

describe("Calorie Tracker dishes", () => {
  it("creates a dish with one immutable version and derives macros per serving", async () => {
    const packageId = await createMacroPackage("Gehakt");
    const response = await requestJson("/calorie-tracker/dishes", "POST", createDishBody(packageId, "Spaghetti bolognese"));
    expect(response.status).toBe(201);
    const dish = dishSchema.parse(await response.json());
    expect(dish.name).toBe("Spaghetti bolognese");
    expect(dish.servings).toBe("4");
    expect(dish.ingredients).toHaveLength(1);
    expect(dish.macrosPerServing?.caloriesKcal).toBe("50");

    const detail = await requestAsUser(`/calorie-tracker/dishes/${dish.id}`);
    expect(detail.status).toBe(200);
    expect(dishSchema.parse(await detail.json()).versionId).toBe(dish.versionId);
  });

  it("rejects duplicate, case-insensitive names after trimming and invalid recipes", async () => {
    const packageId = await createMacroPackage("Saus");
    const created = await requestJson("/calorie-tracker/dishes", "POST", createDishBody(packageId, "Chili con carne"));
    expect(created.status).toBe(201);

    const duplicate = await requestJson("/calorie-tracker/dishes", "POST", createDishBody(packageId, "  chili CON carne "));
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ code: "DISH_ALREADY_EXISTS" });

    const emptyIngredients = await requestJson("/calorie-tracker/dishes", "POST", { ...createDishBody(packageId), ingredients: [] });
    expect(emptyIngredients.status).toBe(400);

    const zeroServings = await requestJson("/calorie-tracker/dishes", "POST", { ...createDishBody(packageId), servings: "0" });
    expect(zeroServings.status).toBe(400);

    const unknownPackage = await requestJson("/calorie-tracker/dishes", "POST", createDishBody(999_999));
    expect(unknownPackage.status).toBe(404);
    expect(await unknownPackage.json()).toMatchObject({ code: "PRODUCT_PACKAGE_NOT_FOUND" });
  });

  it("keeps dish data private per user", async () => {
    const packageId = await createMacroPackage("Privé");
    const created = dishSchema.parse(await (await requestJson("/calorie-tracker/dishes", "POST", createDishBody(packageId))).json());

    const foreignDetail = await requestAsOtherUser(`/calorie-tracker/dishes/${created.id}`);
    expect(foreignDetail.status).toBe(404);
    expect(await foreignDetail.json()).toMatchObject({ code: "DISH_NOT_FOUND" });
  });

  it("combines packages and dishes in one log-flow search", async () => {
    const packageId = await createMacroPackage("Zoekbasis");
    const dish = dishSchema.parse(await (await requestJson("/calorie-tracker/dishes", "POST", createDishBody(packageId, "Pasta pesto zoektest"))).json());
    await requestJson("/calorie-tracker/logs", "POST", createDishLogBody(dish.id));

    const shortQuery = await requestAsUser("/calorie-tracker/search?query=p");
    expect(shortQuery.status).toBe(400);

    const withQuery = await requestAsUser("/calorie-tracker/search?query=pesto%20zoektest");
    expect(withQuery.status).toBe(200);
    const results = unifiedSearchResultSchema.array().parse(await withQuery.json());
    const dishResult = results.find((result) => result.kind === "DISH");
    expect(dishResult?.id).toBe(dish.id);
    expect(dishResult !== undefined && dishResult.kind === "DISH" ? dishResult.caloriesPerServing : null).toBe("50");

    const recent = unifiedSearchResultSchema.array().parse(await (await requestAsUser("/calorie-tracker/search")).json());
    expect(recent.some((result) => result.kind === "DISH" && result.id === dish.id)).toBe(true);
  });

  it("logs dishes in portions, shows them under the food filter, and includes them in statistics", async () => {
    const packageId = await createMacroPackage("Basis");
    const silentPackageId = await createSilentPackage("Zonder profiel");
    const dish = dishSchema.parse(await (await requestJson("/calorie-tracker/dishes", "POST", {
      ...createDishBody(packageId, "Dagschotel"),
      ingredients: [
        { packageId, quantity: "100", inputMode: "CONTENT_UNIT", inputUnitTypeId: testCatalog.massUnitTypeId },
        { packageId: silentPackageId, quantity: "50", inputMode: "CONTENT_UNIT", inputUnitTypeId: testCatalog.massUnitTypeId },
      ],
    })).json());

    const logBody = createDishLogBody(dish.id);
    const created = await requestJson("/calorie-tracker/logs", "POST", { ...logBody, quantity: "1.5" });
    expect(created.status).toBe(201);
    const log = consumptionLogSchema.parse(await created.json());
    expect(log.type).toBe("DISH");
    if (log.type !== "DISH") throw new Error("Expected a dish consumption log");
    expect(log.dish.id).toBe(dish.id);
    expect(log.dish.versionId).toBe(dish.versionId);
    expect(log.derivedQuantityLabel).toBe("1.5 portie");
    expect(log.macroValues?.caloriesKcal).toBe("75");

    const retry = await requestJson("/calorie-tracker/logs", "POST", { ...logBody, quantity: "1.5" });
    expect(retry.status).toBe(200);
    expect(consumptionLogSchema.parse(await retry.json()).id).toBe(log.id);

    const list = logListSchema.parse(await (await requestAsUser(`/calorie-tracker/logs?date=${log.localDate}&type=food`, {
      headers: { "X-Browser-Timezone": "UTC" },
    })).json());
    expect(list.items.some((item) => item.id === log.id)).toBe(true);

    const statistics = dailyStatisticsSchema.parse(await (await requestAsUser(`/calorie-tracker/statistics?date=${log.localDate}`, {
      headers: { "X-Browser-Timezone": "UTC" },
    })).json());
    expect(Number(statistics.totals.caloriesKcal)).toBeGreaterThanOrEqual(75);
  });

  it("pins consumed versions so later recipe edits never change history", async () => {
    const packageId = await createMacroPackage("Versiebeheer");
    const dish = dishSchema.parse(await (await requestJson("/calorie-tracker/dishes", "POST", createDishBody(packageId, "Versiegerecht"))).json());
    const earlyLog = consumptionLogSchema.parse(await (await requestJson("/calorie-tracker/logs", "POST", createDishLogBody(dish.id))).json());

    const update = await requestJson(`/calorie-tracker/dishes/${dish.id}`, "PUT", { servings: "2" });
    expect(update.status).toBe(200);
    const updatedDish = dishSchema.parse(await update.json());
    expect(updatedDish.versionId).not.toBe(dish.versionId);
    expect(updatedDish.servings).toBe("2");

    const unchangedUpdate = await requestJson(`/calorie-tracker/dishes/${dish.id}`, "PUT", { servings: "2" });
    expect(dishSchema.parse(await unchangedUpdate.json()).versionId).toBe(updatedDish.versionId);

    const earlyDetail = consumptionLogSchema.parse(await (await requestAsUser(`/calorie-tracker/logs/${earlyLog.id}`)).json());
    if (earlyDetail.type !== "DISH") throw new Error("Expected a dish consumption log");
    expect(earlyDetail.dish.versionId).toBe(dish.versionId);
    expect(earlyDetail.macroValues?.caloriesKcal).toBe("50");

    const lateLog = consumptionLogSchema.parse(await (await requestJson("/calorie-tracker/logs", "POST", createDishLogBody(dish.id))).json());
    if (lateLog.type !== "DISH") throw new Error("Expected a dish consumption log");
    expect(lateLog.dish.versionId).toBe(updatedDish.versionId);
    expect(lateLog.macroValues?.caloriesKcal).toBe("100");
  });

  it("restricts dish-log edits to quantity and instant", async () => {
    const packageId = await createMacroPackage("Bewerkbaar");
    const dish = dishSchema.parse(await (await requestJson("/calorie-tracker/dishes", "POST", createDishBody(packageId))).json());
    const created = consumptionLogSchema.parse(await (await requestJson("/calorie-tracker/logs", "POST", createDishLogBody(dish.id))).json());

    const updated = await requestJson(`/calorie-tracker/logs/${created.id}`, "PUT", {
      expectedUpdatedAt: created.updatedAt,
      type: "DISH",
      quantity: "2",
      consumedAt: created.consumedAt,
    });
    expect(updated.status).toBe(200);
    const updatedLog = consumptionLogSchema.parse(await updated.json());
    if (updatedLog.type !== "DISH") throw new Error("Expected a dish consumption log");
    expect(updatedLog.quantity).toBe("2");
    expect(updatedLog.macroValues?.caloriesKcal).toBe("100");

    const typeSwitch = await requestJson(`/calorie-tracker/logs/${created.id}`, "PUT", {
      expectedUpdatedAt: updatedLog.updatedAt,
      type: "PRODUCT",
      packageId,
      quantity: "1",
      inputMode: "PACKAGE",
      inputUnitTypeId: null,
      consumedAt: created.consumedAt,
    });
    expect(typeSwitch.status).toBe(400);
  });

  it("soft-deletes dishes without a restore flow while pinned logs remain readable", async () => {
    const packageId = await createMacroPackage("Verwijderbaar");
    const dish = dishSchema.parse(await (await requestJson("/calorie-tracker/dishes", "POST", createDishBody(packageId, "Verwijdergerecht"))).json());
    const log = consumptionLogSchema.parse(await (await requestJson("/calorie-tracker/logs", "POST", createDishLogBody(dish.id))).json());

    const deleted = await requestJson(`/calorie-tracker/dishes/${dish.id}`, "DELETE");
    expect(deleted.status).toBe(200);
    deleteDishResultSchema.parse(await deleted.json());

    expect((await requestAsUser(`/calorie-tracker/dishes/${dish.id}`)).status).toBe(404);
    const search = unifiedSearchResultSchema.array().parse(await (await requestAsUser("/calorie-tracker/search?query=Verwijdergerecht")).json());
    expect(search.some((result) => result.kind === "DISH" && result.id === dish.id)).toBe(false);

    const lateLog = await requestJson("/calorie-tracker/logs", "POST", createDishLogBody(dish.id));
    expect(lateLog.status).toBe(404);
    expect(await lateLog.json()).toMatchObject({ code: "DISH_NOT_FOUND" });

    const retainedDetail = consumptionLogSchema.parse(await (await requestAsUser(`/calorie-tracker/logs/${log.id}`)).json());
    if (retainedDetail.type !== "DISH") throw new Error("Expected a dish consumption log");
    expect(retainedDetail.macroValues?.caloriesKcal).toBe("50");
  });

  it("uploads and serves dish images and rolls back unlinked uploads", async () => {
    const validPngBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    const upload = await requestAsUser("/calorie-tracker/dish-images", {
      method: "POST",
      body: new FormDataBuilder().append("image", new File([validPngBytes], "gerecht.png", { type: "image/png" })).build(),
    });
    expect(upload.status).toBe(201);
    const { imageUrl } = (await upload.json()) as { readonly imageUrl: string };
    expect(imageUrl).toMatch(/\/calorie-tracker\/dish-images\/[0-9a-f-]+\.png$/);

    const imagePath = new URL(imageUrl).pathname;
    const served = await app.request(imagePath);
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");

    const rollback = await requestJson("/calorie-tracker/dish-images", "DELETE", { imageUrl });
    expect(rollback.status).toBe(204);
    expect((await app.request(imagePath)).status).toBe(404);

    const missing = await requestJson("/calorie-tracker/dish-images", "DELETE", { imageUrl: "https://api.example.test/calorie-tracker/dish-images/00000000-0000-4000-8000-000000000000.png" });
    expect(missing.status).toBe(204);
  });

  it("links an uploaded dish image to the created dish", async () => {
    const validPngBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    const upload = await requestAsUser("/calorie-tracker/dish-images", {
      method: "POST",
      body: new FormDataBuilder().append("image", new File([validPngBytes], "gerecht.png", { type: "image/png" })).build(),
    });
    const { imageUrl } = (await upload.json()) as { readonly imageUrl: string };
    const packageId = await createMacroPackage("Met afbeelding");
    const dish = dishSchema.parse(await (await requestJson("/calorie-tracker/dishes", "POST", { ...createDishBody(packageId), imageUrl })).json());
    expect(dish.imageUrl).toBe(imageUrl);
  });
});

/** Minimal form-data builder for multipart upload requests. */
class FormDataBuilder {
  private readonly formData = new FormData();

  /** Append one file field to the multipart body. */
  append(name: string, file: File): FormDataBuilder {
    this.formData.append(name, file);
    return this;
  }

  /** Return the assembled multipart body. */
  build(): FormData {
    return this.formData;
  }
}
