import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEscapeKey } from "@product-repos/shared/use-escape-key";
import { useOutsideInteraction } from "@product-repos/shared/use-outside-interaction";
import {
  getActiveLocations,
  getPhysicalInventoryItem,
  persistPhysicalInventoryItem,
} from "../../data/inventory-api";
import { inventoryQueryKeys } from "../../data/inventory-query-keys";
import type {
  InventoryLocation,
  PhysicalInventoryItemDetail,
} from "../../domain/inventory";
import { flattenLocationOptions } from "./inventory-item-dialog/location-options";
import styles from "./inventory-item-settings-menu.module.css";

type InventoryItemSettingsMenuProps = {
  readonly itemId: string;
};

/** Open per-item location and expiry settings from a compact cogwheel menu. */
export function InventoryItemSettingsMenu({
  itemId,
}: InventoryItemSettingsMenuProps): ReactNode {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const menuId = useId();
  const itemQuery = useQuery({
    queryKey: inventoryQueryKeys.item(itemId),
    queryFn: ({ signal }) => getPhysicalInventoryItem(itemId, signal),
    enabled: open,
    retry: false,
  });
  const locationsQuery = useQuery({
    queryKey: inventoryQueryKeys.locations(),
    queryFn: ({ signal }) => getActiveLocations(signal),
    enabled: open,
    retry: false,
  });
  const item = itemQuery.data?.tag === "Success" ? itemQuery.data.value : null;
  const locations =
    locationsQuery.data?.tag === "Success" ? locationsQuery.data.value : [];

  /** Close the menu and optionally restore focus to its trigger. */
  function closeMenu(restoreFocus = false): void {
    setOpen(false);
    if (restoreFocus) queueMicrotask(() => triggerRef.current?.focus());
  }

  useEscapeKey(open, () => closeMenu(true));
  useOutsideInteraction(open, containerRef, () => setOpen(false));

  return (
    <span className={styles.itemSettings} ref={containerRef}>
      <button
        ref={triggerRef}
        className={styles.settingsTrigger}
        type="button"
        aria-label="Verpakking instellen"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9.6 3.4h4.8l.6 2.2c.5.2 1 .5 1.4.8l2.2-.6 2.4 4.1-1.6 1.6v1l1.6 1.6-2.4 4.1-2.2-.6c-.4.3-.9.6-1.4.8l-.6 2.2H9.6L9 18.4c-.5-.2-1-.5-1.4-.8l-2.2.6L3 14.1l1.6-1.6v-1L3 9.9l2.4-4.1 2.2.6c.4-.3.9-.6 1.4-.8Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      {open && (
        <span
          className={styles.settingsPopover}
          id={menuId}
          role="dialog"
          aria-label="Locatie en houdbaarheidsdatum wijzigen"
        >
          {(itemQuery.isPending || locationsQuery.isPending) && (
            <span className={styles.settingsMessage}>Instellingen laden…</span>
          )}
          {(itemQuery.data?.tag === "Failure" ||
            locationsQuery.data?.tag === "Failure") && (
            <span className={styles.settingsError} role="alert">
              Instellingen konden niet worden geladen.
            </span>
          )}
          {item !== null &&
            !locationsQuery.isPending &&
            locations.length === 0 && (
              <span className={styles.settingsError} role="alert">
                Er zijn geen actieve locaties beschikbaar.
              </span>
            )}
          {item !== null && locations.length > 0 && (
            <InventoryItemSettingsForm
              key={`${item.id}:${item.version}`}
              item={item}
              locations={locations}
              onClose={() => closeMenu(true)}
            />
          )}
        </span>
      )}
    </span>
  );
}

/** Edit one item's location and expiry date inside the cogwheel popover. */
function InventoryItemSettingsForm({
  item,
  locations,
  onClose,
}: {
  readonly item: PhysicalInventoryItemDetail;
  readonly locations: ReadonlyArray<InventoryLocation>;
  readonly onClose: () => void;
}): ReactNode {
  const [locationId, setLocationId] = useState(item.locationId);
  const [expiryDate, setExpiryDate] = useState(item.expiryDate ?? "");
  const [error, setError] = useState(false);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      persistPhysicalInventoryItem(item, {
        remainingAmountBase: item.remainingAmountBase,
        locationId,
        expiryDate: expiryDate === "" ? null : expiryDate,
      }),
  });
  const options = flattenLocationOptions(locations);

  /** Save location and expiry changes while carrying the item's optimistic version. */
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(false);
    const result = await mutation.mutateAsync();
    if (result.tag === "Failure") {
      setError(true);
      return;
    }
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: inventoryQueryKeys.itemLists(),
      }),
      queryClient.invalidateQueries({
        queryKey: inventoryQueryKeys.item(item.id),
      }),
    ]);
    onClose();
  }

  return (
    <form
      className={styles.settingsForm}
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      <label>
        <span>Locatie</span>
        <select
          value={locationId}
          disabled={mutation.isPending}
          onChange={(event) => setLocationId(Number(event.target.value))}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.path}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>THT</span>
        <input
          type="date"
          value={expiryDate}
          disabled={mutation.isPending}
          onChange={(event) => setExpiryDate(event.target.value)}
        />
      </label>
      {error && (
        <span className={styles.settingsError} role="alert">
          Wijzigen is mislukt.
        </span>
      )}
      <span className={styles.settingsActions}>
        <button type="button" disabled={mutation.isPending} onClick={onClose}>
          Annuleren
        </button>
        <button type="submit" disabled={mutation.isPending}>
          Opslaan
        </button>
      </span>
    </form>
  );
}
