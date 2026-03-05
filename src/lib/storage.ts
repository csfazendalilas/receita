import { RECIPE_LAYOUT, type RecipeType } from "./layout";

export type FieldCalibration = {
  xOffsetMm: number;
  yOffsetMm: number;
  fontSizePt: number;
  minFontPt: number;
  letterSpacingPt: number;
};

export type RecipeCalibration = {
  globalXOffsetMm: number;
  globalYOffsetMm: number;
  fields: Record<string, FieldCalibration>;
};

export type CalibrationState = Record<RecipeType, RecipeCalibration>;

const KEY_CALIBRATION = "rx-print.calibration.v1";
const KEY_VALUES = "rx-print.values.v1";
const KEY_PREFS = "rx-print.prefs.v1";

export function defaultCalibration(): CalibrationState {
  return {
    A: {
      globalXOffsetMm: 0,
      globalYOffsetMm: 0,
      fields: Object.fromEntries(
        RECIPE_LAYOUT.A.map((field) => [
          field.id,
          {
            xOffsetMm: 0,
            yOffsetMm: 0,
            fontSizePt: field.defaultFontPt,
            minFontPt: field.minFontPt,
            letterSpacingPt: field.defaultLetterSpacingPt
          }
        ])
      )
    },
    B: {
      globalXOffsetMm: 0,
      globalYOffsetMm: 0,
      fields: Object.fromEntries(
        RECIPE_LAYOUT.B.map((field) => [
          field.id,
          {
            xOffsetMm: 0,
            yOffsetMm: 0,
            fontSizePt: field.defaultFontPt,
            minFontPt: field.minFontPt,
            letterSpacingPt: field.defaultLetterSpacingPt
          }
        ])
      )
    }
  };
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadCalibration(): CalibrationState {
  const saved = readJson<CalibrationState>(KEY_CALIBRATION);
  if (!saved) return defaultCalibration();

  const base = defaultCalibration();
  for (const recipeType of ["A", "B"] as RecipeType[]) {
    const savedRecipe = saved[recipeType];
    if (!savedRecipe) continue;

    base[recipeType].globalXOffsetMm = Number(savedRecipe.globalXOffsetMm ?? 0);
    base[recipeType].globalYOffsetMm = Number(savedRecipe.globalYOffsetMm ?? 0);

    for (const fieldId of Object.keys(base[recipeType].fields)) {
      const target = base[recipeType].fields[fieldId];
      const incoming = savedRecipe.fields?.[fieldId];
      if (!incoming) continue;
      target.xOffsetMm = Number(incoming.xOffsetMm ?? target.xOffsetMm);
      target.yOffsetMm = Number(incoming.yOffsetMm ?? target.yOffsetMm);
      target.fontSizePt = Number(incoming.fontSizePt ?? target.fontSizePt);
      target.minFontPt = Number(incoming.minFontPt ?? target.minFontPt);
      target.letterSpacingPt = Number(incoming.letterSpacingPt ?? target.letterSpacingPt);
    }
  }

  return base;
}

export function saveCalibration(value: CalibrationState): void {
  writeJson(KEY_CALIBRATION, value);
}

export function loadValues<T>(fallback: T): T {
  return readJson<T>(KEY_VALUES) ?? fallback;
}

export function saveValues<T>(value: T): void {
  writeJson(KEY_VALUES, value);
}

export function loadPrefs<T>(fallback: T): T {
  return readJson<T>(KEY_PREFS) ?? fallback;
}

export function savePrefs<T>(value: T): void {
  writeJson(KEY_PREFS, value);
}

export function clearStoredData(): void {
  localStorage.removeItem(KEY_CALIBRATION);
  localStorage.removeItem(KEY_VALUES);
  localStorage.removeItem(KEY_PREFS);
}
