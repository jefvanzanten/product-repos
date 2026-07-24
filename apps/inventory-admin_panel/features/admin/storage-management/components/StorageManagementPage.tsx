export default function StorageManagementPage(): React.ReactNode {
  return (
    <main className="flex flex-1 flex-col pb-4">
      <section className="overflow-hidden rounded-lg bg-white p-4 text-left text-[#151515] shadow-sm">
        <h1 className="text-sm font-bold">Opbergplaatsen</h1>
        <p className="mt-2 text-xs leading-5 text-[#4d4d4d]">
          Nog geen opbergplaatsen gevonden.
        </p>
        <button
          className="mt-4 h-10 w-full rounded-md bg-[#209b7e] px-4 text-xs font-semibold text-white transition hover:bg-[#1b876e]"
          type="button"
        >
          + Opbergplaats toevoegen
        </button>
      </section>
    </main>
  );
}
