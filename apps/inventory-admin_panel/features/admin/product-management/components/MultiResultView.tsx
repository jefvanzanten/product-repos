import type { ProductSearchResponse } from "@product-repos/contracts/product-search";
import MultiResultListView from "./ui/MultiResultListView";

interface MultiResultViewProps {
  query: string;
  result?: ProductSearchResponse;
}

export default function MultiResultView({
  query,
  result,
}: MultiResultViewProps): React.ReactNode {
  return (
    <section className="flex flex-col gap-4 pb-4">
      {result && <MultiResultListView query={query} result={result} />}
    </section>
  );
}
