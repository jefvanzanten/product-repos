import { Form, useSubmit } from "react-router";

interface SearchBarProps {
  query: string;
}

export default function SearchBar({ query }: SearchBarProps): React.ReactNode {
  const submit = useSubmit();

  return (
    <Form className="mb-5" method="get" role="search">
      <input
        onChange={(event) => {
          submit(event.currentTarget.form, { replace: true });
        }}
        aria-label="Zoek producten"
        className="h-11 w-full rounded-lg border border-[#d9dce8] bg-white px-3 text-sm font-semibold text-[#202124] shadow-sm outline-none placeholder:font-semibold placeholder:text-[#9ca0ad] focus:border-[#209b7e] focus:ring-2 focus:ring-[#209b7e]/25"
        defaultValue={query}
        name="q"
        placeholder="Zoek product"
        type="search"
      />
    </Form>
  );
}
