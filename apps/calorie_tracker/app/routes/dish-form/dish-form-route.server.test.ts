import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalorieTrackerApiError, createDish } from "../../api/calorie-tracker-api.server";
import { handleNewDishRouteAction } from "./dish-form-route.server";

vi.mock("../../auth/auth.server", () => ({ requireUser: vi.fn().mockResolvedValue({ id: "user" }) }));
vi.mock("../../api/calorie-tracker-api.server", () => ({
  CalorieTrackerApiError: class extends Error {
    readonly status: number;
    readonly response: { readonly code: string; readonly message: string } | null;
    constructor(status: number, response: { readonly code: string; readonly message: string } | null) {
      super(response?.message ?? "error");
      this.status = status;
      this.response = response;
    }
  },
  createDish: vi.fn(),
  getLoggablePackages: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/** Build a valid dish creation payload for tests. */
function validDishPayload() {
  return {
    name: "Spaghetti bolognese",
    imageUrl: null,
    servings: "4",
    ingredients: [
      { packageId: 1, quantity: "500", inputMode: "CONTENT_UNIT", inputUnitTypeId: 2 },
      { packageId: 3, quantity: "1", inputMode: "PACKAGE", inputUnitTypeId: null },
    ],
  };
}

/** Build a route request carrying one JSON payload and a registered timezone. */
function createRequest(payload: unknown): Request {
  const formData = new FormData();
  formData.set("payload", JSON.stringify(payload));
  return new Request("https://example.test/calorie-tracker/logs/new/dish", {
    method: "POST",
    headers: { cookie: "calorie_tracker_timezone=Europe%2FAmsterdam" },
    body: formData,
  });
}

describe("dish form route server boundary", () => {
  it("validates and dispatches a dish create command", async () => {
    const payload = validDishPayload();
    const dish = { id: "30000000-0000-4000-8000-000000000001", name: payload.name };
    vi.mocked(createDish).mockResolvedValue(dish as never);

    await expect(handleNewDishRouteAction({ request: createRequest(payload), params: {} } as never)).resolves.toEqual({ ok: true, dish });
    expect(createDish).toHaveBeenCalledWith(payload, "Europe/Amsterdam", expect.anything());
  });

  it("rejects dishes without ingredients before calling the backend", async () => {
    const payload = { ...validDishPayload(), ingredients: [] };

    await expect(handleNewDishRouteAction({ request: createRequest(payload), params: {} } as never)).resolves.toEqual({
      ok: false,
      error: "Controleer de ingevulde gegevens.",
    });
    expect(createDish).not.toHaveBeenCalled();
  });

  it("rejects zero servings before calling the backend", async () => {
    const payload = { ...validDishPayload(), servings: "0" };

    await expect(handleNewDishRouteAction({ request: createRequest(payload), params: {} } as never)).resolves.toEqual({
      ok: false,
      error: "Controleer de ingevulde gegevens.",
    });
    expect(createDish).not.toHaveBeenCalled();
  });

  it("maps duplicate dish names to a Dutch inline error", async () => {
    vi.mocked(createDish).mockRejectedValue(new CalorieTrackerApiError(409, { code: "DISH_ALREADY_EXISTS", message: "A dish with this name already exists" }));

    await expect(handleNewDishRouteAction({ request: createRequest(validDishPayload()), params: {} } as never)).resolves.toEqual({
      ok: false,
      error: "Er bestaat al een gerecht met deze naam.",
    });
  });
});
