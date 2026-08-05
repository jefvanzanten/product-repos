import { render, type RenderResult } from "@testing-library/react";
import {
  createMemoryRouter,
  RouterProvider,
  type RouteObject,
} from "react-router";

/**
 * Render React Router route objects with isolated in-memory navigation.
 *
 * @param routes - The routes value.
 * @param initialEntry - The initialEntry value.
 * @returns The function result.
 */
export function renderRouteTree(
  routes: ReadonlyArray<RouteObject>,
  initialEntry: string,
): RenderResult & { readonly router: ReturnType<typeof createMemoryRouter> } {
  const router = createMemoryRouter([...routes], { initialEntries: [initialEntry] });
  const result = render(<RouterProvider router={router} />);
  return { ...result, router };
}
