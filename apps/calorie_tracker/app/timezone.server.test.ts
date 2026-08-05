import { describe, expect, it } from "vitest";
import { parseBrowserTimezone, readBrowserTimezone, serializeBrowserTimezone } from "./timezone.server";

describe("browser timezone cookie", () => {
  it("accepts only runtime-supported IANA timezones", () => {
    expect(parseBrowserTimezone("Europe/Amsterdam")).toBe("Europe/Amsterdam");
    expect(parseBrowserTimezone("Not/A-Timezone")).toBeNull();
    expect(parseBrowserTimezone(42)).toBeNull();
  });

  it("reads a valid encoded timezone and ignores invalid cookie values", () => {
    const validRequest = new Request("https://example.test/calorie-tracker", {
      headers: { cookie: "other=value; calorie_tracker_timezone=Europe%2FAmsterdam" },
    });
    const invalidRequest = new Request("https://example.test/calorie-tracker", {
      headers: { cookie: "calorie_tracker_timezone=Not%2FA-Timezone" },
    });
    expect(readBrowserTimezone(validRequest)).toBe("Europe/Amsterdam");
    expect(readBrowserTimezone(invalidRequest)).toBeNull();
  });

  it("serializes an HTTP-only application-scoped secure cookie", () => {
    const cookie = serializeBrowserTimezone("Europe/Amsterdam", new Request("https://example.test/calorie-tracker"));
    expect(cookie).toContain("calorie_tracker_timezone=Europe%2FAmsterdam");
    expect(cookie).toContain("Path=/calorie-tracker");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
  });
});
