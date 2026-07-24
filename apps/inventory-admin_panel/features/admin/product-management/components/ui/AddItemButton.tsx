interface AddItemButtonProps {
  onClick?: () => void;
  type: string;
}

export default function AddItemButton({
  onClick,
  type,
}: AddItemButtonProps): React.ReactNode {
  return (
    <div className="p-3">
      <button
        className="h-10 w-full rounded-md bg-[#209b7e] px-4 text-xs font-semibold text-white transition hover:bg-[#1b876e]"
        onClick={onClick}
        type="button"
      >
        + {capitalize(type)} toevoegen
      </button>
    </div>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
