import { useLoaderData } from "react-router";
import type { ProductManagementLoaderData } from "../types";
import SearchBar from "./ui/SearchBar";
import { ResultListView } from "./ui/ResultListView";

export default function ProductManagementPage(): React.ReactNode {
  const { query } = useLoaderData<ProductManagementLoaderData>();

  return (
    <main className="px-[1em]">
      <SearchBar query={query} />
      <section className="min-h-[80vh] py-6">
        <ResultListView />
      </section>
    </main>
  );
}
