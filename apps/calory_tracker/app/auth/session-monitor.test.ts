import { buildSessionExpiredLoginPath } from "@product-repos/auth-client/session-monitor";
import { describe, expect, it } from "vitest";

const navigation = {
  appBasePath: "/calory-tracker",
  loginPath: "/calory-tracker/login",
} as const;

describe("expired session login navigation", () => {
  it("retains the current internal date and filter context", () => {
    expect(buildSessionExpiredLoginPath(
      "https://apps.example.test/calory-tracker/logs?date=2026-07-29&type=drink",
      navigation,
    )).toBe(
      "/calory-tracker/login?returnTo=%2Flogs%3Fdate%3D2026-07-29%26type%3Ddrink",
    );
  });

  it("does not create a redirect loop from the login page", () => {
    expect(buildSessionExpiredLoginPath(
      "https://apps.example.test/calory-tracker/login",
      navigation,
    )).toBe("/calory-tracker/login");
  });

  it("drops an unrelated application destination", () => {
    expect(buildSessionExpiredLoginPath(
      "https://apps.example.test/product-management-admin/product-catalogus",
      navigation,
    )).toBe("/calory-tracker/login");
  });
});
