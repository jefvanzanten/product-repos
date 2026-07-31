import { describe, expect, it } from "vitest";
import { classifyHttpErrorResponse } from "./calorie-tracker-api";

describe("Calorie Tracker error response classification", () => {
  it("retains a strict documented HTTP error", () => {
    expect(classifyHttpErrorResponse(409, { code: "LOG_CREATE_CONFLICT", message: "Conflict" })).toEqual({
      _tag: "Failure",
      error: {
        _tag: "HttpFailure",
        status: 409,
        response: { code: "LOG_CREATE_CONFLICT", message: "Conflict" },
      },
    });
  });

  it("classifies malformed HTTP error bodies as invalid responses", () => {
    expect(classifyHttpErrorResponse(500, { error: { message: "raw database failure" } })).toMatchObject({
      _tag: "Failure",
      error: { _tag: "InvalidResponse" },
    });
  });
});
