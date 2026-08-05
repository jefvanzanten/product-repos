import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDailyStatistics } from "../../api/calorie-tracker-api.server";
import { loadStatisticsRoute } from "./statistics-route.server";

vi.mock("../../auth/auth.server", () => ({ requireUser: vi.fn().mockResolvedValue({ id: "user" }) }));
vi.mock("../../api/calorie-tracker-api.server", () => ({
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
    expect(getDailyStatistics).toHaveBeenCalledWith("2024-02-29", "Europe/Amsterdam", request);
  });
});
