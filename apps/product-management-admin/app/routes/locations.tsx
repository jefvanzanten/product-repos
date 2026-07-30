import StorageManagementPage from "../features/admin/storage-management/components/StorageManagementPage/StorageManagementPage";

export function meta() {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function StorageManagement(): React.ReactNode {
  return <StorageManagementPage />;
}
