import type { ReactNode } from "react";
import { Link, useRevalidator } from "react-router";
import { StatusPanel } from "../../../components/status-panel/status-panel";
import { logDetailPath, logbookPath, newDishPath } from "../../../routing/calorie-tracker-routes";
import { LogForm } from "../components/log-form/log-form";
import type { LogFormLoaderData } from "../types/log-form.types";

/**
 * Render create/edit form loader states and the shared form component.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export function LogFormPage({ loaderData }: { readonly loaderData: LogFormLoaderData }): ReactNode {
  const revalidator = useRevalidator();
  const { timezone, routeState, mode, initialResults, initialDish, notFound, loadFailed } = loaderData;
  if (timezone === null || routeState === null) return <StatusPanel title="Formulier laden" message="Je browsertijdzone wordt ingesteld…" />;
  if (notFound) return <StatusPanel title="Log niet gevonden" message="Deze log is niet beschikbaar." action={<Link className="ct-secondary" to={logbookPath(routeState)}>Terug</Link>} />;
  if (loadFailed || mode === null) return <StatusPanel title="Formulier laden lukt niet" message="Probeer het formulier opnieuw te laden." action={<button type="button" className="ct-secondary" onClick={() => void revalidator.revalidate()}>Opnieuw proberen</button>} />;

  const closePath = mode._tag === "Edit" ? logDetailPath(mode.log.id, routeState) : logbookPath(routeState);
  return (
    <LogForm
      key={mode._tag === "Edit" ? mode.log.updatedAt : `create:${routeState.date}:${initialDish?.id ?? ""}`}
      mode={mode}
      date={routeState.date}
      type={routeState.type}
      timezone={timezone}
      initialResults={initialResults}
      initialDish={initialDish}
      createDishHref={newDishPath(routeState)}
      closePath={closePath}
    />
  );
}
