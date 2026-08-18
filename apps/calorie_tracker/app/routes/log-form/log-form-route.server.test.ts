import type { ActionFunctionArgs } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { requireUser } from "../../core/presentation/auth/auth.server";
import { createConsumptionLog, getConsumptionLog, getUnifiedSearch, updateConsumptionLog } from "../../features/consumption-logs/data/consumption-log-api.server";
import { handleNewLogRouteAction } from "./log-form-route.server";

/** Build action arguments consumed by the route. */
function actionArgs(request: Request): ActionFunctionArgs {
  // SAFETY: the route under test consumes request and params from React Router's action argument contract.
  return { request, params: {}, context: {} } as ActionFunctionArgs;
}

/** Build route dependencies around one create-log fake. */
function dependencies(createLog: typeof createConsumptionLog) {
  return {
    requireUser: vi.fn<typeof requireUser>().mockResolvedValue({ id: "user", email: "user@example.test", name: "User", role: "user" }),
    createConsumptionLog: createLog,
    getConsumptionLog: vi.fn<typeof getConsumptionLog>(),
    getUnifiedSearch: vi.fn<typeof getUnifiedSearch>(),
    updateConsumptionLog: vi.fn<typeof updateConsumptionLog>(),
  };
}

/** Build a timezone-registered action request for one serialized payload. */
function requestFor<Payload>(payload: Payload): Request {
  const formData = new FormData();
  formData.set("payload", JSON.stringify(payload));
  return new Request("https://example.test/calorie-tracker/logs/new", {
    method: "POST",
    headers: { cookie: "calorie_tracker_timezone=Europe%2FAmsterdam" },
    body: formData,
  });
}

describe("log form route server boundary", () => {
  it.each([
    {
      id: "20000000-0000-4000-8000-000000000001",
      type: "PRODUCT",
      productId: "40000000-0000-4000-8000-000000000001",
      quantity: "1",
      inputMode: "FULL_PRODUCT",
      inputUnitTypeId: null,
      consumedAt: "2024-02-29T08:00:00.000Z",
    },
    {
      id: "20000000-0000-4000-8000-000000000002",
      type: "DISH",
      dishId: "30000000-0000-4000-8000-000000000001",
      quantity: "1.5",
      consumedAt: "2024-02-29T08:00:00.000Z",
    },
  ])("validates and dispatches a $type create command", async (payload) => {
    const created = { id: payload.id, localDate: "2024-02-29" };
    const createLog = vi.fn<typeof createConsumptionLog>();
    // SAFETY: this focused action test observes only the id and localDate returned by the API dependency.
    createLog.mockResolvedValue(created as never);
    const request = requestFor(payload);

    await expect(handleNewLogRouteAction(actionArgs(request), dependencies(createLog))).resolves.toEqual({ ok: true, log: created });
    expect(createLog).toHaveBeenCalledWith(payload, expect.objectContaining({ cookie: "calorie_tracker_timezone=Europe%2FAmsterdam", timezone: "Europe/Amsterdam", signal: request.signal }));
  });

  it.each([
    { id: "20000000-0000-4000-8000-000000000003", productId: "40000000-0000-4000-8000-000000000001", quantity: "1", inputMode: "FULL_PRODUCT", inputUnitTypeId: null, consumedAt: "2024-02-29T08:00:00.000Z" },
    { quantity: "invalid" },
  ])("rejects malformed route payloads before calling the backend", async (payload) => {
    const createLog = vi.fn<typeof createConsumptionLog>();
    const request = requestFor(payload);
    await expect(handleNewLogRouteAction(actionArgs(request), dependencies(createLog))).resolves.toEqual({ ok: false, error: "Controleer de ingevulde gegevens." });
    expect(createLog).not.toHaveBeenCalled();
  });
});
