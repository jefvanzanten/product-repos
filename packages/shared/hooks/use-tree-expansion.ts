import { useState } from "react";

/** Expansion state and commands for an interactive tree. */
export type TreeExpansion<Id> = {
  readonly expandedIds: ReadonlySet<Id>;
  readonly isExpanded: (id: Id) => boolean;
  readonly toggleExpanded: (id: Id) => void;
};

/**
 * Manage independently expandable tree branches.
 *
 * @param initiallyExpandedIds - Branch identifiers expanded on first render.
 * @returns Current expansion state and branch commands.
 */
export function useTreeExpansion<Id>(initiallyExpandedIds: Iterable<Id> = []): TreeExpansion<Id> {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<Id>>(() => new Set(initiallyExpandedIds));

  /** Determine whether one branch is currently expanded. */
  function isExpanded(id: Id): boolean {
    return expandedIds.has(id);
  }

  /** Toggle one branch without changing any other branch. */
  function toggleExpanded(id: Id): void {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return { expandedIds, isExpanded, toggleExpanded };
}
