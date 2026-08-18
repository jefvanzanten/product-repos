import type { ComponentProps, ReactNode } from "react";
import { AdminLink } from "../../../../../../core/presentation/routing/admin-source-context";
import styles from "./catalog-actions.module.css";

type CatalogActionGroupVariant = "card" | "inline" | "modal";

const groupClassNames = {
  card: styles.cardActions,
  inline: styles.inlineActions,
  modal: styles.modalActions,
} satisfies Record<CatalogActionGroupVariant, string | undefined>;

/**
 * Group related catalog actions using the layout for their context.
 *
 * @param props - Nested actions and their visual context.
 * @returns A catalog action group.
 */
export function CatalogActionGroup({ children, variant }: { readonly children: ReactNode; readonly variant: CatalogActionGroupVariant }): ReactNode {
  return <div className={groupClassNames[variant]}>{children}</div>;
}

/**
 * Render a primary catalog action button.
 *
 * @param props - Native button properties.
 * @returns A styled primary button.
 */
export function CatalogPrimaryButton(props: ComponentProps<"button">): ReactNode {
  return <button {...props} className={styles.primaryButton} />;
}

/**
 * Render a secondary catalog action button.
 *
 * @param props - Native button properties.
 * @returns A styled secondary button.
 */
export function CatalogSecondaryButton(props: ComponentProps<"button">): ReactNode {
  return <button {...props} className={styles.secondaryButton} />;
}

/**
 * Render a primary source-preserving catalog link.
 *
 * @param props - Link target and content.
 * @returns A styled primary catalog link.
 */
export function CatalogPrimaryLink({ children, to }: { readonly children: ReactNode; readonly to: string }): ReactNode {
  return <AdminLink className={styles.primaryLink} to={to}>{children}</AdminLink>;
}
