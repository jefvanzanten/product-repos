import { describe, expect, test } from "bun:test";
import { locationTreeNodeSchema } from "@product-repos/contracts/locations";
import { app, requestAsAdmin, requestAsUser } from "./test-app.ts";

/**
 * Send one JSON location management request as administrator.
 *
 * @param path - Location API path.
 * @param method - HTTP method.
 * @param body - Optional request object.
 * @returns Backend response.
 */
function adminJson(path: string, method: "POST" | "PATCH", body?: unknown): Promise<Response> {
  return requestAsAdmin(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/**
 * Create one location through the real route.
 *
 * @param name - Location display name.
 * @param parentId - Parent location or root.
 * @returns Strict created response node.
 */
async function createLocation(name: string, parentId: number | null) {
  const response = await adminJson("/locations", "POST", { name, parentId });
  expect(response.status).toBe(201);
  return locationTreeNodeSchema.parse(await response.json());
}

describe("Location route integration", () => {
  test("enforces active-read and administrator boundaries", async () => {
    const publicRead = await app.request("/locations");
    expect(publicRead.status).toBe(401);
    expect((await publicRead.json() as { code: string }).code).toBe("UNAUTHENTICATED");

    const userRead = await requestAsUser("/locations");
    expect(userRead.status).toBe(200);
    expect(Array.isArray(await userRead.json())).toBeTrue();

    expect((await requestAsUser("/locations?status=archived")).status).toBe(403);
    expect((await requestAsUser("/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Verboden", parentId: null }) })).status).toBe(403);
  });

  test("validates strict queries, parameters, bodies, and empty command payloads", async () => {
    expect((await requestAsAdmin("/locations?status=active")).status).toBe(400);
    expect((await requestAsAdmin("/locations?unknown=x")).status).toBe(400);
    expect((await adminJson("/locations", "POST", { name: "Extra", parentId: null, extra: true })).status).toBe(400);
    expect((await adminJson("/locations/not-a-number", "PATCH", { name: "Naam" })).status).toBe(400);
    expect((await adminJson("/locations/1/archive", "POST", {})).status).toBe(400);
  });

  test("creates normalized roots and children with sibling-scoped uniqueness", async () => {
    const suffix = crypto.randomUUID();
    const kitchen = await createLocation(`  Keuken   ${suffix}  `, null);
    const freezer = await createLocation(`Diepvries ${suffix}`, null);
    const firstDrawer = await createLocation("Lade 1", kitchen.id);
    const secondDrawer = await createLocation("Lade 1", freezer.id);
    expect(kitchen.name).toBe(`Keuken ${suffix}`);
    expect(firstDrawer.parentId).toBe(kitchen.id);
    expect(secondDrawer.parentId).toBe(freezer.id);

    const duplicate = await adminJson("/locations", "POST", { name: "  LADE   1 ", parentId: kitchen.id });
    expect(duplicate.status).toBe(409);
    expect((await duplicate.json() as { code: string }).code).toBe("LOCATION_ALREADY_EXISTS");
  });

  test("moves, archives, projects inherited status, and restores without changing child flags", async () => {
    const suffix = crypto.randomUUID();
    const root = await createLocation(`Voorraad ${suffix}`, null);
    const otherRoot = await createLocation(`Berging ${suffix}`, null);
    const child = await createLocation("Lade 2", root.id);
    const ownArchivedChild = await createLocation("Lade 10", child.id);

    const movedResponse = await adminJson(`/locations/${child.id}`, "PATCH", { name: "Lade 1", parentId: otherRoot.id });
    expect(movedResponse.status).toBe(200);
    const moved = locationTreeNodeSchema.parse(await movedResponse.json());
    expect(moved.path).toBe(`${otherRoot.name} › Lade 1`);

    expect((await adminJson(`/locations/${ownArchivedChild.id}/archive`, "POST")).status).toBe(200);
    expect((await adminJson(`/locations/${otherRoot.id}/archive`, "POST")).status).toBe(200);
    expect((await adminJson(`/locations/${otherRoot.id}/archive`, "POST")).status).toBe(200);

    const active = locationTreeNodeSchema.array().parse(await (await requestAsAdmin("/locations")).json());
    expect(active.some((node) => node.id === otherRoot.id)).toBeFalse();
    const archived = locationTreeNodeSchema.array().parse(await (await requestAsAdmin("/locations?status=archived")).json());
    const archivedRoot = archived.find((node) => node.id === otherRoot.id);
    expect(archivedRoot?.path).toBe(otherRoot.name);
    expect(archivedRoot?.children[0]?.isEffectivelyArchived).toBeTrue();

    const blockedRestore = await adminJson(`/locations/${ownArchivedChild.id}/restore`, "POST");
    expect(blockedRestore.status).toBe(409);
    expect((await blockedRestore.json() as { code: string }).code).toBe("LOCATION_ARCHIVED_BY_ANCESTOR");

    expect((await adminJson(`/locations/${otherRoot.id}/restore`, "POST")).status).toBe(200);
    const restoredActive = locationTreeNodeSchema.array().parse(await (await requestAsAdmin("/locations")).json());
    const restoredRoot = restoredActive.find((node) => node.id === otherRoot.id);
    expect(restoredRoot?.children[0]?.name).toBe("Lade 1");
    expect(restoredRoot?.children[0]?.children).toHaveLength(0);
  });
});
