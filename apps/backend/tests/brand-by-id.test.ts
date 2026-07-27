import { describe, expect, it } from "bun:test";
import { app, testCatalog } from "./test-app";

describe("brand lookup by id", () => {
  it("returns an existing brand by id", async () => {
    const response = await app.request(`/brands/${testCatalog.brandId}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: testCatalog.brandId, name: "Testmerk" });
  });

  it("returns BRAND_NOT_FOUND for unknown or invalid brand ids", async () => {
    const unknownResponse = await app.request(`/brands/${crypto.randomUUID()}`);
    expect(unknownResponse.status).toBe(404);
    expect(await unknownResponse.json()).toEqual({ code: "BRAND_NOT_FOUND", message: "Brand not found" });

    const invalidResponse = await app.request("/brands/not-a-uuid");
    expect(invalidResponse.status).toBe(404);
    expect(await invalidResponse.json()).toEqual({ code: "BRAND_NOT_FOUND", message: "Brand not found" });
  });
});
