import type { Route } from "./+types/inventory";
import InventoryPage from "../features/inventory/components/InventoryPage/InventoryPage";

/**
 * Describe the Inventory list route for the browser document.
 *
 * @param _args - React Router metadata arguments, unused by this static metadata.
 * @returns Title and description metadata for the Inventory route.
 */
export function meta(_args: Route.MetaArgs) {
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
  return <InventoryPage />;
}
