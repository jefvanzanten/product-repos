import type { LocationTreeNode } from "../../../domain/location";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFetcher } from "react-router";
import { AdminLink, useAdminPath } from "../../../../../core/presentation/routing/admin-source-context";
import type { LocationActionResult, LocationLoaderData } from "../../types/location-management.types";
import { LocationDialog, type LocationDialogState } from "../LocationDialog/LocationDialog";
import { LocationTree, type LocationTreeActions } from "../LocationTree/LocationTree";
import styles from "./StorageManagementPage.module.css";

/**
 * Render active and archived storage-location management.
 *
 * @param props - Strict loader data for the selected status.
 * @returns Complete location management page.
 */
export default function StorageManagementPage({ loaderData }: { readonly loaderData: LocationLoaderData }): ReactNode {
  const fetcher = useFetcher<LocationActionResult>();
  const [dialog, setDialog] = useState<LocationDialogState | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const pending = fetcher.state !== "idle";
  const submissionSucceeded = submitted && fetcher.state === "idle" && fetcher.data?.ok === true;
  const visibleDialog = submissionSucceeded ? null : dialog;
  const actionTarget = useAdminPath(loaderData.status === "archived" ? "/locations?status=archived" : "/locations");

  useEffect(() => {
    if (!submissionSucceeded) return;
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (target !== null) window.setTimeout(() => target.focus(), 0);
  }, [submissionSucceeded]);

  /** Open a dialog without showing a stale fetcher result. */
  function openDialog(next: LocationDialogState): void {
    returnFocusRef.current = typeof document === "undefined" ? null : document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSubmitted(false);
    setDialog(next);
  }

  /** Close a dialog and restore focus to the action that opened it. */
  function closeDialog(): void {
    setDialog(null);
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (target !== null) window.setTimeout(() => target.focus(), 0);
  }

  /** Restore a directly archived root without an extra confirmation. */
  function restore(node: LocationTreeNode): void {
    if (pending) return;
    setDialog(null);
    setSubmitted(true);
    void fetcher.submit({ _action: "restore", locationId: String(node.id) }, { action: actionTarget, method: "post" });
  }

  const actions: LocationTreeActions = {
    onCreateChild: (node) => openDialog({ kind: "name", mode: "create-child", parent: node }),
    onRename: (node) => openDialog({ kind: "name", mode: "rename", node }),
    onMove: (node) => openDialog({ kind: "move", node }),
    onArchive: (node) => openDialog({ kind: "archive", node }),
    onRestore: restore,
  };

  return (
    <main className={styles.page} aria-busy={pending}>
      <section className={styles.card}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Opbergplaatsen</h1>
            <p className={styles.description}>Beheer de plaatsen waar voorraad kan worden opgeslagen.</p>
          </div>
        </header>

        <nav className={styles.filters} aria-label="Opbergplaatsstatus">
          <AdminLink className={loaderData.status === "active" ? styles.activeFilter : undefined} aria-current={loaderData.status === "active" ? "page" : undefined} to="/locations">
            Actief
          </AdminLink>
          <AdminLink className={loaderData.status === "archived" ? styles.activeFilter : undefined} aria-current={loaderData.status === "archived" ? "page" : undefined} to="/locations?status=archived">
            Gearchiveerd
          </AdminLink>
        </nav>

        {submitted && dialog === null && fetcher.data?.ok === false && (
          <p className={styles.pageError} role="alert">{fetcher.data.errors.form ?? fetcher.data.errors.name}</p>
        )}

        {loaderData.locations.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>{loaderData.status === "active" ? "Nog geen opbergplaatsen" : "Geen gearchiveerde opbergplaatsen"}</h2>
            <p>{loaderData.status === "active"
              ? "Voeg een hoofdlocatie toe om de gedeelde locatieboom op te bouwen."
              : "Gearchiveerde opbergplaatsen verschijnen hier."}</p>
            {loaderData.status === "active" && (
              <button className={styles.primaryButton} type="button" onClick={() => openDialog({ kind: "name", mode: "create-root" })}>
                Hoofdlocatie toevoegen
              </button>
            )}
          </div>
        ) : (
          <>
            <LocationTree roots={loaderData.locations} status={loaderData.status} actions={actions} />
            {loaderData.status === "active" && (
              <div className={styles.treeActions}>
                <button className={styles.primaryButton} type="button" onClick={() => openDialog({ kind: "name", mode: "create-root" })}>
                  Hoofdlocatie toevoegen
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {visibleDialog !== null && (
        <LocationDialog
          state={visibleDialog}
          activeRoots={loaderData.status === "active" ? loaderData.locations : []}
          fetcher={fetcher}
          showResult={submitted}
          actionTarget={actionTarget}
          onSubmit={() => setSubmitted(true)}
          onClose={() => {
            if (!pending) {
              closeDialog();
              setSubmitted(false);
            }
          }}
        />
      )}
    </main>
  );
}
