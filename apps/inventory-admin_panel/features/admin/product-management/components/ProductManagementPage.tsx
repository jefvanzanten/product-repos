import { useLoaderData } from "react-router";
import type { ProductManagementLoaderData } from "../types";
import MultiResultView from "./MultiResultView";
import PageView from "./PageView";
import SearchBar from "./ui/SearchBar";
import SingleResultView from "./SingleResultView";

export default function ProductManagementPage(): React.ReactNode {
  const {
    initialQuery,
    packagingTypes,
    previousParam,
    previousQuery,
    query,
    result,
    selectedParam,
    unitTypes,
    view,
  } = useLoaderData<ProductManagementLoaderData>();

  return (
    <main className="flex flex-1 flex-col">
      {view === "single" && selectedParam ? (
        <SingleResultView
          query={query}
          initialQuery={initialQuery}
          packagingTypes={packagingTypes}
          previousParam={previousParam}
          previousQuery={previousQuery}
          result={result}
          selectedParam={selectedParam}
          unitTypes={unitTypes}
        />
      ) : (
        <SearchableProductManagementLayout query={query}>
          {view === "page" ? (
            <PageView />
          ) : (
            <MultiResultView query={query} result={result} />
          )}
        </SearchableProductManagementLayout>
      )}
    </main>
  );
}

function SearchableProductManagementLayout({
  children,
  query,
}: {
  children: React.ReactNode;
  query: string;
}): React.ReactNode {
  return (
    <>
      <SearchBar query={query} />
      {children}
    </>
  );
}
