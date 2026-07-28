import { cssModule } from "../../css-modules";

const styles = cssModule("FieldError", ["fieldError"] as const);

/** Render a field-level error message when one exists. */
export function FieldError(props: { readonly error: string | undefined }) {
  if (props.error === undefined) return null;
  return <p class={styles.fieldError} role="alert">{props.error}</p>;
}
