export default function InventoryPage(): React.ReactNode {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-[radial-gradient(circle_at_82%_8%,rgba(79,92,181,0.82),rgba(16,18,36,0.95)_48%,#101124_100%)] px-6 pb-24 pt-10 text-white shadow-2xl">
      <h1 className="mb-6 text-lg font-semibold">Inventarisatie</h1>

      <form className="flex flex-1 flex-col gap-4" aria-label="Inventaris toevoegen">
        <label className="flex flex-col gap-2 text-xs font-medium text-white/85">
          Categorie
          <select className="h-11 rounded-lg border border-[#d9dce8] bg-white px-3 text-sm text-[#202124] shadow-sm">
            <option>Selecteer categorie</option>
            <option>Eten</option>
            <option>Drinken</option>
            <option>Supplementen</option>
            <option>Medicijnen</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-xs font-medium text-white/85">
          Product
          <input
            className="h-11 rounded-lg border border-[#d9dce8] bg-white px-3 text-sm text-[#202124] shadow-sm placeholder:text-[#9ca0ad]"
            placeholder="Zoek product"
            type="search"
          />
        </label>

        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
          <label className="flex flex-col gap-2 text-xs font-medium text-white/85">
            Hoeveelheid
            <input
              className="h-11 rounded-lg border border-[#d9dce8] bg-white px-3 text-sm text-[#202124] shadow-sm placeholder:text-[#9ca0ad]"
              placeholder="bijv. 200"
              type="number"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-medium text-white/85">
            Eenheid
            <select className="h-11 rounded-lg border border-[#d9dce8] bg-white px-3 text-sm text-[#202124] shadow-sm">
              <option>-</option>
              <option>gram</option>
              <option>ml</option>
              <option>stuks</option>
            </select>
          </label>
        </div>

        <button
          className="mt-auto h-11 w-full rounded-lg bg-[#209b7e] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1b876e]"
          type="button"
        >
          Voeg toe
        </button>
      </form>
    </main>
  );
}
