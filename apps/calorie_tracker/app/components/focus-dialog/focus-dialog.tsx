import { useEffect, useRef, type ReactNode } from "react";
import styles from "./focus-dialog.module.css";

/** Return keyboard-focusable elements that are actually visible inside a dialog. */
function getVisibleDialogControls(dialog: HTMLElement): ReadonlyArray<HTMLElement> {
  const candidates = dialog.querySelectorAll<HTMLElement>("button, input, select, a[href]");
  return Array.from(candidates).filter((element) => isEnabledDialogControl(element) && isVisibleDialogControl(element));
}

/** Determine whether a focus candidate accepts interaction. */
function isEnabledDialogControl(element: HTMLElement): boolean {
  return !(element instanceof HTMLButtonElement || element instanceof HTMLInputElement || element instanceof HTMLSelectElement) || !element.disabled;
}

/** Determine whether a focus candidate and its ancestors participate in the rendered layout. */
function isVisibleDialogControl(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  while (current !== null) {
    const style = window.getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden") return false;
    current = current.parentElement;
  }
  return true;
}

/** Focus-trapped modal surface with Escape handling and opener focus restoration. */
export function FocusDialog({
  title,
  children,
  onClose,
  className = "",
}: {
  readonly title: string;
  readonly children: ReactNode;
  readonly onClose: () => void;
  readonly className?: string;
}): ReactNode {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const first = dialog === null ? undefined : getVisibleDialogControls(dialog)[0];
    first?.focus();
    return () => openerRef.current?.focus();
  }, []);

  /** Keep keyboard focus in the dialog and close it with Escape. */
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    const dialog = dialogRef.current;
    if (event.key !== "Tab" || dialog === null) return;
    const focusable = getVisibleDialogControls(dialog);
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];
    if (firstFocusable === undefined || lastFocusable === undefined) return;
    if (event.shiftKey && document.activeElement === firstFocusable) {
      event.preventDefault();
      lastFocusable.focus();
    } else if (!event.shiftKey && document.activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus();
    }
  }

  return (
    <div className={styles.scrim} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} className={`${styles.dialog} ${className}`} onKeyDown={handleKeyDown}>
        {children}
      </div>
    </div>
  );
}
