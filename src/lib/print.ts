import type { RecipeType } from "./layout";

export type PrintMode = "exact_form" | "a4_auto";

export type A4Calibration = {
  offsetXMm: number;
  offsetYMm: number;
  scale: number;
};

export type A4CalibrationByRecipe = Record<RecipeType, A4Calibration>;

export const DEFAULT_A4_CALIBRATION_BY_RECIPE: A4CalibrationByRecipe = {
  A: { offsetXMm: 33, offsetYMm: 0, scale: 1 },
  B: { offsetXMm: 36, offsetYMm: 1, scale: 1 }
};

