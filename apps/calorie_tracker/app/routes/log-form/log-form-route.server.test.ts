import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConsumptionLog } from "../../api/calorie-tracker-api.server";
import { handleNewLogRouteAction } from "./log-form-route.server";

vi.mock("../../auth/auth.server", () => ({ requireUser: vi.fn().mockResolvedValue({ id: "user" }) }));
vi.mock("../../api/calorie-tracker-api.server", () => ({
  CalorieTrackerApiError: class extends Error {},
  createConsumptionLog: vi.fn(),
  getConsumptionLog: vi.fn(),
  getLoggablePackages: vi.fn(),
  updateConsumptionLog: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("log form route server boundary", () => {
  it("validates and dispatches a create command", async () => {
    const payload = {
      id: "20000000-0000-4000-8000-000000000001",
      packageId: 1,
      quantity: "1",
      inputMode: "PACKAGE",
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
    expect(createConsumptionLog).toHaveBeenCalledWith(payload, "Europe/Amsterdam", request);
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
