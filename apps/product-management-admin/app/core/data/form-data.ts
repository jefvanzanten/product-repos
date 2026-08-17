/**
 * Read a text form field without accepting uploaded files.
 *
 * @param form - Submitted form data.
 * @param key - Field name.
 * @returns Submitted text or an empty validation sentinel.
 */
export function readFormText(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Normalize an individual form entry to text without object stringification.
 *
 * @param value - Untrusted form entry.
 * @returns Submitted text or an empty validation sentinel.
 */
export function readFormEntryText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
