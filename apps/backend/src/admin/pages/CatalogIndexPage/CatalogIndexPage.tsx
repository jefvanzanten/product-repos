import { cssModule } from "../../css-modules";
import { AdminPage } from "../../components/AdminPage/AdminPage";
import { CatalogFrameContents, CatalogSearchForm } from "../../components/CatalogSearch/CatalogSearch";
import type { CatalogIndexModel } from "../../models/catalog-index.model";

const styles = cssModule("CatalogIndexPage", ["toolbar"] as const);

/** Render the admin catalog root, search, brand, or category page. */
export function CatalogIndexPage(props: {
  readonly model: CatalogIndexModel;
}) {
  return (
    <AdminPage>
      <div class={styles.toolbar}>
        <CatalogSearchForm query={props.model.state.q} />
      </div>
      <div id="catalog-frame">
        <CatalogFrameContents model={props.model} />
      </div>
    </AdminPage>
  );
}
