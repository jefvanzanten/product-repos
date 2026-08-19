import type { LocationTreeNode } from "../../../domain/location";
import type { ReactNode } from "react";
import { TreeActionMenu, useTreeExpansion } from "@product-repos/shared/tree";
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
  const expansion = useTreeExpansion(roots.map((root) => root.id));

  return (
    <div className={styles.tree} role="tree" aria-label={status === "active" ? "Actieve opbergplaatsen" : "Gearchiveerde opbergplaatsen"}>
      {roots.map((root) => (
        <LocationRow
          key={root.id}
          node={root}
          depth={0}
          archivedByAncestor={false}
          status={status}
          expanded={expansion.expandedIds}
          onToggle={expansion.toggleExpanded}
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
        <TreeActionMenu triggerLabel={`Opbergplaats ${node.name} beheren`}>
          {(closeMenu) => status === "active" ? (
            <>
              <button type="button" onClick={() => { closeMenu(); actions.onCreateChild(node); }}>Sublocatie toevoegen</button>
              <button type="button" onClick={() => { closeMenu(); actions.onRename(node); }}>Hernoemen</button>
              <button type="button" onClick={() => { closeMenu(); actions.onMove(node); }}>Verplaatsen</button>
              <button type="button" onClick={() => { closeMenu(); actions.onArchive(node); }}>Archiveren</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { closeMenu(); actions.onRename(node); }}>Hernoemen</button>
              {node.archivedAt !== null && !archivedByAncestor && (
                <button type="button" onClick={() => { closeMenu(); actions.onRestore(node); }}>Herstellen</button>
              )}
            </>
          )}
        </TreeActionMenu>
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
