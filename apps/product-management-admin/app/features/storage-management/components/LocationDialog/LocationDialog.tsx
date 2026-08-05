import type { LocationTreeNode } from "@product-repos/contracts/locations";
import { useEffect, useRef, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { useFetcher } from "react-router";
import type { LocationActionResult } from "../../location-management.types";
import { collectLocationDescendantIds } from "../LocationTree/LocationTree";
import styles from "./LocationDialog.module.css";

/** Dialog state owned by the storage management page. */
export type LocationDialogState =
  | { readonly kind: "name"; readonly mode: "create-root"; }
  | { readonly kind: "name"; readonly mode: "create-child"; readonly parent: LocationTreeNode }
  | { readonly kind: "name"; readonly mode: "rename"; readonly node: LocationTreeNode }
  | { readonly kind: "move"; readonly node: LocationTreeNode }
  | { readonly kind: "archive"; readonly node: LocationTreeNode };

/**
 * Render the active location mutation dialog.
 *
 * @param props - Dialog state, active tree, fetcher, and close callback.
 * @returns One accessible modal dialog.
 */
export function LocationDialog({ state, activeRoots, fetcher, onClose, onSubmit, showResult, actionTarget }: {
  readonly state: LocationDialogState;
  readonly activeRoots: ReadonlyArray<LocationTreeNode>;
  readonly fetcher: ReturnType<typeof useFetcher<LocationActionResult>>;
  readonly onClose: () => void;
  readonly onSubmit: () => void;
  readonly showResult: boolean;
  readonly actionTarget: string;
}): ReactNode {
  const pending = fetcher.state !== "idle";
  const errors = showResult && fetcher.data?.ok === false ? fetcher.data.errors : undefined;

  /** Close on Escape only while no submit is pending. */
  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>): void {
    if (event.key !== "Escape" || pending) return;
    event.preventDefault();
    onClose();
  }

  /** Mark this fetcher submission so the page can close after success. */
  function handleSubmit(_event: FormEvent<HTMLFormElement>): void {
    onSubmit();
  }

  if (state.kind === "name") {
    const isRename = state.mode === "rename";
    const parent = state.mode === "create-child" ? state.parent : null;
    const title = isRename
      ? "Opbergplaats hernoemen"
      : parent === null ? "Hoofdlocatie toevoegen" : "Sublocatie toevoegen";
    return (
      <DialogShell title={title} pending={pending} onClose={onClose} onKeyDown={handleKeyDown}>
        {parent !== null && <p className={styles.context}>Onder: <strong>{parent.path}</strong></p>}
        {isRename && <p className={styles.context}>Locatie: <strong>{state.node.path}</strong></p>}
        <fetcher.Form action={actionTarget} method="post" className={styles.form} onSubmit={handleSubmit}>
          <input type="hidden" name="_action" value={isRename ? "rename" : "create"} />
          {isRename && <input type="hidden" name="locationId" value={state.node.id} />}
          {!isRename && <input type="hidden" name="parentId" value={parent?.id ?? ""} />}
          <label>
            Naam
            <input
              autoFocus
              name="name"
              required
              maxLength={100}
              defaultValue={isRename ? state.node.name : ""}
              aria-invalid={errors?.name ? true : undefined}
              aria-describedby={errors?.name ? "location-name-error" : undefined}
            />
          </label>
          {errors?.name && <p className={styles.error} id="location-name-error">{errors.name}</p>}
          {errors?.form && <p className={styles.error} role="alert">{errors.form}</p>}
          <DialogButtons pending={pending} onClose={onClose} submitLabel={isRename ? "Opslaan" : "Toevoegen"} />
        </fetcher.Form>
      </DialogShell>
    );
  }

  if (state.kind === "move") {
    return (
      <DialogShell title="Opbergplaats verplaatsen" pending={pending} onClose={onClose} onKeyDown={handleKeyDown}>
        <p className={styles.context}>Verplaats: <strong>{state.node.path}</strong></p>
        <fetcher.Form action={actionTarget} method="post" className={styles.form} onSubmit={handleSubmit}>
          <input type="hidden" name="_action" value="move" />
          <input type="hidden" name="locationId" value={state.node.id} />
          <fieldset className={styles.destinationTree}>
            <legend>Kies een nieuwe bovenliggende locatie</legend>
            <label className={styles.destination}>
              <input name="parentId" type="radio" value="" disabled={state.node.parentId === null} required />
              Hoofdniveau
            </label>
            {activeRoots.map((root) => <MoveDestination key={root.id} candidate={root} moving={state.node} depth={0} />)}
          </fieldset>
          {errors?.form && <p className={styles.error} role="alert">{errors.form}</p>}
          <DialogButtons pending={pending} onClose={onClose} submitLabel="Verplaatsen" />
        </fetcher.Form>
      </DialogShell>
    );
  }

  return (
    <DialogShell title="Opbergplaats archiveren" pending={pending} onClose={onClose} onKeyDown={handleKeyDown}>
      <p className={styles.context}><strong>{state.node.path}</strong></p>
      <p>Weet je zeker dat je deze opbergplaats wilt archiveren? Onderliggende opbergplaatsen zijn daarna niet meer selecteerbaar. Bestaande voorraad blijft bewaard.</p>
      <fetcher.Form action={actionTarget} method="post" className={styles.form} onSubmit={handleSubmit}>
        <input type="hidden" name="_action" value="archive" />
        <input type="hidden" name="locationId" value={state.node.id} />
        {errors?.form && <p className={styles.error} role="alert">{errors.form}</p>}
        <DialogButtons pending={pending} onClose={onClose} submitLabel="Archiveren" danger />
      </fetcher.Form>
    </DialogShell>
  );
}

/**
 * Render a modal shell with shared semantics and backdrop.
 *
 * @param props - Title, pending state, close behavior, and content.
 * @returns Modal dialog markup.
 */
function DialogShell({ title, pending, onClose, onKeyDown, children }: {
  readonly title: string;
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLDialogElement>) => void;
  readonly children: ReactNode;
}): ReactNode {
  const titleId = "location-dialog-title";
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialogRef.current;
    if (element !== null && !element.open) element.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  );
}

/**
 * Render one move destination recursively.
 *
 * @param props - Candidate, moving subtree, and semantic depth.
 * @returns Radio destination row and descendants.
 */
function MoveDestination({ candidate, moving, depth }: {
  readonly candidate: LocationTreeNode;
  readonly moving: LocationTreeNode;
  readonly depth: number;
}): ReactNode {
  const disabled = isMoveDestinationDisabled(candidate.id, moving);
  return (
    <div>
      <label className={styles.destination} style={{ paddingLeft: `${Math.min(depth, 7) * 1.1 + 0.4}rem` }}>
        <input name="parentId" type="radio" value={candidate.id} disabled={disabled} required />
        {candidate.name}
      </label>
      {candidate.children.map((child) => <MoveDestination key={child.id} candidate={child} moving={moving} depth={depth + 1} />)}
    </div>
  );
}

/**
 * Determine whether an active candidate is invalid for one move.
 *
 * @param destinationId - Candidate parent identifier.
 * @param moving - Moving subtree root.
 * @returns Whether the radio destination must be disabled.
 */
export function isMoveDestinationDisabled(destinationId: number, moving: LocationTreeNode): boolean {
  return destinationId === moving.id
    || destinationId === moving.parentId
    || collectLocationDescendantIds(moving).has(destinationId);
}

/**
 * Render shared cancel and submit controls.
 *
 * @param props - Pending state, labels, close callback, and tone.
 * @returns Dialog action buttons.
 */
function DialogButtons({ pending, onClose, submitLabel, danger = false }: {
  readonly pending: boolean;
  readonly onClose: () => void;
  readonly submitLabel: string;
  readonly danger?: boolean;
}): ReactNode {
  return (
    <div className={styles.buttons}>
      <button type="button" disabled={pending} onClick={onClose}>Annuleren</button>
      <button className={danger ? styles.danger : styles.primary} type="submit" disabled={pending}>
        {pending ? "Bezig…" : submitLabel}
      </button>
    </div>
  );
}
