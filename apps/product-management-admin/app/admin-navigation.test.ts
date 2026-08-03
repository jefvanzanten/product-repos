import { describe, expect, it } from "vitest";
import {
  getAdminSourceDetails,
  parseAdminReturnPath,
  parseAdminSource,
  toAdminRedirectPath,
  withAdminSource,
} from "./admin-navigation";
import { resolveAdminSource } from "./admin-source.server";

describe("admin source navigation", () => {
  it.each(["inventory", "calorie-tracker"])("accepts the closed source %s", (source) => {
    expect(parseAdminSource(source)).toBe(source);
  });

  it.each([undefined, null, "", "unknown", "https://example.com", "/inventory"])(
    "rejects unknown source input %s",
    (source) => {
      expect(parseAdminSource(source)).toBeNull();
    },
  );

  it("retains functional query parameters while merging source", () => {
    expect(withAdminSource(
      "/product-catalogus?q=cola&categoryId=3&brandId=brand-1&status=active",
      "inventory",
    )).toBe(
      "/product-catalogus?q=cola&categoryId=3&brandId=brand-1&status=active&source=inventory",
    );
  });

  it("keeps server redirects app-internal so React Router applies the basename once", () => {
    expect(toAdminRedirectPath("/product-catalogus", "inventory")).toBe(
      "/product-catalogus?source=inventory",
    );
  });

  it("gives an explicit query source precedence over the fallback cookie", () => {
    const request = new Request(
      "https://apps.example/product-management-admin/product-catalogus?source=calorie-tracker",
      { headers: { cookie: "product_management_admin_source=inventory" } },
    );
    expect(resolveAdminSource(request).source).toBe("calorie-tracker");
  });

  it("uses a valid fallback cookie when no query source exists", () => {
    const request = new Request(
      "https://apps.example/product-management-admin/product-catalogus",
      { headers: { cookie: "product_management_admin_source=inventory" } },
    );
    expect(resolveAdminSource(request)).toMatchObject({ source: "inventory", setCookie: null });
  });

  it("does not invent navigation for invalid source input", () => {
    const request = new Request(
      "https://apps.example/product-management-admin/product-catalogus?source=https://evil.example",
    );
    expect(resolveAdminSource(request)).toEqual({ source: null, setCookie: null });
  });

  it("maps each parsed source to a closed public destination", () => {
    expect(getAdminSourceDetails("inventory")).toEqual({
      label: "Inventarisatie",
      publicPath: "/inventory",
    });
    expect(getAdminSourceDetails("calorie-tracker")).toEqual({
      label: "Calorie Tracker",
      publicPath: "/calorie-tracker",
    });
  });

  it("accepts only supported app-internal login destinations", () => {
    expect(parseAdminReturnPath("/product-catalogus/123?brandId=one")).toBe(
      "/product-catalogus/123?brandId=one",
    );
    expect(parseAdminReturnPath("https://evil.example/steal")).toBe("/product-catalogus");
    expect(parseAdminReturnPath("//evil.example/steal")).toBe("/product-catalogus");
    expect(parseAdminReturnPath("/login")).toBe("/product-catalogus");
  });
});
