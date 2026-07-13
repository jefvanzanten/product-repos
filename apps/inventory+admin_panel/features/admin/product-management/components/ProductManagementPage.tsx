import SearchBar from "./ui/SearchBar";

export default function ProductManagementPage(): React.ReactNode {
  return (
    <main className="px-[1em]">
      <SearchBar />
      <section className="h-[80vh] flex flex-col justify-center items-center">
        Producten
      </section>
    </main>
  );
}
