import { describe, expect, it } from "vitest";
import { parseInventoryReturnPath, returnPathFromRequest } from "./public-paths";

describe("Inventory return paths", () => {
  it("retains the supported root query and fragment", () => {
    expect(parseInventoryReturnPath("/?filter=expiring#top")).toBe("/?filter=expiring#top");
  });

  it("rejects external and unsupported destinations", () => {
    expect(parseInventoryReturnPath("//example.com/path")).toBe("/");
    expect(parseInventoryReturnPath("/admin")).toBe("/");
  });

  it("derives an internal destination from a public Inventory request", () => {
    expect(returnPathFromRequest(new Request("https://apps.example/inventory/?filter=low-stock"))).toBe("/?filter=low-stock");
    expect(returnPathFromRequest(new Request("https://apps.example/other"))).toBe("/");
  });
});
