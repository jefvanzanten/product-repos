/** A brand returned by the current legacy Calorie Tracker endpoints. */
export interface CalorieTrackerBrand {
  readonly id: number;
  readonly name: string;
}

/** A unit returned by the current legacy Calorie Tracker endpoints. */
export interface CalorieTrackerUnit {
  readonly id: number;
  readonly type: string;
}

/** A product returned by the current legacy Calorie Tracker endpoints. */
export interface CalorieTrackerProduct {
  readonly id: number;
  readonly consumptionsId: number;
  readonly brandId: number | null;
  readonly servingContent: number;
  readonly servingUnitId: number;
  readonly content: number;
  readonly contentunitId: number;
  readonly brand: CalorieTrackerBrand | null;
  readonly servingUnit: CalorieTrackerUnit | null;
  readonly contentUnit: CalorieTrackerUnit | null;
}
