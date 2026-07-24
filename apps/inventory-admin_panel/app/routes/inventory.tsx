import type { Route } from "./+types/inventory";
import InventoryPage from "../../features/inventory/components/InventoryPage";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Inventory() {
  return <InventoryPage />;
}
