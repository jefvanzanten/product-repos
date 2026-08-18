import { afterEach, describe, expect, test, vi } from "vitest";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { handleLocationsRouteAction, loadLocationsRoute } from "./locations-route.server";

const node = {
  id: 12,
  name: "Koelkast",
  parentId: null,
  path: "Koelkast",
  archivedAt: null,
  isEffectivelyArchived: false,
  children: [],
};

afterEach(() => vi.unstubAllGlobals());

/**
 * Build minimal React Router loader arguments around one request.
 *
 * @param request - Request under test.
 * @returns Loader argument object.
 */
function loaderArgs(request: Request): LoaderFunctionArgs {
  // SAFETY: these are the complete React Router loader fields consumed by the unit under test.
  return { request, params: {}, context: {} } as LoaderFunctionArgs;
}

/**
 * Build minimal React Router action arguments around one request.
 *
 * @param request - Request under test.
 * @returns Action argument object.
 */
function actionArgs(request: Request): ActionFunctionArgs {
  // SAFETY: these are the complete React Router action fields consumed by the unit under test.
  return { request, params: {}, context: {} } as ActionFunctionArgs;
}

/**
 * Create one URL-encoded action request retaining source context.
 *
 * @param fields - Submitted location action fields.
 * @returns Action request.
 */
function actionRequest(fields: Record<string, string>): Request {
  return new Request("http://admin.test/product-management-admin/locations?source=inventory", {
    method: "POST",
    headers: { cookie: "session=test", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
}

describe("locations route server contract", () => {
  test("loads active and archived trees with cookie forwarding and strict parsing", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([node]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ ...node, archivedAt: "2026-08-04T10:00:00.000Z", isEffectivelyArchived: true }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const activeRequest = new Request("http://admin.test/product-management-admin/locations?source=inventory", { headers: { cookie: "session=test" } });
    const archivedRequest = new Request("http://admin.test/product-management-admin/locations?status=archived&source=calorie-tracker", { headers: { cookie: "session=test" } });
    expect((await loadLocationsRoute(loaderArgs(activeRequest))).status).toBe("active");
    expect((await loadLocationsRoute(loaderArgs(archivedRequest))).status).toBe("archived");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:3000/locations");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://localhost:3000/locations?status=archived");
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    // SAFETY: the defined fetch mock call's second tuple member is the RequestInit supplied by the adapter.
    const firstInit = firstCall?.[1] as RequestInit;
    expect(firstInit.headers).toSatisfy((headers: Headers) => headers.get("cookie") === "session=test");
  });

  test.each([
    [{ _action: "create", name: "Keuken", parentId: "" }, "POST", "/locations", { name: "Keuken", parentId: null }],
    [{ _action: "rename", locationId: "12", name: "Koelkast 2" }, "PATCH", "/locations/12", { name: "Koelkast 2" }],
    [{ _action: "move", locationId: "12", parentId: "7" }, "PATCH", "/locations/12", { parentId: 7 }],
    [{ _action: "archive", locationId: "12" }, "POST", "/locations/12/archive", undefined],
    [{ _action: "restore", locationId: "12" }, "POST", "/locations/12/restore", undefined],
  // SAFETY: literal tuple preservation is required by Vitest's parameterized-test inference.
  ] as const)("dispatches $0 through the exact backend method and path", async (fields, method, path, body) => {
    const responseNode = path.endsWith("archive") ? { ...node, archivedAt: "2026-08-04T10:00:00.000Z", isEffectivelyArchived: true } : node;
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(responseNode), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await handleLocationsRouteAction(actionArgs(actionRequest(fields)));
    expect(result.ok).toBe(true);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`http://localhost:3000${path}`);
    // SAFETY: the preceding URL expectation establishes the fetch mock call and its RequestInit argument.
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe(method);
    expect(init.body).toBe(body === undefined ? undefined : JSON.stringify(body));
  });

  test("maps a duplicate conflict to a name error without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "LOCATION_ALREADY_EXISTS",
      message: "duplicate",
    }), { status: 409 })));
    const result = await handleLocationsRouteAction(actionArgs(actionRequest({ _action: "create", name: "Keuken", parentId: "" })));
    expect(result).toEqual({
      ok: false,
      action: "create",
      errors: { name: "Op dit niveau bestaat al een opbergplaats met deze naam." },
    });
  });
});
