import type { ReactNode } from "react";

/**
 * Render the shared edit-pencil icon.
 *
 * @param props - Optional styling class and accessible label.
 * @returns An 18 by 18 pencil SVG.
 */
export function PencilIcon({ className, label }: {
  readonly className?: string;
  readonly label?: string;
}): ReactNode {
  return (
    <svg
      aria-hidden={label === undefined ? "true" : undefined}
      aria-label={label}
      className={className}
      fill="none"
      height="18"
      role={label === undefined ? undefined : "img"}
      viewBox="0 0 18 18"
      width="18"
    >
      <path d="M4 13.25 4.6 10.45 11.65 3.4a1.03 1.03 0 0 1 1.45 0l1.5 1.5a1.03 1.03 0 0 1 0 1.45L7.55 13.4 4.75 14 4 13.25Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
