import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConsumptionLog } from "../../features/consumption-logs/data/consumption-log-api.server";
import { handleNewLogRouteAction } from "./log-form-route.server";

vi.mock("../../core/presentation/auth/auth.server", () => ({ requireUser: vi.fn().mockResolvedValue({ id: "user" }) }));
vi.mock("../../features/consumption-logs/data/consumption-log-api.server", () => ({
  CalorieTrackerApiError: class extends Error {},
  createConsumptionLog: vi.fn(),
  getConsumptionLog: vi.fn(),
  getUnifiedSearch: vi.fn(),
  updateConsumptionLog: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("log form route server boundary", () => {
  it("validates and dispatches a product create command", async () => {
    const payload = {
      id: "20000000-0000-4000-8000-000000000001",
      type: "PRODUCT",
      productId: "40000000-0000-4000-8000-000000000001",
      quantity: "1",
      inputMode: "FULL_PRODUCT",
      inputUnitTypeId: null,
      consumedAt: "2024-02-29T08:00:00.000Z",
    };
    const created = { id: payload.id, localDate: "2024-02-29" };
    vi.mocked(createConsumptionLog).mockResolvedValue(created as never);
    const formData = new FormData();
    formData.set("payload", JSON.stringify(payload));
    const request = new Request("https://example.test/calorie-tracker/logs/new", {
      method: "POST",
      headers: { cookie: "calorie_tracker_timezone=Europe%2FAmsterdam" },
      body: formData,
    });

    await expect(handleNewLogRouteAction({ request, params: {} } as never)).resolves.toEqual({ ok: true, log: created });
    expect(createConsumptionLog).toHaveBeenCalledWith(payload, expect.objectContaining({
      cookie: "calorie_tracker_timezone=Europe%2FAmsterdam",
      timezone: "Europe/Amsterdam",
      signal: request.signal,
    }));
  });

  it("validates and dispatches a dish create command", async () => {
    const payload = {
      id: "20000000-0000-4000-8000-000000000002",
      type: "DISH",
      dishId: "30000000-0000-4000-8000-000000000001",
      quantity: "1.5",
      consumedAt: "2024-02-29T08:00:00.000Z",
    };
    const created = { id: payload.id, localDate: "2024-02-29" };
    vi.mocked(createConsumptionLog).mockResolvedValue(created as never);
    const formData = new FormData();
    formData.set("payload", JSON.stringify(payload));
    const request = new Request("https://example.test/calorie-tracker/logs/new", {
      method: "POST",
      headers: { cookie: "calorie_tracker_timezone=Europe%2FAmsterdam" },
      body: formData,
    });

    await expect(handleNewLogRouteAction({ request, params: {} } as never)).resolves.toEqual({ ok: true, log: created });
    expect(createConsumptionLog).toHaveBeenCalledWith(payload, expect.objectContaining({
      cookie: "calorie_tracker_timezone=Europe%2FAmsterdam",
      timezone: "Europe/Amsterdam",
      signal: request.signal,
    }));
  });

  it("rejects payloads without a log type before calling the backend", async () => {
    const payload = {
      id: "20000000-0000-4000-8000-000000000003",
      productId: "40000000-0000-4000-8000-000000000001",
      quantity: "1",
      inputMode: "FULL_PRODUCT",
      inputUnitTypeId: null,
      consumedAt: "2024-02-29T08:00:00.000Z",
    };
    const formData = new FormData();
    formData.set("payload", JSON.stringify(payload));
    const request = new Request("https://example.test/calorie-tracker/logs/new", {
      method: "POST",
      headers: { cookie: "calorie_tracker_timezone=UTC" },
      body: formData,
    });

    await expect(handleNewLogRouteAction({ request, params: {} } as never)).resolves.toEqual({
      ok: false,
      error: "Controleer de ingevulde gegevens.",
    });
    expect(createConsumptionLog).not.toHaveBeenCalled();
  });

  it("rejects malformed route payloads before calling the backend", async () => {
    const formData = new FormData();
    formData.set("payload", JSON.stringify({ quantity: "invalid" }));
    const request = new Request("https://example.test/calorie-tracker/logs/new", {
      method: "POST",
      headers: { cookie: "calorie_tracker_timezone=UTC" },
      body: formData,
    });

    await expect(handleNewLogRouteAction({ request, params: {} } as never)).resolves.toEqual({
      ok: false,
      error: "Controleer de ingevulde gegevens.",
    });
    expect(createConsumptionLog).not.toHaveBeenCalled();
  });
});
