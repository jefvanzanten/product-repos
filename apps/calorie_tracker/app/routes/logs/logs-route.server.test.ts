import type { LoaderFunctionArgs } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { getConsumptionLogs, restoreConsumptionLog } from "../../features/consumption-logs/data/consumption-log-api.server";
import { requireUser } from "../../core/presentation/auth/auth.server";
import { loadLogsRoute } from "./logs-route.server";

/** Build the loader arguments consumed by the route unit. */
function loaderArgs(request: Request): LoaderFunctionArgs {
  // SAFETY: the route under test consumes only request from React Router's loader argument contract.
  return { request, params: {}, context: {} } as LoaderFunctionArgs;
}

describe("logbook route server boundary", () => {
  it("distinguishes an empty filter from an empty date", async () => {
    const getLogs = vi.fn<typeof getConsumptionLogs>()
      .mockResolvedValueOnce({ date: "2024-02-29", timezone: "UTC", type: "drink", items: [] });
    // SAFETY: this focused route test only observes that the unfiltered list is non-empty.
    getLogs.mockResolvedValueOnce({ date: "2024-02-29", timezone: "UTC", type: "all", items: [{ id: "existing" }] } as never);
    const dependencies = {
      requireUser: vi.fn<typeof requireUser>().mockResolvedValue({ id: "user", email: "user@example.test", name: "User", role: "user" }),
      getConsumptionLogs: getLogs,
      restoreConsumptionLog: vi.fn<typeof restoreConsumptionLog>(),
    };
    const request = new Request("https://example.test/calorie-tracker/logs?date=2024-02-29&type=drink", {
      headers: { cookie: "calorie_tracker_timezone=UTC" },
    });

    await expect(loadLogsRoute(loaderArgs(request), dependencies)).resolves.toMatchObject({
      routeState: { date: "2024-02-29", type: "drink" },
      content: { tag: "EmptyFilter" },
      loadFailed: false,
    });
    const context = { cookie: "calorie_tracker_timezone=UTC", timezone: "UTC", signal: request.signal };
    expect(getLogs).toHaveBeenNthCalledWith(1, "2024-02-29", "drink", context);
    expect(getLogs).toHaveBeenNthCalledWith(2, "2024-02-29", "all", context);
  });
});
