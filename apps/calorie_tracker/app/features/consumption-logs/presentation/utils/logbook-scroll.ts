const scrollPositions = new Map<string, number>();

/**
 * Read a logbook scroll position retained for the current app route lifetime.
 *
 * @param key - The key value.
 * @returns The function result.
 */
export function readLogbookScroll(key: string): number | undefined {
  return scrollPositions.get(key);
}

/**
 * Retain a logbook scroll position without persisting it across browser sessions.
 *
 * @param key - The key value.
 * @param position - The position value.
 * @returns Nothing.
 */
export function writeLogbookScroll(key: string, position: number): void {
  scrollPositions.set(key, position);
}
