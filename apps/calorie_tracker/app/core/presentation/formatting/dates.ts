/** Format a valid local date for Dutch presentation. */
export function formatLocalDate(dateValue: string, format: "long" | "compact" = "long"): string {
  const [yearText, monthText, dayText] = dateValue.split("-");
  if (yearText === undefined || monthText === undefined || dayText === undefined) return dateValue;
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
  return new Intl.DateTimeFormat("nl-NL", format === "long"
    ? { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }
    : { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
