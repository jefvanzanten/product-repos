import type { ReactNode } from "react";
import { useRevalidator } from "react-router";
import { StatusPanel } from "../../../components/status-panel/status-panel";
import { logbookPath } from "../../../routing/calorie-tracker-routes";
import { DishForm } from "../components/dish-form/dish-form";
import type { DishFormLoaderData } from "../types/dish-form.types";

/**
 * Render create-dish loader states and the dish form component.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export function DishFormPage({ loaderData }: { readonly loaderData: DishFormLoaderData }): ReactNode {
  const revalidator = useRevalidator();
  const { timezone, routeState, initialPackages, loadFailed } = loaderData;
  if (timezone === null || routeState === null) return <StatusPanel title="Formulier laden" message="Je browsertijdzone wordt ingesteld…" />;
  if (loadFailed) return <StatusPanel title="Formulier laden lukt niet" message="Probeer het formulier opnieuw te laden." action={<button type="button" className="ct-secondary" onClick={() => void revalidator.revalidate()}>Opnieuw proberen</button>} />;

  return (
    <DishForm
      key={`dish:${routeState.date}`}
      date={routeState.date}
      type={routeState.type}
      initialPackages={initialPackages}
      closePath={logbookPath(routeState)}
    />
  );
}
