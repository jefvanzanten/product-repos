import type { ConsumptionType } from "../../../domain/consumption-types";
import type { ReactNode } from "react";
import styles from "./product-image.module.css";

/** Exact local placeholder or catalog image for a package. */
export function ProductImage({
  type,
  imageUrl,
  size = "regular",
}: {
  readonly type: ConsumptionType | null;
  readonly imageUrl: string | null;
  readonly size?: "regular" | "large";
}): ReactNode {
  const fallback = type === "DRINK"
    ? "product-placeholder-drink.svg"
    : type === "SUPPLEMENT"
      ? "product-placeholder-supplement.svg"
      : "product-placeholder-food.svg";
  const pixelSize = size === "large" ? 80 : 62;
  return (
    <img
      className={styles.productImage}
      src={imageUrl ?? `/calorie-tracker/calorie-tracker/${fallback}`}
      width={pixelSize}
      height={pixelSize}
      alt=""
      onError={(event) => {
        event.currentTarget.src = `/calorie-tracker/calorie-tracker/${fallback}`;
      }}
    />
  );
}
