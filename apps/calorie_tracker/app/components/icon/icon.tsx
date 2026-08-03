import type { ReactNode } from "react";
import styles from "./icon.module.css";

type IconName = "add" | "back" | "check" | "chevron-right" | "close" | "delete" | "edit" | "search" | "settings" | "time";

const ICON_LEAVES: Record<IconName, { readonly width: number; readonly height: number }> = {
  add: { width: 13.17, height: 13.17 },
  back: { width: 7.8, height: 13.8 },
  check: { width: 14.48, height: 10.82 },
  "chevron-right": { width: 6.5, height: 11.5 },
  close: { width: 13.8, height: 13.8 },
  delete: { width: 14.83, height: 14.83 },
  edit: { width: 14.1, height: 13.68 },
  search: { width: 14.83, height: 14.83 },
  settings: { width: 20, height: 20 },
  time: { width: 16.5, height: 16.5 },
};

/** Compact icon with separate explicit Figma outer-box and intrinsic leaf dimensions. */
export function Icon({
  name,
  size = 20,
}: {
  readonly name: IconName;
  readonly size?: number;
}): ReactNode {
  const leaf = ICON_LEAVES[name];
  return <span className={styles.icon} style={{ width: size, height: size }}><img src={`/calorie-tracker/calorie-tracker/${name}.svg`} width={leaf.width} height={leaf.height} alt="" /></span>;
}
