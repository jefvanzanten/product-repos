import type { Child } from "hono/jsx";
import { cssModule } from "../../css-modules";

const styles = cssModule("AdminLayout", ["shell", "header", "nav", "navItem", "activeNavItem", "main"] as const);

/** Render the shared server-side admin document and navigation. */
export function AdminLayout(props: { readonly children: Child }) {
  return (
    <html lang="nl">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Admin</title>
        <link rel="stylesheet" href="/admin/assets/admin.css" />
        <script src="/admin/assets/htmx.min.js" defer></script>
      </head>
      <body>
        <div class={styles.shell}>
          <header class={styles.header}>
            <nav class={styles.nav} aria-label="Hoofdnavigatie">
              <a
                class={`${styles.navItem} ${styles.activeNavItem}`}
                href="/admin/product-catalogus"
                aria-current="page"
              >
                Productcatalogus
              </a>
            </nav>
          </header>
          <main class={styles.main}>{props.children}</main>
          <div id="modal-root"></div>
        </div>
      </body>
    </html>
  );
}
