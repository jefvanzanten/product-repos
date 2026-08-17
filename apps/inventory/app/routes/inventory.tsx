import { useOutletContext } from "react-router";
import InventoryPage from "../features/inventory/presentation/pages/inventory-page/inventory-page";
import type { InventoryOutletContext } from "./layout/layout";

/**
 * Describe the Inventory list route for the browser document.
 *
 * @returns Title and description metadata for the Inventory route.
 */
export function meta() {
  return [
    { title: "Inventarisatie" },
    { name: "description", content: "Bekijk de actuele voorraad per product en locatie." },
  ];
}

/**
 * Render the authenticated Inventory read page.
 *
 * @returns The Inventory page component.
 */
export default function Inventory(): React.ReactNode {
  const { isAdmin } = useOutletContext<InventoryOutletContext>();
  return <InventoryPage canManageInventory={isAdmin} />;
}
