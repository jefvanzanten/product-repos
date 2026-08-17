import { afterEach, describe, expect, test, vi } from "vitest";
import { requestRecipeJson } from "./recipe-backend-api.server";

const context = {
  cookie: "session=abc",
  signal: new AbortController().signal,
};

const stringSchema = {
  /** Parse a string fixture response. */
  parse(value: unknown): string {
    if (typeof value !== "string") throw new Error("Expected string");
    return value;
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Recipe backend API", () => {
  test("forwards authentication and validates successful JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify("ok"), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestRecipeJson("/recipes", "POST", { name: "Pasta" }, stringSchema, context)).resolves.toBe("ok");
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/recipes", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ name: "Pasta" }),
    }));
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
