import { useCallback, useEffect, useMemo, useState } from "react";
import FormPanel, { type FormValues } from "./components/FormPanel";
import PdfImport from "./components/PdfImport";
import PreviewPaper from "./components/PreviewPaper";
import type { PrintField } from "./components/PrintButton";
import { shortenAddress } from "./lib/addressShortener";
import { formatDateFullPt } from "./lib/datePt";
import { RECIPE_LAYOUT, type FieldLayout, type RecipeType } from "./lib/layout";
import {
  DEFAULT_A4_CALIBRATION_BY_RECIPE,
  type A4CalibrationByRecipe,
  type PrintMode
} from "./lib/print";
import { fitTextToWidth } from "./lib/textFit";
import {
  clearStoredData,
  defaultCalibration,
  loadCalibration,
  loadPrefs,
  loadValues,
  saveCalibration,
  savePrefs,
  saveValues,
  type CalibrationState
} from "./lib/storage";
import type { ExtractedMed } from "./lib/pdfExtract";

type Prefs = {
  recipeType: RecipeType;
  showTemplate: boolean;
  printMode: PrintMode;
  a4CalibrationByRecipe: A4CalibrationByRecipe;
};

const UNIFORM_A_FONT_PT = 9;

type AddressInfo = {
  status: "fits" | "overflow";
  finalText: string;
};

const DEFAULT_VALUES: FormValues = {
  a_date: "",
  a_patient: "",
  a_address: "",
  a_address_override: "",
  a_use_city_abbrev: false,
  a_drug_name: "",
  a_qty: "",
  a_form_posology: "",
  b_date: "",
  b_patient: "",
  b_address: "",
  b_address_override: "",
  b_use_city_abbrev: false,
  b_drug: "",
  b_qty_form: "",
  b_dose_unit: "",
  b_posology: ""
};

const DEFAULT_PREFS: Prefs = {
  recipeType: "B",
  showTemplate: true,
  printMode: "a4_auto",
  a4CalibrationByRecipe: DEFAULT_A4_CALIBRATION_BY_RECIPE
};

function normalizePrefs(raw: unknown): Prefs {
  const obj = (raw ?? {}) as Partial<Prefs>;
  const a4 = obj.a4CalibrationByRecipe ?? DEFAULT_A4_CALIBRATION_BY_RECIPE;
  return {
    recipeType: obj.recipeType === "A" || obj.recipeType === "B" ? obj.recipeType : DEFAULT_PREFS.recipeType,
    showTemplate: typeof obj.showTemplate === "boolean" ? obj.showTemplate : DEFAULT_PREFS.showTemplate,
    printMode: obj.printMode === "exact_form" || obj.printMode === "a4_auto" ? obj.printMode : DEFAULT_PREFS.printMode,
    a4CalibrationByRecipe: {
      A: {
        offsetXMm: Number(a4.A?.offsetXMm ?? DEFAULT_A4_CALIBRATION_BY_RECIPE.A.offsetXMm),
        offsetYMm: Number(a4.A?.offsetYMm ?? DEFAULT_A4_CALIBRATION_BY_RECIPE.A.offsetYMm),
        scale: Number(a4.A?.scale ?? DEFAULT_A4_CALIBRATION_BY_RECIPE.A.scale)
      },
      B: {
        offsetXMm: Number(a4.B?.offsetXMm ?? DEFAULT_A4_CALIBRATION_BY_RECIPE.B.offsetXMm),
        offsetYMm: Number(a4.B?.offsetYMm ?? DEFAULT_A4_CALIBRATION_BY_RECIPE.B.offsetYMm),
        scale: Number(a4.B?.scale ?? DEFAULT_A4_CALIBRATION_BY_RECIPE.B.scale)
      }
    }
  };
}

function simplifyAddressStreetNumber(address: string): string {
  const clean = address.replace(/\s+/g, " ").trim();
  if (!clean) return "";

  const parts = clean.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return clean;

  const street = parts[0];
  let number = "";

  for (const part of parts.slice(1)) {
    const m = /(\d+[A-Za-z\-\/]*)/.exec(part);
    if (m?.[1]) {
      number = m[1];
      break;
    }
  }

  return number ? `${street}, ${number}` : street;
}

function getRawFieldValue(recipeType: RecipeType, fieldId: string, values: FormValues): string {
  if (recipeType === "A") {
    const map: Record<string, string> = {
      date: formatDateFullPt(values.a_date),
      patient: values.a_patient,
      address: simplifyAddressStreetNumber(values.a_address),
      drug_name: values.a_drug_name,
      qty: values.a_qty,
      form_posology: values.a_form_posology
    };
    return map[fieldId] ?? "";
  }

  const map: Record<string, string> = {
    date_full: formatDateFullPt(values.b_date),
    patient: values.b_patient,
    address: simplifyAddressStreetNumber(values.b_address),
    drug: values.b_drug,
    qty_form: values.b_qty_form,
    dose_unit: values.b_dose_unit,
    posology: values.b_posology
  };
  return map[fieldId] ?? "";
}

function computeAddressCandidate(options: {
  address: string;
  override: string;
  allowCityAbbrev: boolean;
  maxWidthMm: number;
  preferredFontPt: number;
  minFontPt: number;
  letterSpacingPt: number;
}): { candidate: string } {
  const {
    address,
    override,
    allowCityAbbrev,
    maxWidthMm,
    preferredFontPt,
    minFontPt,
    letterSpacingPt
  } = options;

  if (override.trim()) return { candidate: override.trim() };
  if (!address.trim()) return { candidate: "" };

  const originalFit = fitTextToWidth({ text: address, maxWidthMm, preferredFontPt, minFontPt, letterSpacingPt });
  if (originalFit.fitsWithoutTruncation) return { candidate: address.trim() };

  const shortBase = shortenAddress(address, { allowCityAbbrev: false });
  const baseFit = fitTextToWidth({ text: shortBase, maxWidthMm, preferredFontPt, minFontPt, letterSpacingPt });
  if (baseFit.fitsWithoutTruncation || !allowCityAbbrev) return { candidate: shortBase };

  const cityShort = shortenAddress(address, { allowCityAbbrev: true });
  return { candidate: cityShort };
}

function buildPrintFields(recipeType: RecipeType, values: FormValues, calibration: CalibrationState): { fields: PrintField[]; addressInfo: AddressInfo } {
  const layout = RECIPE_LAYOUT[recipeType];
  const recipeCal = calibration[recipeType];
  let addressInfo: AddressInfo = { status: "fits", finalText: "" };

  const fields: PrintField[] = layout.map((field) => {
    const fieldCal = recipeCal.fields[field.id];
    let raw = getRawFieldValue(recipeType, field.id, values);

    if (field.id === "address") {
      const override = recipeType === "A" ? values.a_address_override : values.b_address_override;
      const allowCity = recipeType === "A" ? values.a_use_city_abbrev : values.b_use_city_abbrev;
      raw = computeAddressCandidate({
        address: raw,
        override,
        allowCityAbbrev: allowCity,
        maxWidthMm: field.maxWidthMm,
        preferredFontPt: recipeType === "A" ? UNIFORM_A_FONT_PT : fieldCal.fontSizePt,
        minFontPt: recipeType === "A" ? UNIFORM_A_FONT_PT : fieldCal.minFontPt,
        letterSpacingPt: fieldCal.letterSpacingPt
      }).candidate;
    }

    const fitted = fitTextToWidth({
      text: raw,
      maxWidthMm: field.maxWidthMm,
      preferredFontPt: recipeType === "A" ? UNIFORM_A_FONT_PT : fieldCal.fontSizePt,
      minFontPt: recipeType === "A" ? UNIFORM_A_FONT_PT : fieldCal.minFontPt,
      letterSpacingPt: fieldCal.letterSpacingPt
    });

    if (field.id === "address") {
      addressInfo = { status: fitted.fitsWithoutTruncation ? "fits" : "overflow", finalText: fitted.text };
    }

    return {
      id: field.id,
      text: fitted.text,
      xMm: field.xMm + recipeCal.globalXOffsetMm + fieldCal.xOffsetMm,
      yMm: field.yMm + recipeCal.globalYOffsetMm + fieldCal.yOffsetMm,
      maxWidthMm: field.maxWidthMm,
      fontSizePt: fitted.fontSizePt,
      letterSpacingPt: fieldCal.letterSpacingPt
    };
  });

  return { fields, addressInfo };
}

function mapMedication(recipeType: RecipeType, med?: ExtractedMed): Partial<FormValues> {
  if (!med) return {};
  const formAndConcentration = [med.formPharma, med.concentration].filter(Boolean).join(" ");

  if (recipeType === "A") {
    const formUnitPosology = [med.concentration, med.posologyUnit || med.posology].filter(Boolean).join(" ");
    return { a_drug_name: med.name, a_qty: med.qtyText || "", a_form_posology: formUnitPosology };
  }

  return { b_drug: med.name, b_qty_form: med.qtyText || "", b_dose_unit: formAndConcentration, b_posology: med.posology };
}

export default function App() {
  const savedPrefs = normalizePrefs(loadPrefs<unknown>(DEFAULT_PREFS));

  const [values, setValues] = useState<FormValues>(() => loadValues<FormValues>(DEFAULT_VALUES));
  const [calibration, setCalibration] = useState<CalibrationState>(() => loadCalibration());
  const [recipeType, setRecipeType] = useState<RecipeType>(savedPrefs.recipeType);
  const [showTemplate, setShowTemplate] = useState<boolean>(savedPrefs.showTemplate);
  const [printMode, setPrintMode] = useState<PrintMode>(savedPrefs.printMode);
  const [a4CalibrationByRecipe, setA4CalibrationByRecipe] = useState<A4CalibrationByRecipe>(savedPrefs.a4CalibrationByRecipe);
  const [autoPrintToken, setAutoPrintToken] = useState(0);

  const [selectedCalFieldByRecipe, setSelectedCalFieldByRecipe] = useState<Record<RecipeType, string>>({ A: RECIPE_LAYOUT.A[0].id, B: RECIPE_LAYOUT.B[0].id });

  useEffect(() => saveValues(values), [values]);
  useEffect(() => saveCalibration(calibration), [calibration]);
  useEffect(() => savePrefs({ recipeType, showTemplate, printMode, a4CalibrationByRecipe }), [recipeType, showTemplate, printMode, a4CalibrationByRecipe]);

  const preview = useMemo(() => buildPrintFields(recipeType, values, calibration), [recipeType, values, calibration]);
  const liveCoordinates = useMemo(() => {
    const layoutById = new Map<string, FieldLayout>(RECIPE_LAYOUT[recipeType].map((item) => [item.id, item]));
    return preview.fields.map((field) => ({
      id: field.id,
      label: layoutById.get(field.id)?.label ?? field.id,
      xMm: field.xMm,
      yMm: field.yMm
    }));
  }, [recipeType, preview.fields]);
  const selectedCalFieldId = selectedCalFieldByRecipe[recipeType];

  const onValueChange = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const onPrefillFromPdf = useCallback(
    ({
      recipeType: selectedType,
      patient,
      address,
      dateDdMmYyyy,
      medication,
      autoPrint
    }: {
      recipeType: RecipeType;
      patient: string;
      address: string;
      dateDdMmYyyy: string;
      medication?: ExtractedMed;
      autoPrint?: boolean;
    }) => {
      setRecipeType(selectedType);
      setValues((prev) => ({
        ...prev,
        ...(selectedType === "A"
          ? {
              a_date: dateDdMmYyyy || prev.a_date,
              a_patient: patient || prev.a_patient,
              a_address: simplifyAddressStreetNumber(address || prev.a_address)
            }
          : {
              b_date: dateDdMmYyyy || prev.b_date,
              b_patient: patient || prev.b_patient,
              b_address: simplifyAddressStreetNumber(address || prev.b_address)
            }),
        ...mapMedication(selectedType, medication)
      }));

      if (autoPrint) setAutoPrintToken((prev) => prev + 1);
    },
    []
  );

  const onMoveSelectedField = (targetXMm: number, targetYMm: number) => {
    const layoutField = RECIPE_LAYOUT[recipeType].find((field) => field.id === selectedCalFieldId);
    if (!layoutField) return;

    setCalibration((prev) => {
      const recipeCal = prev[recipeType];
      const newXOffset = targetXMm - layoutField.xMm - recipeCal.globalXOffsetMm;
      const newYOffset = targetYMm - layoutField.yMm - recipeCal.globalYOffsetMm;

      return {
        ...prev,
        [recipeType]: {
          ...recipeCal,
          fields: {
            ...recipeCal.fields,
            [selectedCalFieldId]: {
              ...recipeCal.fields[selectedCalFieldId],
              xOffsetMm: Math.round(newXOffset * 100) / 100,
              yOffsetMm: Math.round(newYOffset * 100) / 100
            }
          }
        }
      };
    });
  };

  const onResetCalibration = () => {
    setCalibration(defaultCalibration());
    setA4CalibrationByRecipe(DEFAULT_A4_CALIBRATION_BY_RECIPE);
  };

  const onA4CalibrationChange = (key: "offsetXMm" | "offsetYMm" | "scale", value: number) => {
    setA4CalibrationByRecipe((prev) => ({
      ...prev,
      [recipeType]: {
        ...prev[recipeType],
        [key]: Number.isFinite(value) ? value : 0
      }
    }));
  };

  const onResetA4Calibration = () => {
    setA4CalibrationByRecipe((prev) => ({
      ...prev,
      [recipeType]: { ...DEFAULT_A4_CALIBRATION_BY_RECIPE[recipeType] }
    }));
  };

  const onClearAll = () => {
    clearStoredData();
    setValues(DEFAULT_VALUES);
    setCalibration(defaultCalibration());
    setRecipeType(DEFAULT_PREFS.recipeType);
    setShowTemplate(DEFAULT_PREFS.showTemplate);
    setPrintMode(DEFAULT_PREFS.printMode);
    setA4CalibrationByRecipe(DEFAULT_A4_CALIBRATION_BY_RECIPE);
    setSelectedCalFieldByRecipe({ A: RECIPE_LAYOUT.A[0].id, B: RECIPE_LAYOUT.B[0].id });
  };

  return (
    <div className="app-shell">
      <div className="left-panel">
        <PdfImport activeRecipeType={recipeType} onPrefill={onPrefillFromPdf} />

        <FormPanel
          recipeType={recipeType}
          setRecipeType={setRecipeType}
          showTemplate={showTemplate}
          setShowTemplate={setShowTemplate}
          values={values}
          onValueChange={onValueChange}
          onResetCalibration={onResetCalibration}
          onClearAll={onClearAll}
          printFields={preview.fields}
          addressInfo={preview.addressInfo}
          printMode={printMode}
          onPrintModeChange={setPrintMode}
          a4Calibration={a4CalibrationByRecipe[recipeType]}
          onA4CalibrationChange={onA4CalibrationChange}
          onResetA4Calibration={onResetA4Calibration}
          liveCoordinates={liveCoordinates}
          autoPrintToken={autoPrintToken}
        />
      </div>

      <div className="right-panel">
        <h2>Preview ao vivo</h2>
        <PreviewPaper
          recipeType={recipeType}
          showTemplate={showTemplate}
          fields={preview.fields}
          selectedFieldId={selectedCalFieldId}
          onSelectField={(fieldId) => setSelectedCalFieldByRecipe((prev) => ({ ...prev, [recipeType]: fieldId }))}
          onMoveSelectedField={onMoveSelectedField}
        />
      </div>
    </div>
  );
}
