import { describe, expect, it } from "vitest";
import { toPublicAppPath } from "@product-repos/shared/public-app-path";

/** Verify basename prefixing independently from application route policy. */
describe("toPublicAppPath", () => {
  it.each([
    ["/", "/example"],
    ["logs", "/example/logs"],
    ["/logs", "/example/logs"],
    ["///logs?date=2026-01-01#item", "/example/logs?date=2026-01-01#item"],
  ])("normalizes %s", (internalPath, expected) => {
    expect(toPublicAppPath("/example/", internalPath)).toBe(expected);
  });
});
