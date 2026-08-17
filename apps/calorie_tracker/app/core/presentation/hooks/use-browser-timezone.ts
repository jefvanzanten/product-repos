import { useSyncExternalStore } from "react";
import { getBrowserTimezone } from "../browser-timezone";

/**
 * Subscribe to the effectively immutable browser timezone snapshot.
 *
 * @returns The function result.
 */
function subscribeToBrowserTimezone(): () => void {
  return () => undefined;
}

/**
 * Return the browser timezone snapshot used after hydration.
 *
 * @returns The function result.
 */
function getBrowserTimezoneSnapshot(): string {
  return getBrowserTimezone();
}

/**
 * Return the deterministic timezone snapshot used by the server and during hydration.
 *
 * @returns The function result.
 */
function getServerTimezoneSnapshot(): null {
  return null;
}

/**
 * Resolve the browser timezone through React's hydration-safe external-store API.
 *
 * @returns The function result.
 */
export function useBrowserTimezone(): string | null {
  return useSyncExternalStore(
    subscribeToBrowserTimezone,
    getBrowserTimezoneSnapshot,
    getServerTimezoneSnapshot,
  );
}
