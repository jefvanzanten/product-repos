/** Stable definition of one displayed nutrition statistic. */
export type StatisticDefinition = {
  readonly key: "caloriesKcal" | "proteinG" | "carbohydratesG" | "fatG";
  readonly label: string;
  readonly unit: "kcal" | "g";
  readonly fractions: number;
};

/** Ordered dashboard statistic definitions shared by statistics presentation. */
export const STATISTICS: ReadonlyArray<StatisticDefinition> = [
  { key: "caloriesKcal", label: "Calorieën", unit: "kcal", fractions: 0 },
  { key: "proteinG", label: "Eiwit", unit: "g", fractions: 1 },
  { key: "carbohydratesG", label: "Koolhydraten", unit: "g", fractions: 1 },
  { key: "fatG", label: "Vet", unit: "g", fractions: 1 },
];
