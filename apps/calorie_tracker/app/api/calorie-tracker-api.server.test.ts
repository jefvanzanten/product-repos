import { afterEach, describe, expect, it, vi } from "vitest";
import { getDailyStatistics } from "./calorie-tracker-api.server";

const statistics = {
  date: "2026-08-05",
  timezone: "Europe/Amsterdam",
  totals: { caloriesKcal: "100", proteinG: "5", carbohydratesG: "10", fatG: "2" },
  goals: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Calorie Tracker server API adapter", () => {
  it("forwards session, timezone, and abort signal and validates the response", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(statistics), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request("https://example.test/calorie-tracker/?date=2026-08-05", {
      headers: { cookie: "session=test-session" },
    });

    await expect(getDailyStatistics("2026-08-05", "Europe/Amsterdam", request)).resolves.toEqual(statistics);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    expect(headers.get("cookie")).toBe("session=test-session");
    expect(headers.get("X-Browser-Timezone")).toBe("Europe/Amsterdam");
    expect(init?.signal).toBe(request.signal);
  });

  it("throws one classified error for a parsed backend failure", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      code: "INTERNAL_ERROR",
      message: "Tijdelijk niet beschikbaar",
    }), { status: 503, headers: { "Content-Type": "application/json" } })));
    const request = new Request("https://example.test/calorie-tracker/");

    await expect(getDailyStatistics("2026-08-05", "UTC", request)).rejects.toMatchObject({
      status: 503,
      response: { code: "INTERNAL_ERROR", message: "Tijdelijk niet beschikbaar" },
    });
  });
});
