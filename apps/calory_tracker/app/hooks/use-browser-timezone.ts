import { useEffect, useState } from "react";
import { getBrowserTimezone } from "../domain/dates-and-timezones";

/** Resolve the browser timezone only after hydration so server and client markup stay identical. */
export function useBrowserTimezone(): string | null {
  const [timezone, setTimezone] = useState<string | null>(null);
  useEffect(() => setTimezone(getBrowserTimezone()), []);
  return timezone;
}
