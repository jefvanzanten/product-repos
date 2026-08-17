import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDailyStatistics } from "../../features/statistics/data/statistics-api.server";
import { getTodayDate } from "../../core/domain/dates-and-timezones";
import { loadStatisticsRoute } from "./statistics-route.server";

vi.mock("../../core/presentation/auth/auth.server", () => ({ requireUser: vi.fn().mockResolvedValue({ id: "user" }) }));
vi.mock("../../features/statistics/data/statistics-api.server", () => ({
  CalorieTrackerApiError: class extends Error {},
  getDailyStatistics: vi.fn(),
  putNutritionGoals: vi.fn(),
}));

const statistics = {
  date: "2024-02-29",
  timezone: "Europe/Amsterdam",
  totals: { caloriesKcal: "100", proteinG: "5", carbohydratesG: "10", fatG: "2" },
  goals: null,
} as const;

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Capture a redirect thrown by the statistics loader.
 *
 * @param request - The loader request.
 * @returns The redirect response.
 */
async function captureRedirect(request: Request): Promise<Response> {
  try {
    await loadStatisticsRoute({ request } as never);
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    throw error;
  }
  throw new Error("Expected the statistics loader to redirect");
}

describe("statistics route server boundary", () => {
  it("waits for timezone registration without calling the backend", async () => {
    const request = new Request("https://example.test/calorie-tracker/?date=2024-02-29");
    await expect(loadStatisticsRoute({ request } as never)).resolves.toEqual({
      timezone: null,
      routeState: null,
      statistics: null,
      loadFailed: false,
    });
    expect(getDailyStatistics).not.toHaveBeenCalled();
  });

  it("loads the current date without adding it to the URL", async () => {
    vi.mocked(getDailyStatistics).mockResolvedValue(statistics);
    const request = new Request("https://example.test/calorie-tracker/", {
      headers: { cookie: "calorie_tracker_timezone=UTC" },
    });
    const today = getTodayDate("UTC");

    await expect(loadStatisticsRoute({ request } as never)).resolves.toMatchObject({
      timezone: "UTC",
      routeState: { date: today, type: "all" },
      statistics,
      loadFailed: false,
    });
    expect(getDailyStatistics).toHaveBeenCalledWith(today, expect.objectContaining({
      cookie: "calorie_tracker_timezone=UTC",
      timezone: "UTC",
      signal: request.signal,
    }));
  });

  it("uses an app-internal path and omits the fallback date when canonicalizing an invalid date", async () => {
    const request = new Request("https://example.test/calorie-tracker/?date=invalid", {
      headers: { cookie: "calorie_tracker_timezone=UTC" },
    });

    const response = await captureRedirect(request);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/");
  });

  it("loads parsed statistics with the registered timezone", async () => {
    vi.mocked(getDailyStatistics).mockResolvedValue(statistics);
    const request = new Request("https://example.test/calorie-tracker/?date=2024-02-29", {
      headers: { cookie: "calorie_tracker_timezone=Europe%2FAmsterdam" },
    });
    await expect(loadStatisticsRoute({ request } as never)).resolves.toMatchObject({
      timezone: "Europe/Amsterdam",
      routeState: { date: "2024-02-29", type: "all" },
      statistics,
      loadFailed: false,
    });
    expect(getDailyStatistics).toHaveBeenCalledWith("2024-02-29", expect.objectContaining({
      cookie: "calorie_tracker_timezone=Europe%2FAmsterdam",
      timezone: "Europe/Amsterdam",
      signal: request.signal,
    }));
  });
});
