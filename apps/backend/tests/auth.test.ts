import { describe, expect, it } from "bun:test";
import { app, requestAsAdmin, requestAsUser } from "./test-app";

describe("catalog authorization", () => {
  it("rejects an unauthenticated catalog request", async () => {
    const response = await app.request("/products");
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      code: "UNAUTHENTICATED",
      message: "Authentication is required",
    });
  });

  it("allows an authenticated user to read the shared catalog", async () => {
    const response = await requestAsUser("/products");
    expect(response.status).toBe(200);
  });

  it("rejects a catalog mutation from a regular user", async () => {
    const response = await requestAsUser("/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Forbidden brand" }),
    });
    expect(response.status).toBe(403);
  });

  it("allows an authenticated administrator", async () => {
    const response = await requestAsAdmin("/products");
    expect(response.status).toBe(200);
  });
});
