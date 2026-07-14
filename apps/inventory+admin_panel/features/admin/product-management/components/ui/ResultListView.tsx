import { useLoaderData } from "react-router";
import type { ProductManagementLoaderData } from "../../types";
import MultiResultListView from "./MultiResultListView";

export function ResultListView(): React.ReactNode {
  const { result, query } = useLoaderData<ProductManagementLoaderData>();

  if (!result) {
    return null;
  }

  return <MultiResultListView query={query} result={result} />;
}
