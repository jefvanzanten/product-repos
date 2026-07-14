import { Form } from "react-router";

interface SearchBarProps {
  query: string;
}

export default function SearchBar({ query }: SearchBarProps): React.ReactNode {
  return (
    <Form method="get" role="search">
      <input
        aria-label="Zoek producten"
        className="border-1 border-stone-400 w-[90vw] h-10 rounded-lg p-1"
        defaultValue={query}
        key={query}
        name="q"
        placeholder="Zoek producttype, merk of variant"
        type="search"
      />
    </Form>
  );
}
