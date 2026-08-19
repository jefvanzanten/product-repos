import { useEffect, useRef, type RefObject } from "react";

/**
 * Run a callback when a pointer interaction starts outside a referenced element.
 *
 * @param enabled - Whether outside interactions should be observed.
 * @param containerRef - Element whose descendants count as inside.
 * @param onOutsideInteraction - Callback invoked for an outside pointer interaction.
 */
export function useOutsideInteraction<T extends Node>(
  enabled: boolean,
  containerRef: RefObject<T | null>,
  onOutsideInteraction: (event: PointerEvent) => void,
): void {
  const callbackRef = useRef(onOutsideInteraction);
  callbackRef.current = onOutsideInteraction;

  useEffect(() => {
    if (!enabled) return;

    /** Forward pointer interactions that start outside the current container. */
    function handlePointerDown(event: PointerEvent): void {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        callbackRef.current(event);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [containerRef, enabled]);
}
