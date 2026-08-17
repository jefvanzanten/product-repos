import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConsumptionLogs } from "../../features/consumption-logs/data/consumption-log-api.server";
import { loadLogsRoute } from "./logs-route.server";

vi.mock("../../core/presentation/auth/auth.server", () => ({ requireUser: vi.fn().mockResolvedValue({ id: "user" }) }));
vi.mock("../../features/consumption-logs/data/consumption-log-api.server", () => ({
  CalorieTrackerApiError: class extends Error {},
  getConsumptionLogs: vi.fn(),
  restoreConsumptionLog: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("logbook route server boundary", () => {
  it("distinguishes an empty filter from an empty date", async () => {
    vi.mocked(getConsumptionLogs)
      .mockResolvedValueOnce({ date: "2024-02-29", timezone: "UTC", type: "drink", items: [] })
      .mockResolvedValueOnce({ date: "2024-02-29", timezone: "UTC", type: "all", items: [{ id: "existing" }] } as never);
    const request = new Request("https://example.test/calorie-tracker/logs?date=2024-02-29&type=drink", {
      headers: { cookie: "calorie_tracker_timezone=UTC" },
    });

    await expect(loadLogsRoute({ request } as never)).resolves.toMatchObject({
      routeState: { date: "2024-02-29", type: "drink" },
      content: { tag: "EmptyFilter" },
      loadFailed: false,
    });
    const context = {
      cookie: "calorie_tracker_timezone=UTC",
      timezone: "UTC",
      signal: request.signal,
    };
    expect(getConsumptionLogs).toHaveBeenNthCalledWith(1, "2024-02-29", "drink", context);
    expect(getConsumptionLogs).toHaveBeenNthCalledWith(2, "2024-02-29", "all", context);
  });
});
