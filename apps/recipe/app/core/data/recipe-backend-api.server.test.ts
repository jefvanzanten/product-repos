import { z } from "zod";
import { afterEach, describe, expect, test, vi } from "vitest";
import { requestRecipeJson } from "./recipe-backend-api.server";

const context = {
  cookie: "session=abc",
  signal: new AbortController().signal,
};

const stringSchema = z.string();

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Recipe backend API", () => {
  test("forwards authentication and validates successful JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify("ok"), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const body = {
      name: "Pasta",
      servings: "1",
      ingredients: [{ productId: "product-1", quantity: "1", inputMode: "FULL_PRODUCT" }],
    };
    await expect(requestRecipeJson("/recipes", "POST", body, stringSchema, context)).resolves.toBe("ok");
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/recipes", expect.objectContaining({
      method: "POST",
      body: JSON.stringify(body),
    }));
    // SAFETY: the assertion follows the fetch call expectation above, whose second argument is RequestInit.
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(options.headers).get("cookie")).toBe("session=abc");
  });

  test("normalizes backend failures and validates field errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "INVALID_RECIPE",
      message: "Controleer het recept.",
      fields: { name: "Naam ontbreekt." },
    }), { status: 422 })));

    const promise = requestRecipeJson("/recipes", "GET", undefined, stringSchema, context);
    await expect(promise).rejects.toMatchObject({
      status: 422,
      code: "INVALID_RECIPE",
      fields: { name: "Naam ontbreekt." },
    });
  });
});
