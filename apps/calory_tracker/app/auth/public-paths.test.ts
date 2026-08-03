import { describe, expect, it } from "vitest";
import { parseCaloryTrackerReturnPath } from "./public-paths";

describe("Calorie Tracker post-login return paths", () => {
  it("retains supported list, create, detail, and edit destinations", () => {
    const id = "10000000-0000-4000-8000-000000000001";
    expect(parseCaloryTrackerReturnPath("/logs?date=2026-07-29&type=drink")).toBe("/logs?date=2026-07-29&type=drink");
    expect(parseCaloryTrackerReturnPath("/logs/new?date=2026-07-29&type=all")).toBe("/logs/new?date=2026-07-29&type=all");
    expect(parseCaloryTrackerReturnPath(`/logs/${id}?date=2026-07-29&type=food`)).toContain(id);
    expect(parseCaloryTrackerReturnPath(`/logs/${id}/edit?date=2026-07-29&type=food`)).toContain("/edit?");
  });

  it("rejects protocol-relative and unsupported destinations", () => {
    expect(parseCaloryTrackerReturnPath("//malicious.example/path")).toBe("/");
    expect(parseCaloryTrackerReturnPath("https://malicious.example/path")).toBe("/");
    expect(parseCaloryTrackerReturnPath("/login")).toBe("/");
  });
});
