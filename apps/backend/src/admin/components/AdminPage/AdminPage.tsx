import type { Child } from "hono/jsx";
import { cssModule } from "../../css-modules";
import { AdminLayout } from "../AdminLayout/AdminLayout";

const styles = cssModule("AdminPage", ["pageTitle", "subtitle"] as const);

/** Render a full admin page with an optional heading and subtitle. */
export function AdminPage(props: { readonly children: Child; readonly title?: string; readonly subtitle?: Child }) {
  return (
    <AdminLayout>
      {props.title ? (
        <header class={styles.pageTitle}>
          <h1>{props.title}</h1>
          {props.subtitle ? <div class={styles.subtitle}>{props.subtitle}</div> : null}
        </header>
      ) : null}
      {props.children}
    </AdminLayout>
  );
}
