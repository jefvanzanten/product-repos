import type { LoaderFunctionArgs } from "react-router";
import { describe, expect, it } from "vitest";
import { loader as redirectLegacyEdit } from "../log-edit/legacy-edit-log-redirect";
import { loader as redirectLegacyNew } from "./legacy-new-log-redirect";

/** Capture a React Router redirect response thrown by a compatibility loader. */
function captureRedirect(callback: () => never): Response {
  try {
    callback();
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    throw error;
  }
}

describe("legacy Calorie Tracker route redirects", () => {
  it("preserves create-route query parameters in a permanent redirect", () => {
    const response = captureRedirect(() => redirectLegacyNew({
      request: new Request("https://apps.example.test/calorie-tracker/logs/nieuw?date=2026-07-29&type=drink"),
      params: {},
    } as unknown as LoaderFunctionArgs));
    expect(response.status).toBe(308);
    expect(response.headers.get("Location")).toBe("/logs/new?date=2026-07-29&type=drink");
  });

  it("preserves edit-route context in a permanent redirect", () => {
    const response = captureRedirect(() => redirectLegacyEdit({
      request: new Request("https://apps.example.test/calorie-tracker/logs/10000000-0000-4000-8000-000000000001/bewerken?date=2026-07-29&type=food"),
      params: { logId: "10000000-0000-4000-8000-000000000001" },
    } as unknown as LoaderFunctionArgs));
    expect(response.status).toBe(308);
    expect(response.headers.get("Location")).toBe("/logs/10000000-0000-4000-8000-000000000001/edit?date=2026-07-29&type=food");
  });
});
