import { describe, expect, it } from "bun:test";
import {
  productCreatedDtoSchema,
  type MacroProfile,
  type ProductCreatedDto,
} from "@product-repos/contracts";
import {
  consumptionLogSchema,
  dailyStatisticsSchema,
  logListSchema,
  packageSearchResultSchema,
} from "@product-repos/contracts/calorie-tracker";
import {
  executeTestSql,
  requestAsAdmin,
  requestAsOtherUser,
  requestAsUser,
  testCatalog,
} from "./test-app.ts";

type AuthenticatedRequester = (path: string, init?: RequestInit) => Promise<Response>;

type CreateCatalogPackageInput = {
  readonly name: string;
  readonly consumptionType?: "FOOD" | "DRINK" | "SUPPLEMENT";
  readonly macroProfile?: MacroProfile | null;
  readonly amount: string;
  readonly unitTypeId: number;
  readonly unitsPerPackage?: number;
  readonly individualPackageTypeId?: number | null;
};

/** Send JSON through one authenticated HTTP boundary. */
function requestJson(
  requester: AuthenticatedRequester,
  path: string,
  method: "POST" | "PATCH" | "PUT",
  body: unknown,
  timezone = "UTC",
): Promise<Response> {
  return requester(path, {
    method,
    headers: { "Content-Type": "application/json", "X-Browser-Timezone": timezone },
    body: JSON.stringify(body),
  });
}

/** Create one unique catalog product and its first package through the admin route. */
async function createCatalogPackage(input: CreateCatalogPackageInput): Promise<ProductCreatedDto> {
  const response = await requestAsAdmin("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `${input.name} ${crypto.randomUUID()}`,
      categoryId: testCatalog.categoryId,
      brandId: null,
      consumptionType: input.consumptionType ?? "FOOD",
      macroProfile: input.macroProfile ?? null,
      package: {
        packageTypeId: testCatalog.packageTypeId,
        individualPackageTypeId: input.individualPackageTypeId ?? null,
        amount: input.amount,
        unitTypeId: input.unitTypeId,
        unitsPerPackage: input.unitsPerPackage ?? 1,
      },
    }),
  });
  expect(response.status).toBe(201);
  return productCreatedDtoSchema.parse(await response.json());
}

/** Build a canonical create-log request with an explicit stable instant. */
function createLogBody(
  packageId: number,
  options: {
    readonly id?: string;
    readonly quantity?: string;
    readonly inputMode?: "PACKAGE" | "INDIVIDUAL_UNIT" | "CONTENT_UNIT";
    readonly inputUnitTypeId?: number | null;
    readonly consumedAt?: string;
  } = {},
) {
  return {
    id: options.id ?? crypto.randomUUID(),
    packageId,
    quantity: options.quantity ?? "1",
    inputMode: options.inputMode ?? "PACKAGE",
    inputUnitTypeId: options.inputUnitTypeId ?? null,
    consumedAt: options.consumedAt ?? "2026-01-15T12:00:00.000Z",
  } as const;
}

/** Read the daily statistics route for one local date and timezone. */
async function readStatistics(date: string, timezone = "UTC") {
  const response = await requestAsUser(`/calorie-tracker/statistics?date=${date}`, {
    headers: { "X-Browser-Timezone": timezone },
  });
  expect(response.status).toBe(200);
  return dailyStatisticsSchema.parse(await response.json());
}

describe("Calorie Tracker backend coverage", () => {
  it("converts package, individual, and content input and rejects an incompatible dimension", async () => {
    const created = await createCatalogPackage({
      name: "Conversion sixpack",
      consumptionType: "DRINK",
      macroProfile: {
        referenceBasis: "PER_100_ML",
        caloriesKcal: "100",
        proteinG: "10",
        carbohydratesG: null,
        fatG: null,
        caloriesSource: "MANUAL",
      },
      amount: "0.33",
      unitTypeId: testCatalog.unitTypeId,
      unitsPerPackage: 6,
      individualPackageTypeId: testCatalog.individualPackageTypeId,
    });

    const packageResponse = await requestJson(requestAsUser, "/calorie-tracker/logs", "POST", createLogBody(created.package.id));
    expect(packageResponse.status).toBe(201);
    expect(consumptionLogSchema.parse(await packageResponse.json())).toMatchObject({
      derivedQuantityLabel: "1 fles",
      macroValues: { caloriesKcal: "1980", proteinG: "198", carbohydratesG: null, fatG: null },
    });

    const individualResponse = await requestJson(requestAsUser, "/calorie-tracker/logs", "POST", createLogBody(created.package.id, {
      quantity: "3",
      inputMode: "INDIVIDUAL_UNIT",
    }));
    expect(individualResponse.status).toBe(201);
    expect(consumptionLogSchema.parse(await individualResponse.json())).toMatchObject({
      derivedQuantityLabel: "3 blikje",
      macroValues: { caloriesKcal: "990", proteinG: "99", carbohydratesG: null, fatG: null },
    });

    const contentResponse = await requestJson(requestAsUser, "/calorie-tracker/logs", "POST", createLogBody(created.package.id, {
      quantity: "1.5",
      inputMode: "CONTENT_UNIT",
      inputUnitTypeId: testCatalog.unitTypeId,
    }));
    expect(contentResponse.status).toBe(201);
    expect(consumptionLogSchema.parse(await contentResponse.json())).toMatchObject({
      derivedQuantityLabel: "1.5 l",
      macroValues: { caloriesKcal: "1500", proteinG: "150", carbohydratesG: null, fatG: null },
    });

    const incompatibleResponse = await requestJson(requestAsUser, "/calorie-tracker/logs", "POST", createLogBody(created.package.id, {
      inputMode: "CONTENT_UNIT",
      inputUnitTypeId: testCatalog.massUnitTypeId,
    }));
    expect(incompatibleResponse.status).toBe(400);
    expect(await incompatibleResponse.json()).toMatchObject({ code: "REFERENCE_NOT_FOUND" });
  });

  it("orders equal timestamps deterministically and returns distinct recent active packages", async () => {
    const first = await createCatalogPackage({ name: "Recent first", amount: "100", unitTypeId: testCatalog.massUnitTypeId });
    const second = await createCatalogPackage({ name: "Recent second", amount: "200", unitTypeId: testCatalog.massUnitTypeId });
    const firstId = "10000000-0000-4000-8000-000000000001";
    const secondId = "10000000-0000-4000-8000-000000000002";
    const consumedAt = "2026-01-20T10:00:00.000Z";

    expect((await requestJson(requestAsUser, "/calorie-tracker/logs", "POST", createLogBody(first.package.id, { id: firstId, consumedAt }))).status).toBe(201);
    expect((await requestJson(requestAsUser, "/calorie-tracker/logs", "POST", createLogBody(second.package.id, { id: secondId, consumedAt }))).status).toBe(201);
    executeTestSql("UPDATE consumption_log SET created_at = ?, updated_at = ? WHERE id IN (?, ?)", consumedAt, consumedAt, firstId, secondId);

    const listResponse = await requestAsUser("/calorie-tracker/logs?date=2026-01-20&type=all", { headers: { "X-Browser-Timezone": "UTC" } });
    const list = logListSchema.parse(await listResponse.json());
    expect(list.items.filter((item) => item.id === firstId || item.id === secondId).map((item) => item.id)).toEqual([firstId, secondId]);

    const recentResponse = await requestAsUser("/calorie-tracker/packages/search?limit=20");
    expect(recentResponse.status).toBe(200);
    const recent = packageSearchResultSchema.array().parse(await recentResponse.json());
    const createdPackageIds = new Set([first.package.id, second.package.id]);
    expect(recent.filter((item) => createdPackageIds.has(item.packageId)).map((item) => item.packageId)).toEqual([second.package.id, first.package.id]);
  });

  it("aggregates partial macros, explicit calories, 4/4/9 fallback, and exact values before presentation rounding", async () => {
    const partial = await createCatalogPackage({
      name: "Partial macros",
      macroProfile: { referenceBasis: "PER_100_G", caloriesKcal: null, proteinG: "10", carbohydratesG: null, fatG: null, caloriesSource: null },
      amount: "100",
      unitTypeId: testCatalog.massUnitTypeId,
    });
    const explicit = await createCatalogPackage({
      name: "Explicit calories",
      macroProfile: { referenceBasis: "PER_100_G", caloriesKcal: "123", proteinG: "1", carbohydratesG: "1", fatG: "1", caloriesSource: "MANUAL" },
      amount: "100",
      unitTypeId: testCatalog.massUnitTypeId,
    });
    const fallback = await createCatalogPackage({
      name: "Fallback calories",
      macroProfile: { referenceBasis: "PER_100_G", caloriesKcal: null, proteinG: "1", carbohydratesG: "2", fatG: "3", caloriesSource: null },
      amount: "100",
      unitTypeId: testCatalog.massUnitTypeId,
    });
    const rounding = await createCatalogPackage({
      name: "Sum before rounding",
      macroProfile: { referenceBasis: "PER_100_G", caloriesKcal: "49", proteinG: null, carbohydratesG: null, fatG: null, caloriesSource: "MANUAL" },
      amount: "1",
      unitTypeId: testCatalog.massUnitTypeId,
    });

    const date = "2026-02-10";
    const responses = [];
    for (const packageId of [partial.package.id, explicit.package.id, fallback.package.id, rounding.package.id, rounding.package.id]) {
      responses.push(await requestJson(requestAsUser, "/calorie-tracker/logs", "POST", createLogBody(packageId, { consumedAt: `${date}T12:00:00.000Z` })));
    }
    expect(responses.every((response) => response.status === 201)).toBe(true);

    const partialLog = consumptionLogSchema.parse(await responses[0]?.json());
    const explicitLog = consumptionLogSchema.parse(await responses[1]?.json());
    const fallbackLog = consumptionLogSchema.parse(await responses[2]?.json());
    expect(partialLog.macroValues).toEqual({ caloriesKcal: null, proteinG: "10", carbohydratesG: null, fatG: null });
    expect(explicitLog.macroValues?.caloriesKcal).toBe("123");
    expect(fallbackLog.macroValues?.caloriesKcal).toBe("39");

    const statistics = await readStatistics(date);
    expect(statistics.totals).toEqual({ caloriesKcal: "162.98", proteinG: "12", carbohydratesG: "3", fatG: "4" });
  });

  it("uses each stored timezone for local day boundaries and isolates logs, statistics, and goals", async () => {
    const created = await createCatalogPackage({
      name: "Timezone isolation",
      macroProfile: { referenceBasis: "PER_100_G", caloriesKcal: "100", proteinG: null, carbohydratesG: null, fatG: null, caloriesSource: "MANUAL" },
      amount: "100",
      unitTypeId: testCatalog.massUnitTypeId,
    });
    const beforeBoundary = createLogBody(created.package.id, { consumedAt: "2026-03-29T21:59:00.000Z" });
    const afterBoundary = createLogBody(created.package.id, { consumedAt: "2026-03-29T22:00:00.000Z" });
    const otherUserLog = createLogBody(created.package.id, { consumedAt: "2026-03-29T22:30:00.000Z" });

    expect((await requestJson(requestAsUser, "/calorie-tracker/logs", "POST", beforeBoundary, "Europe/Amsterdam")).status).toBe(201);
    expect((await requestJson(requestAsUser, "/calorie-tracker/logs", "POST", afterBoundary, "Europe/Amsterdam")).status).toBe(201);
    expect((await requestJson(requestAsOtherUser, "/calorie-tracker/logs", "POST", otherUserLog, "Europe/Amsterdam")).status).toBe(201);

    const marchResponse = await requestAsUser("/calorie-tracker/logs?date=2026-03-29&type=all", { headers: { "X-Browser-Timezone": "Europe/Amsterdam" } });
    const march = logListSchema.parse(await marchResponse.json());
    expect(march.items.some((item) => item.id === beforeBoundary.id)).toBe(true);
    expect(march.items.some((item) => item.id === afterBoundary.id)).toBe(false);

    const aprilResponse = await requestAsUser("/calorie-tracker/logs?date=2026-03-30&type=all", { headers: { "X-Browser-Timezone": "UTC" } });
    const april = logListSchema.parse(await aprilResponse.json());
    expect(april.timezone).toBe("UTC");
    expect(april.items.some((item) => item.id === afterBoundary.id)).toBe(true);
    expect(april.items.some((item) => item.id === otherUserLog.id)).toBe(false);
    expect((await readStatistics("2026-03-30", "Europe/Amsterdam")).totals.caloriesKcal).toBe("100");

    const userGoal = await requestJson(requestAsUser, "/calorie-tracker/goals", "PUT", { caloriesKcal: 2000, proteinG: null, carbohydratesG: null, fatG: null });
    const otherGoal = await requestJson(requestAsOtherUser, "/calorie-tracker/goals", "PUT", { caloriesKcal: 3000, proteinG: null, carbohydratesG: null, fatG: null });
    expect(userGoal.status).toBe(200);
    expect(otherGoal.status).toBe(200);
    const ownGoalResponse = await requestAsUser("/calorie-tracker/goals");
    expect(await ownGoalResponse.json()).toMatchObject({ caloriesKcal: 2000 });
  });

  it("keeps create retries idempotent after package correction and catalog archiving", async () => {
    const created = await createCatalogPackage({
      name: "Retry correction",
      macroProfile: { referenceBasis: "PER_100_G", caloriesKcal: "200", proteinG: null, carbohydratesG: null, fatG: null, caloriesSource: "MANUAL" },
      amount: "100",
      unitTypeId: testCatalog.massUnitTypeId,
    });
    const body = createLogBody(created.package.id, { consumedAt: "2026-04-05T12:00:00.000Z" });
    const initialResponse = await requestJson(requestAsUser, "/calorie-tracker/logs", "POST", body);
    expect(consumptionLogSchema.parse(await initialResponse.json()).macroValues?.caloriesKcal).toBe("200");

    const correctionResponse = await requestAsAdmin(`/products/${created.id}/packages/${created.package.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageTypeId: testCatalog.packageTypeId,
        individualPackageTypeId: null,
        amount: "250",
        unitTypeId: testCatalog.massUnitTypeId,
        unitsPerPackage: 1,
      }),
    });
    expect(correctionResponse.status).toBe(200);

    const retryAfterCorrection = await requestJson(requestAsUser, "/calorie-tracker/logs", "POST", body);
    expect(retryAfterCorrection.status).toBe(200);
    expect(consumptionLogSchema.parse(await retryAfterCorrection.json()).macroValues?.caloriesKcal).toBe("500");

    executeTestSql("UPDATE product_package SET archived_at = ? WHERE id = ?", "2026-04-06T00:00:00.000Z", created.package.id);
    const retryAfterArchive = await requestJson(requestAsUser, "/calorie-tracker/logs", "POST", body);
    expect(retryAfterArchive.status).toBe(200);
    expect(consumptionLogSchema.parse(await retryAfterArchive.json()).package.packageArchived).toBe(true);
  });

  it("blocks package dimension correction while an active explicit-content log depends on it", async () => {
    const created = await createCatalogPackage({ name: "Dimension correction", amount: "1", unitTypeId: testCatalog.unitTypeId });
    const logResponse = await requestJson(requestAsUser, "/calorie-tracker/logs", "POST", createLogBody(created.package.id, {
      inputMode: "CONTENT_UNIT",
      inputUnitTypeId: testCatalog.unitTypeId,
      consumedAt: "2026-04-10T12:00:00.000Z",
    }));
    expect(logResponse.status).toBe(201);

    const correctionResponse = await requestAsAdmin(`/products/${created.id}/packages/${created.package.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageTypeId: testCatalog.packageTypeId,
        individualPackageTypeId: null,
        amount: "100",
        unitTypeId: testCatalog.massUnitTypeId,
        unitsPerPackage: 1,
      }),
    });
    expect(correctionResponse.status).toBe(400);
    expect(await correctionResponse.json()).toMatchObject({ code: "UNIT_DIMENSION_INCOMPATIBLE" });

    const unchangedResponse = await requestAsAdmin(`/products/${created.id}/packages/${created.package.id}`);
    expect(unchangedResponse.status).toBe(200);
    expect(await unchangedResponse.json()).toMatchObject({ unitContent: { unitType: { dimension: "VOLUME" } } });
  });

  it("physically cleans only logs deleted for at least thirty days without adding a public route", async () => {
    const created = await createCatalogPackage({ name: "Cleanup retention", amount: "100", unitTypeId: testCatalog.massUnitTypeId });
    const expiredBody = createLogBody(created.package.id, { consumedAt: "2026-05-01T12:00:00.000Z" });
    const retainedBody = createLogBody(created.package.id, { consumedAt: "2026-05-02T12:00:00.000Z" });
    expect((await requestJson(requestAsUser, "/calorie-tracker/logs", "POST", expiredBody)).status).toBe(201);
    expect((await requestJson(requestAsUser, "/calorie-tracker/logs", "POST", retainedBody)).status).toBe(201);
    expect((await requestAsUser(`/calorie-tracker/logs/${expiredBody.id}`, { method: "DELETE" })).status).toBe(200);
    expect((await requestAsUser(`/calorie-tracker/logs/${retainedBody.id}`, { method: "DELETE" })).status).toBe(200);
    executeTestSql("UPDATE consumption_log SET deleted_at = ?, updated_at = ? WHERE id = ?", "2026-07-01T12:00:00.000Z", "2026-07-01T12:00:00.000Z", expiredBody.id);
    executeTestSql("UPDATE consumption_log SET deleted_at = ?, updated_at = ? WHERE id = ?", "2026-07-02T12:00:00.001Z", "2026-07-02T12:00:00.001Z", retainedBody.id);

    const [{ CalorieTracker }, { DrizzleCalorieTracker }] = await Promise.all([
      import("../src/calorie-tracker/calorie-tracker.ts"),
      import("../src/calorie-tracker/drizzle-calorie-tracker.ts"),
    ]);
    const fixedClock = {
      /** Return the deterministic cleanup instant. */
      now: () => new Date("2026-07-31T12:00:00.000Z"),
    };
    const cleanup = new CalorieTracker(new DrizzleCalorieTracker(), fixedClock).cleanupDeletedLogs();
    expect(cleanup).toEqual({
      ok: true,
      value: { deletedCount: 1, cutoffInclusive: "2026-07-01T12:00:00.000Z" },
    });

    expect((await requestJson(requestAsUser, "/calorie-tracker/logs", "POST", expiredBody)).status).toBe(201);
    const retainedRetry = await requestJson(requestAsUser, "/calorie-tracker/logs", "POST", retainedBody);
    expect(retainedRetry.status).toBe(409);
    expect(await retainedRetry.json()).toMatchObject({ code: "LOG_CREATE_CONFLICT" });
  });
});
