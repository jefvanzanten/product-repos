import type { Route } from "./+types/product-management";
import ProductManagementPage from "../../../features/admin/product-management/components/ProductManagementPage";
import { getProductResults } from "../../../features/admin/product-management/services/productService.server";
import type { ProductManagementLoaderData } from "../../../features/admin/product-management/types";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function loader({
  request,
}: Route.LoaderArgs): Promise<ProductManagementLoaderData> {
  const searchParams = new URL(request.url).searchParams;
  const query = searchParams.get("q")?.trim() ?? "";

  return {
    query,
    result: query ? await getProductResults(query) : undefined,
  };
}

export default function ProductManagement(): React.ReactNode {
  return <ProductManagementPage />;
}
