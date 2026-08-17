import type { RecipeDetail, RecipeIngredientInputOptions } from "../../../domain/recipe";
import { RecipeForm } from "../../components/recipe-form/recipe-form";

/** Recipe form page properties. */
type RecipeFormPageProps = {
  readonly mode: "Create" | "Edit";
  readonly recipe?: RecipeDetail;
  readonly initialOptions?: Readonly<Record<string, RecipeIngredientInputOptions>>;
  readonly error?: string;
  readonly fieldErrors?: Readonly<Record<string, string>>;
};

/** Render the create or edit Recipe page around the shared editor. */
export function RecipeFormPage(props: RecipeFormPageProps): React.ReactNode {
  const editing = props.mode === "Edit";
  return (
    <main className="page form-page">
      <header className="page-heading compact-heading">
        <p className="eyebrow">{editing ? "Recept beheren" : "Nieuw in je collectie"}</p>
        <h1>{editing ? `${props.recipe?.name ?? "Recept"} bewerken` : "Recept maken"}</h1>
        <p>{editing
          ? "Inhoudelijke wijzigingen worden veilig als een nieuwe versie bewaard."
          : "Begin met de basis. Je recept staat standaard privé."}</p>
      </header>
      <RecipeForm
        key={props.recipe?.updatedAt ?? "new"}
        recipe={props.recipe}
        initialOptions={props.initialOptions}
        error={props.error}
        fieldErrors={props.fieldErrors}
      />
    </main>
  );
}
