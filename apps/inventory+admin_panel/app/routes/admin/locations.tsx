import type { Route } from "../../+types/root";
import StorageManagementPage from "../../../features/admin/storage-management/components/StorageManagementPage";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function StorageManagement(): React.ReactNode {
  return <StorageManagementPage />;
}
