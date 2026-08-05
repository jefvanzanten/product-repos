import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConsumptionLogs } from "../../api/calorie-tracker-api.server";
import { loadLogsRoute } from "./logs-route.server";

vi.mock("../../auth/auth.server", () => ({ requireUser: vi.fn().mockResolvedValue({ id: "user" }) }));
vi.mock("../../api/calorie-tracker-api.server", () => ({
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
      content: { _tag: "EmptyFilter" },
      loadFailed: false,
    });
    expect(getConsumptionLogs).toHaveBeenNthCalledWith(1, "2024-02-29", "drink", "UTC", request);
    expect(getConsumptionLogs).toHaveBeenNthCalledWith(2, "2024-02-29", "all", "UTC", request);
  });
});
