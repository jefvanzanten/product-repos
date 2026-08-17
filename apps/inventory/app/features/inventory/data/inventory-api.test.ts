import { afterEach, describe, expect, it, vi } from "vitest";
import { getPhysicalInventoryItems, removePhysicalInventoryItem } from "./inventory-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Inventory API adapter", () => {
  it("constructs scoped list requests and rejects invalid success payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ unexpected: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getPhysicalInventoryItems({ query: "rijst", filter: "low-stock", cursor: "next", signal: undefined });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/inventory-items?limit=30&filter=low-stock&query=rijst&cursor=next");
    expect(result.tag).toBe("Failure");
    if (result.tag === "Failure") expect(result.error.tag).toBe("InvalidResponse");
  });

  it("accepts an intentional empty delete response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(removePhysicalInventoryItem("4ca6e02f-1f50-4c5e-82a4-263a35bee8d4", 2)).resolves.toEqual({ tag: "Success", value: null });
  });

  it("classifies transport failures without exposing thrown fetch errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await getPhysicalInventoryItems({ query: null, filter: "all", cursor: null });
    expect(result.tag).toBe("Failure");
    if (result.tag === "Failure") expect(result.error.tag).toBe("NetworkFailure");
  });
});
