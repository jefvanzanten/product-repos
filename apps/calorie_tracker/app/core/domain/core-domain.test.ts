import { describe, expect, it } from "vitest";
import {
  isLocalDate,
  parseEditedConsumptionMoment,
  parseLocalConsumptionMoment,
  sortChronologically,
} from "./dates-and-timezones";
import {
  parsePositiveDecimal,
  selectInputUnitKey,
  shouldIncludeLegacyInputUnit,
} from "./quantities";

describe("local dates", () => {
  it.each(["2023-02-29", "2026-13-01", "not-a-date"])("rejects invalid date %s", (date) => {
    expect(isLocalDate(date)).toBe(false);
  });
});

describe("positive decimal parsing", () => {
  it.each([
    ["0,5", "0.5"],
    [" 1.50 ", "1.5"],
    ["0002.00", "2"],
  ])("parses %s as %s", (input, canonical) => {
    expect(parsePositiveDecimal(input)).toEqual({ tag: "Success", value: { canonical } });
  });

  it.each(["0", "-1", "text", "1,2,3", " "])("rejects %s", (input) => {
    expect(parsePositiveDecimal(input).tag).toBe("Failure");
  });

  it("preserves exceptionally large positive values", () => {
    expect(parsePositiveDecimal("999999999999999999.9")).toEqual({
      tag: "Success",
      value: { canonical: "999999999999999999.9" },
    });
  });
});

describe("chronological ordering", () => {
  it("orders equal consumption instants by creation time", () => {
    const records = [
      { consumedAt: "2026-07-29T08:00:00Z", createdAt: "2026-07-29T10:00:00Z", id: "later-created" },
      { consumedAt: "2026-07-29T07:00:00Z", createdAt: "2026-07-29T11:00:00Z", id: "earlier" },
      { consumedAt: "2026-07-29T08:00:00Z", createdAt: "2026-07-29T09:00:00Z", id: "first-created" },
    ];
    expect(sortChronologically(records).map((record) => record.id)).toEqual(["earlier", "first-created", "later-created"]);
  });
});

describe("edit input units", () => {
  it("includes an existing unit only for the original product", () => {
    expect(shouldIncludeLegacyInputUnit("product-12", "product-12")).toBe(true);
    expect(shouldIncludeLegacyInputUnit("product-13", "product-12")).toBe(false);
  });

  it("keeps a valid choice and otherwise prefers an individual portion", () => {
    expect(selectInputUnitKey(null, ["FULL_PRODUCT:product", "CONTENT_UNIT:3", "PRODUCT_PORTION:product"])).toBe("PRODUCT_PORTION:product");
    expect(selectInputUnitKey("CONTENT_UNIT:2", ["FULL_PRODUCT:product", "CONTENT_UNIT:3"])).toBe("FULL_PRODUCT:product");
    expect(selectInputUnitKey("CONTENT_UNIT:3", ["FULL_PRODUCT:product", "PRODUCT_PORTION:product", "CONTENT_UNIT:3"])).toBe("CONTENT_UNIT:3");
  });
});

describe("local consumption moment", () => {
  it("rejects a nonexistent DST spring-forward time in the explicit timezone", () => {
    expect(parseLocalConsumptionMoment("2026-03-29", "02:30", "Europe/Amsterdam", new Date("2026-03-29T04:00:00Z"))).toEqual({ tag: "Failure", error: { tag: "InvalidMoment" } });
  });

  it("rejects an ambiguous DST fall-back time instead of choosing an instant silently", () => {
    expect(parseLocalConsumptionMoment("2026-10-25", "02:30", "Europe/Amsterdam", new Date("2026-10-25T04:00:00Z"))).toEqual({ tag: "Failure", error: { tag: "AmbiguousMoment" } });
  });

  it("rejects normalized invalid calendar moments", () => {
    expect(parseLocalConsumptionMoment("2026-02-29", "12:00", "UTC", new Date("2026-03-01T00:00:00Z")).tag).toBe("Failure");
  });

  it("resolves explicit timezone moments and rejects future instants", () => {
    const now = new Date("2026-07-29T12:00:00Z");
    expect(parseLocalConsumptionMoment("2026-07-29", "14:01", "Europe/Amsterdam", now)).toEqual({ tag: "Failure", error: { tag: "FutureMoment" } });
    expect(parseLocalConsumptionMoment("2026-07-29", "13:59", "Europe/Amsterdam", now)).toEqual({ tag: "Success", value: "2026-07-29T11:59:00.000Z" });
  });

  it("preserves the exact original instant when edit fields remain unchanged", () => {
    const original = {
      date: "2026-10-25",
      time: "02:30",
      consumedAt: "2026-10-25T00:30:42.000Z",
    };
    expect(parseEditedConsumptionMoment("2026-10-25", "02:30", "Europe/Amsterdam", original, new Date("2026-10-25T04:00:00Z"))).toEqual({
      tag: "Success",
      value: original.consumedAt,
    });
  });
});
