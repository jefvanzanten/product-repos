import { describe, expect, it } from "vitest";
import { parseCalorieTrackerReturnPath } from "./public-paths";

describe("Calorie Tracker post-login return paths", () => {
  it("retains supported list, create, detail, and edit destinations", () => {
    const id = "10000000-0000-4000-8000-000000000001";
    expect(parseCalorieTrackerReturnPath("/logs?date=2026-07-29&type=drink")).toBe("/logs?date=2026-07-29&type=drink");
    expect(parseCalorieTrackerReturnPath("/logs/new?date=2026-07-29&type=all")).toBe("/logs/new?date=2026-07-29&type=all");
    expect(parseCalorieTrackerReturnPath(`/logs/${id}?date=2026-07-29&type=food`)).toContain(id);
    expect(parseCalorieTrackerReturnPath(`/logs/${id}/edit?date=2026-07-29&type=food`)).toContain("/edit?");
  });

  it("rejects protocol-relative and unsupported destinations", () => {
    expect(parseCalorieTrackerReturnPath("//malicious.example/path")).toBe("/");
    expect(parseCalorieTrackerReturnPath("https://malicious.example/path")).toBe("/");
    expect(parseCalorieTrackerReturnPath("/login")).toBe("/");
  });
});
