/** Health capabilities needed by readiness routes. */
export type HealthService = {
  readonly assertDatabaseReady: () => void;
};

/** Create health use cases from an injected technical database probe. */
export function createHealthService(assertDatabaseReady: () => void): HealthService {
  return { assertDatabaseReady };
}
