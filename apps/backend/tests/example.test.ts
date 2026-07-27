import { describe, it, expect } from "bun:test";
import { app } from "./test-app";

describe("API Health Checks", () => {
  it("should return OK on root endpoint", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const json = await res.json() as { message: string; version: string };
    expect(json.message).toBe("Backend API is running");
    expect(json.version).toBeDefined();
  });

  it("should return OK on /health endpoint", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const json = await res.json() as { status: string };
    expect(json.status).toBe("ok");
  });

  it("should return OK on /health/db endpoint", async () => {
    const res = await app.request("/health/db");
    expect(res.status).toBe(200);
    const json = await res.json() as { status: string; database: string };
    expect(json.status).toBe("ok");
    expect(json.database).toBe("connected");
  });

  it("should return 404 for non-existent routes", async () => {
    const res = await app.request("/this-does-not-exist");
    expect(res.status).toBe(404);
    const json = await res.json() as { error: { message: string } };
    expect(json.error.message).toBe("Route not found");
  });
});
