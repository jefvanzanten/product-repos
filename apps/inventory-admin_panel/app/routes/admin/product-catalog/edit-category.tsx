import type { Route } from "./+types/edit-category";
import { handleProductCatalogAction, loadProductCatalog, ProductCatalogPage } from "./product-catalog";

export { meta } from "./product-catalog";

export async function loader({ params, request }: Route.LoaderArgs) {
  return loadProductCatalog(request, Number(params.categoryId));
}

export async function action({ request }: Route.ActionArgs) {
  return handleProductCatalogAction(request);
}

export default function EditCategory({ actionData, loaderData }: Route.ComponentProps): React.ReactNode {
  return <ProductCatalogPage actionData={actionData} loaderData={loaderData} />;
}
