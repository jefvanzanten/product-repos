import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleProductCatalogRouteAction, loadProductCatalogRoute } from "./product-catalog-route.server";

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

describe("product catalog route loader", () => {
  it.each([
    ["search", "q=tomaat", "query=tomaat"],
    ["category", "categoryId=12", "categoryId=12"],
    ["brand", "brandId=00000000-0000-4000-8000-000000000001", "brandId=00000000-0000-4000-8000-000000000001"],
    ["archive", "archived=true", "archived=true"],
  ])("forwards the %s filter to the flat concrete-product endpoint", async (_name, pageQuery, expectedProductQuery) => {
    const backendFetch = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.includes("/categories")) return Response.json([]);
      if (url.includes("/brands")) return Response.json([]);
      if (url.includes("/products")) return Response.json({ items: [], cursor: null, hasMore: false });
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", backendFetch);
    const request = new Request(`http://localhost/product-catalogus?${pageQuery}`);

    await loadProductCatalogRoute({ context: new RouterContextProvider(), params: {}, pattern: "/product-catalogus", request, url: new URL(request.url) });

    const productRequest = backendFetch.mock.calls.find(([input]) => String(input).includes("/products"));
    expect(productRequest).toBeDefined();
    expect(String(productRequest?.[0])).toContain(expectedProductQuery);
  });

  it("projects a concrete product into the established third-level category browse state", async () => {
    const categories = [
      { id: 1, name: "Voeding", parentId: null },
      { id: 2, name: "Conserven", parentId: 1 },
      { id: 3, name: "Tomatenpuree", parentId: 2 },
    ];
    const productId = "00000000-0000-4000-8000-000000000010";
    const backendFetch = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.includes("/categories")) return Response.json(categories);
      if (url.includes("/brands")) return Response.json([{ id: "00000000-0000-4000-8000-000000000001", name: "Heinz" }]);
      if (url.includes("/products")) return Response.json({
        items: [{ productId, productCompositionId: "00000000-0000-4000-8000-000000000020", displayName: "Heinz Tomatenpuree — blik 200 g", compositionName: "Tomatenpuree", brandName: "Heinz", categoryPath: "Voeding > Conserven > Tomatenpuree", consumptionType: "FOOD", packageSummary: "blik 200 g", imageUrl: "http://localhost:3000/package-images/product.webp", barcode: null, archivedAt: null }],
        cursor: null,
        hasMore: false,
      });
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", backendFetch);
    const request = new Request("http://localhost/product-catalogus?categoryId=3");

    const result = await loadProductCatalogRoute({ context: new RouterContextProvider(), params: {}, pattern: "/product-catalogus", request, url: new URL(request.url) });

    expect(result.mode).toBe("browse");
    expect(result.browse?.state).toBe("category");
    if (result.browse?.state !== "category") throw new Error("Expected a category browse response");
    expect(result.browse.categoryPath.map((category) => category.id)).toEqual([1, 2, 3]);
    expect(result.browse.products.items[0]).toMatchObject({ id: productId, packageSummary: "blik 200 g", imageUrl: "http://localhost:3000/package-images/product.webp" });
  });
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
