import { describe, expect, it } from "vitest";
import { classifyHttpErrorResponse } from "./calorie-tracker-api";

describe("Calorie Tracker error response classification", () => {
  it("classifies an unauthenticated response as an expired browser session", () => {
    expect(classifyHttpErrorResponse(401, {
      code: "UNAUTHENTICATED",
      message: "Authentication is required",
    })).toEqual({
      _tag: "Failure",
      error: { _tag: "SessionExpired" },
    });
  });

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

  it("does not classify a temporary authentication outage as session expiry", () => {
    expect(classifyHttpErrorResponse(503, {
      code: "AUTH_UNAVAILABLE",
      message: "Authentication is temporarily unavailable",
    })).toEqual({
      _tag: "Failure",
      error: {
        _tag: "HttpFailure",
        status: 503,
        response: {
          code: "AUTH_UNAVAILABLE",
          message: "Authentication is temporarily unavailable",
        },
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
