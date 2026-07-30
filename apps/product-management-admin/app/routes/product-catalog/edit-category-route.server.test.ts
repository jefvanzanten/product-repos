import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleEditCategoryRouteAction } from "./edit-category-route.server";

/** Build a category edit request as submitted by the modal. */
function createEditRequest(categoryId: number, categoryName: string): Request {
  const form = new FormData();
  form.set("_action", "updateCategory");
  form.set("categoryId", String(categoryId));
  form.set("categoryName", categoryName);
  return new Request("http://localhost/product-catalogus/categorieen/12/bewerken?source=inventory", {
    method: "POST",
    body: form,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("category edit route action", () => {
  it("redirects immediately after one successful save", async () => {
    const backendFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      id: 12,
      name: "Nieuwe naam",
      parentId: 4,
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }));
    vi.stubGlobal("fetch", backendFetch);

    const request = createEditRequest(12, "Nieuwe naam");
    const response = await handleEditCategoryRouteAction({
      context: new RouterContextProvider(),
      params: { categoryId: "12" },
      pattern: "/product-catalogus/categorieen/:categoryId/bewerken",
      request,
      url: new URL(request.url),
    });

    expect(backendFetch).toHaveBeenCalledOnce();
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) throw new Error("Expected a redirect response");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/product-catalogus?categoryId=4&source=inventory");
  });
});
