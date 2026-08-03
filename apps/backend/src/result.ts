/** Result of an operation with an explicit expected error value. */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Construct a successful result. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Construct a failed result. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
