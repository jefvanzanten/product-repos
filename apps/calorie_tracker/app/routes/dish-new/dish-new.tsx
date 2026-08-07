import { useLoaderData, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { DishFormPage } from "../../features/dishes/pages/dish-form-page";
import type { DishFormActionResult, DishFormLoaderData } from "../../features/dishes/types/dish-form.types";
import type { CalorieTrackerRouteHandle } from "../../routing/calorie-tracker-routes";
import { handleNewDishRouteAction, loadNewDishRoute } from "../dish-form/dish-form-route.server";

/** Route metadata keeps the mounted logbook inert behind this overlay. */
export const handle: CalorieTrackerRouteHandle = {
  showsTrackerNavbar: true,
  logPresentation: "overlay",
};

/**
 * Return metadata for the route-bound create-dish flow.
 *
 * @returns The function result.
 */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Gerecht aanmaken | Calorie Tracker" }];
}

/**
 * Load protected create-dish form dependencies.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function loader(args: LoaderFunctionArgs): Promise<DishFormLoaderData | Response> {
  return loadNewDishRoute(args);
}

/**
 * Create one protected user-owned dish.
 *
 * @param args - The args value.
 * @returns The function result.
 */
export async function action(args: ActionFunctionArgs): Promise<DishFormActionResult> {
  return handleNewDishRouteAction(args);
}

/**
 * Render the create-dish feature page from route loader data.
 *
 * @returns The function result.
 */
export default function NewDishRoute(): React.ReactNode {
  return <DishFormPage loaderData={useLoaderData<DishFormLoaderData>()} />;
}
