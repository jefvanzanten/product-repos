import { z } from "zod/v4";

const formTextSchema = z.string().catch("");

/** Read a text form field without accepting uploaded files. */
export function readFormText(form: FormData, key: string): string {
  return formTextSchema.parse(form.get(key));
}

/** Normalize an individual form entry to text without object stringification. */
export function readFormEntryText(value: FormDataEntryValue | null): string {
  return formTextSchema.parse(value);
}
