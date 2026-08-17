import { BottomTabBar } from "@product-repos/shared/bottom-tab-bar";
import {
  getAdminSourceDetails,
  toAdminPublicPath,
  withAdminSource,
  type AdminSource,
} from "../../../routing/admin-navigation";

/**
 * Render the active admin tab and an optional closed return destination.
 *
 * @param props - Resolved source from the protected admin layout loader.
 * @returns The Product Management Admin bottom tab bar.
 */
export function AdminBottomTabs({
  source,
}: {
  readonly source: AdminSource | null;
}): React.ReactNode {
  const sourceDetails = source === null ? null : getAdminSourceDetails(source);
  const activeAdminPath = toAdminPublicPath(withAdminSource("/product-catalogus", source));

  return (
    <BottomTabBar>
      {sourceDetails === null ? null : (
        <a href={sourceDetails.publicPath}>{sourceDetails.label}</a>
      )}
      <a aria-current="page" href={activeAdminPath}>Admin dashboard</a>
    </BottomTabBar>
  );
}
