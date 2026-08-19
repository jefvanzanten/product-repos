import { useRef, useState, type ReactNode } from "react";
import { PencilIcon } from "../icons/pencil-icon";
import { useEscapeKey } from "../../hooks/use-escape-key";
import { useOutsideInteraction } from "../../hooks/use-outside-interaction";
import styles from "./tree-action-menu.module.css";

/**
 * Render a tree-row edit trigger and accessible dismissible action menu.
 *
 * @param props - Trigger label and feature-owned menu contents.
 * @returns A reusable tree action menu.
 */
export function TreeActionMenu({ children, triggerLabel }: {
  readonly children: (closeMenu: () => void) => ReactNode;
  readonly triggerLabel: string;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /** Close the menu and optionally restore focus to its trigger. */
  function closeMenu(restoreFocus = false): void {
    setOpen(false);
    if (restoreFocus) queueMicrotask(() => triggerRef.current?.focus());
  }

  useEscapeKey(open, () => closeMenu(true));
  useOutsideInteraction(open, containerRef, () => closeMenu());

  return (
    <div ref={containerRef} className={`${styles.container}${open ? ` ${styles.containerOpen}` : ""}`}>
      <button
        ref={triggerRef}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={triggerLabel}
        className={styles.trigger}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <PencilIcon className={styles.icon} />
      </button>
      {open ? <div className={styles.menu} role="menu">{children(() => closeMenu())}</div> : null}
    </div>
  );
}
