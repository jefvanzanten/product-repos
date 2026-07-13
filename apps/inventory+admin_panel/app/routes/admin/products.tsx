import type { Route } from "../../+types/root";
import ProductManagementPage from "../../../features/admin/product-management/components/ProductManagementPage";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function ProductManagement(): React.ReactNode {
  return <ProductManagementPage />;
}
