/** Browser-visible origin of the isolated Calorie Tracker frontend. */
export const FRONTEND_ORIGIN = "http://localhost:35173";

/** Loopback origin of the isolated real backend. */
export const BACKEND_ORIGIN = "http://localhost:33000";

/** Loopback origin of the E2E-only SQLite control boundary. */
export const FIXTURE_ORIGIN = "http://localhost:33101";

/** Public path at which the Calorie Tracker is mounted. */
export const APP_BASE_URL = `${FRONTEND_ORIGIN}/calorie-tracker`;

/** Anonymous deterministic credentials used for the first isolated test user. */
export const USER_A = {
  email: "calorie-e2e-a@example.test",
  password: "anonymous-test-password",
} as const;

/** Anonymous deterministic credentials used for the second isolated test user. */
export const USER_B = {
  email: "calorie-e2e-b@example.test",
  password: "anonymous-test-password",
} as const;

/** Stable catalog identifiers in the temporary E2E database. */
export const CATALOG = {
  foodProductId: "aaaaaaaa-0001-4000-8000-000000000001",
  drinkProductId: "aaaaaaaa-0002-4000-8000-000000000002",
  supplementProductId: "aaaaaaaa-0003-4000-8000-000000000003",
  archivedProductId: "aaaaaaaa-0004-4000-8000-000000000004",
  privateProductId: "aaaaaaaa-0005-4000-8000-000000000005",
} as const;

/** Stable consumption-log identifiers in the temporary E2E database. */
export const LOGS = {
  earlyFood: "11111111-1111-4111-8111-111111111111",
  lateDrink: "22222222-2222-4222-8222-222222222222",
  supplement: "33333333-3333-4333-8333-333333333333",
  archived: "44444444-4444-4444-8444-444444444444",
  otherUser: "55555555-5555-4555-8555-555555555555",
  idempotent: "66666666-6666-4666-8666-666666666666",
} as const;

/** Return an ISO calendar date shifted by a whole number of UTC days. */
export function shiftDate(date: string, days: number): string {
  const instant = new Date(`${date}T12:00:00.000Z`);
  instant.setUTCDate(instant.getUTCDate() + days);
  return instant.toISOString().slice(0, 10);
}

/** Return today's ISO date in the deterministic browser timezone. */
export function currentAmsterdamDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  /** Read one named date-time part without relying on array positions. */
  function readPart(type: Intl.DateTimeFormatPartTypes): string {
    for (const candidate of parts) {
      if (candidate.type === type) return candidate.value;
    }
    return "00";
  }
  return `${readPart("year")}-${readPart("month")}-${readPart("day")}`;
}
