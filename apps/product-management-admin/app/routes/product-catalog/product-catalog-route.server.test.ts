import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleProductCatalogRouteAction } from "./product-catalog-route.server";

/** Build a category-delete request as submitted by the category action menu. */
function createDeleteRequest(categoryId: number, parentId: number | null): Request {
  const form = new FormData();
  form.set("_action", "deleteCategory");
  form.set("categoryId", String(categoryId));
  form.set("parentId", parentId === null ? "" : String(parentId));
  return new Request("http://localhost/product-catalogus?categoryId=12&source=inventory", {
    method: "POST",
    body: form,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("product catalog route action", () => {
  it("deletes a category and redirects to its parent", async () => {
    const backendFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", backendFetch);

    const request = createDeleteRequest(12, 4);
    const response = await handleProductCatalogRouteAction({
      context: new RouterContextProvider(),
      params: {},
      pattern: "/product-catalogus",
      request,
      url: new URL(request.url),
    });

    expect(backendFetch).toHaveBeenCalledOnce();
    expect(backendFetch).toHaveBeenCalledWith("http://localhost:3000/categories/12", expect.objectContaining({ method: "DELETE" }));
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) throw new Error("Expected a redirect response");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/product-catalogus?categoryId=4&source=inventory");
  });
});
