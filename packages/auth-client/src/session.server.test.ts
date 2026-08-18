import { describe, expect, it } from "vitest";
import { lookupSession } from "./session.server";

const request = new Request("https://apps.example.test/inventory", {
  headers: { cookie: "session=test" },
});

/** Build a deterministic fetch implementation returning one response. */
function returning(response: Response): typeof fetch {
  return () => Promise.resolve(response);
}

describe("session response parser", () => {
  it("returns the minimum valid Better Auth session projection", async () => {
    const result = await lookupSession(request, {
      fetch: returning(Response.json({
        user: { id: "user-1", email: "user@example.test", name: "User", role: "admin", ignored: true },
        session: { ignored: true },
      })),
    });
    expect(result).toEqual({
      tag: "Authenticated",
      session: { user: { id: "user-1", email: "user@example.test", name: "User", role: "admin" } },
    });
  });

  it("classifies a null response as unauthenticated", async () => {
    await expect(lookupSession(request, { fetch: returning(Response.json(null)) }))
      .resolves.toEqual({ tag: "Unauthenticated" });
  });

  it("classifies a malformed successful response as unavailable", async () => {
    await expect(lookupSession(request, { fetch: returning(Response.json({ user: { id: 42 } })) }))
      .resolves.toEqual({ tag: "Unavailable", status: 502 });
  });
});
