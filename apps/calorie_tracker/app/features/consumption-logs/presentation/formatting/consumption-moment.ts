/**
 * Format an instant as an `HH:mm` value in its explicit IANA timezone.
 *
 * @param isoValue - The isoValue value.
 * @param timezone - The timezone value.
 * @returns The function result.
 */
export function formatTimeInTimezone(isoValue: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timezone,
  }).formatToParts(new Date(isoValue));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/** Date and time values rendered into consumption form controls. */
export type FormMoment = { readonly date: string; readonly time: string };

/**
 * Convert an ISO instant to date and time form fields in an explicit IANA timezone.
 *
 * @param isoValue - The isoValue value.
 * @param timezone - The timezone value.
 * @returns The function result.
 */
export function toFormMomentInTimezone(isoValue: string, timezone: string): FormMoment {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timezone,
  }).formatToParts(new Date(isoValue));
  /**
   * Read one formatted date-time field with a deterministic numeric fallback.
   *
   * @param type - Date-time field type to read.
   * @returns Formatted field value or the numeric fallback.
   */
  const value = (type: Intl.DateTimeFormatPartTypes): string => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${value("year")}-${value("month")}-${value("day")}`, time: `${value("hour")}:${value("minute")}` };
}
