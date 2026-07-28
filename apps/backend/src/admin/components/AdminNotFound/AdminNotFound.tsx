import { cssModule } from "../../css-modules";

const styles = cssModule("AdminNotFound", ["emptyState", "button"] as const);

/** Render a consistent admin not-found state. */
export function AdminNotFound(props: {
  readonly message: string;
  readonly backHref: string;
  readonly backLabel: string;
}) {
  return (
    <div class={styles.emptyState}>
      <p>{props.message}</p>
      <a class={styles.button} href={props.backHref}>
        {props.backLabel}
      </a>
    </div>
  );
}
