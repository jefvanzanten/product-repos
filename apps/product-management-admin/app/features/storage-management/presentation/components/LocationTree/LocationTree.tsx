import type { LocationTreeNode } from "../../../domain/location";
import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./LocationTree.module.css";

/** User actions exposed by location tree rows. */
export type LocationTreeActions = {
  readonly onCreateChild: (node: LocationTreeNode) => void;
  readonly onRename: (node: LocationTreeNode) => void;
  readonly onMove: (node: LocationTreeNode) => void;
  readonly onArchive: (node: LocationTreeNode) => void;
  readonly onRestore: (node: LocationTreeNode) => void;
};

/**
 * Render independently collapsible active or archived location rows.
 *
 * @param props - Tree roots, state, and row callbacks.
 * @returns Accessible recursive location tree.
 */
export function LocationTree({ roots, status, actions }: {
  readonly roots: ReadonlyArray<LocationTreeNode>;
  readonly status: "active" | "archived";
  readonly actions: LocationTreeActions;
}): ReactNode {
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set(roots.map((root) => root.id)));

  /** Toggle one branch without changing any other branch. */
  function toggle(id: number): void {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className={styles.tree} role="tree" aria-label={status === "active" ? "Actieve opbergplaatsen" : "Gearchiveerde opbergplaatsen"}>
      {roots.map((root) => (
        <LocationRow
          key={root.id}
          node={root}
          depth={0}
          archivedByAncestor={false}
          status={status}
          expanded={expanded}
          onToggle={toggle}
          actions={actions}
        />
      ))}
    </div>
  );
}

/**
 * Render one recursive location row and its visible descendants.
 *
 * @param props - Node context, expansion state, and actions.
 * @returns One semantic tree item.
 */
function LocationRow({ node, depth, archivedByAncestor, status, expanded, onToggle, actions }: {
  readonly node: LocationTreeNode;
  readonly depth: number;
  readonly archivedByAncestor: boolean;
  readonly status: "active" | "archived";
  readonly expanded: ReadonlySet<number>;
  readonly onToggle: (id: number) => void;
  readonly actions: LocationTreeActions;
}): ReactNode {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const childrenId = `location-children-${node.id}`;
  const visualDepth = Math.min(depth, 7);
  const label = status === "archived" && depth === 0 ? node.path : node.name;
  const [menuOpen, setMenuOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    /** Close the menu when the user clicks outside its details element. */
    function closeOnOutsideInteraction(event: MouseEvent): void {
      if (event.target instanceof Node && !detailsRef.current?.contains(event.target)) {
        detailsRef.current?.removeAttribute("open");
        setMenuOpen(false);
      }
    }

    /** Close the menu with Escape and return focus to its trigger. */
    function closeOnEscape(event: globalThis.KeyboardEvent): void {
      if (event.key !== "Escape") return;
      event.preventDefault();
      detailsRef.current?.removeAttribute("open");
      setMenuOpen(false);
      detailsRef.current?.querySelector("summary")?.focus();
    }

    document.addEventListener("mousedown", closeOnOutsideInteraction);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideInteraction);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  /** Close the action menu before running the selected location action. */
  function selectAction(action: () => void): void {
    detailsRef.current?.removeAttribute("open");
    setMenuOpen(false);
    action();
  }

  return (
    <div role="treeitem" aria-level={depth + 1} aria-expanded={hasChildren ? isExpanded : undefined}>
      <div className={styles.row} style={{ marginLeft: `${visualDepth}rem` }}>
        {hasChildren ? (
          <button
            className={styles.expandButton}
            type="button"
            aria-label={`${isExpanded ? "Inklappen" : "Uitklappen"}: ${node.name}`}
            aria-expanded={isExpanded}
            aria-controls={childrenId}
            onClick={() => onToggle(node.id)}
          >
            <span className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`} aria-hidden="true">▸</span>
          </button>
        ) : <span className={styles.expandSpacer} aria-hidden="true" />}
        <span className={styles.nodeInfo}>
          <strong>{label}</strong>
          {status === "archived" && (
            <span className={styles.archiveStatus}>
              {node.archivedAt !== null ? "Zelf gearchiveerd" : "Via bovenliggende locatie inactief"}
            </span>
          )}
        </span>
        <details
          ref={detailsRef}
          className={styles.actions}
          onToggle={(event) => setMenuOpen(event.currentTarget.open)}
        >
          <summary aria-label={`Opbergplaats ${node.name} beheren`}>
            <PencilIcon />
          </summary>
          <div className={styles.actionMenu}>
            {status === "active" ? (
              <>
                <button type="button" onClick={() => selectAction(() => actions.onCreateChild(node))}>Sublocatie toevoegen</button>
                <button type="button" onClick={() => selectAction(() => actions.onRename(node))}>Hernoemen</button>
                <button type="button" onClick={() => selectAction(() => actions.onMove(node))}>Verplaatsen</button>
                <button type="button" onClick={() => selectAction(() => actions.onArchive(node))}>Archiveren</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => selectAction(() => actions.onRename(node))}>Hernoemen</button>
                {node.archivedAt !== null && !archivedByAncestor && (
                  <button type="button" onClick={() => selectAction(() => actions.onRestore(node))}>Herstellen</button>
                )}
              </>
            )}
          </div>
        </details>
      </div>
      {hasChildren && isExpanded && (
        <div id={childrenId} role="group">
          {node.children.map((child) => (
            <LocationRow
              key={child.id}
              node={child}
              depth={depth + 1}
              archivedByAncestor={archivedByAncestor || node.archivedAt !== null}
              status={status}
              expanded={expanded}
              onToggle={onToggle}
              actions={actions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Render the same edit asset used by the product-category tree. */
function PencilIcon(): ReactNode {
  return <img alt="" className={styles.pencilIcon} height="18" src="/product-management-admin/assets/product-forms/edit.svg" width="18" />;
}

