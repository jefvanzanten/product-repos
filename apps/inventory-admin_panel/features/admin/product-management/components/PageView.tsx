export default function PageView(): React.ReactNode {
  return (
    <section className="flex flex-1 flex-col justify-end pb-4">
      <button
        className="h-11 w-full rounded-lg bg-[#209b7e] px-4 text-center text-xs font-semibold text-white shadow-sm transition hover:bg-[#1b876e]"
        type="button"
      >
        + Product aanmaken
      </button>
    </section>
  );
}
