import { lookupSession } from "@product-repos/auth-client/session.server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireUser } from "./auth.server";

vi.mock("@product-repos/auth-client/session.server", () => ({
  lookupSession: vi.fn(),
}));

const mockedLookupSession = vi.mocked(lookupSession);

/** Read the redirect response thrown by the protected server loader helper. */
async function readRedirect(requestUrl: string): Promise<Response> {
  try {
    await requireUser(new Request(requestUrl));
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    throw error;
  }
  throw new Error("Expected requireUser to redirect");
}

describe("Calorie Tracker server-side login return path", () => {
  beforeEach(() => {
    mockedLookupSession.mockResolvedValue({ _tag: "Unauthenticated" });
  });

  it("retains a protected deep link and canonical query parameters", async () => {
    const response = await readRedirect("https://apps.example.test/calorie-tracker/logs/10000000-0000-4000-8000-000000000001/edit?date=2026-07-29&type=food");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login?returnTo=%2Flogs%2F10000000-0000-4000-8000-000000000001%2Fedit%3Fdate%3D2026-07-29%26type%3Dfood");
  });

  it("falls back to the dashboard for a request outside the deployment basename", async () => {
    const response = await readRedirect("https://apps.example.test/inventory/items");
    expect(response.headers.get("Location")).toBe("/login");
  });
});
