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
  type A4Calibration,
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
  showTemplateByRecipe: Record<RecipeType, boolean>;
  printModeByRecipe: Record<RecipeType, PrintMode>;
  a4CalibrationByRecipe: A4CalibrationByRecipe;
  templateOffsetByRecipe: Record<RecipeType, { xMm: number; yMm: number }>;
  templateRotationByRecipe: Record<RecipeType, number>;
  templateScaleByRecipe: Record<RecipeType, { x: number; y: number }>;
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
  showTemplateByRecipe: { A: true, B: true },
  printModeByRecipe: { A: "a4_auto", B: "a4_auto" },
  a4CalibrationByRecipe: DEFAULT_A4_CALIBRATION_BY_RECIPE,
  templateOffsetByRecipe: { A: { xMm: 0, yMm: 0 }, B: { xMm: 0, yMm: 0 } },
  templateRotationByRecipe: { A: 0, B: 0 },
  templateScaleByRecipe: { A: { x: 1, y: 1 }, B: { x: 1, y: 1 } }
};

function normalizePrefs(raw: unknown): Prefs {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const a4 = (obj.a4CalibrationByRecipe ?? DEFAULT_A4_CALIBRATION_BY_RECIPE) as Partial<A4CalibrationByRecipe>;
  const templateOffset = (obj.templateOffsetByRecipe ?? DEFAULT_PREFS.templateOffsetByRecipe) as Partial<
    Record<RecipeType, { xMm?: unknown; yMm?: unknown }>
  >;
  const bOffsetX = Number((a4.B as A4Calibration | undefined)?.offsetXMm ?? DEFAULT_A4_CALIBRATION_BY_RECIPE.B.offsetXMm);
  const bOffsetYRaw = Number((a4.B as A4Calibration | undefined)?.offsetYMm ?? DEFAULT_A4_CALIBRATION_BY_RECIPE.B.offsetYMm);
  const bScale = Number((a4.B as A4Calibration | undefined)?.scale ?? DEFAULT_A4_CALIBRATION_BY_RECIPE.B.scale);
  const bLooksLikeOldDefault = bOffsetX === 36 && bOffsetYRaw === -1 && bScale === 1;
  const bOffsetY = bLooksLikeOldDefault ? DEFAULT_A4_CALIBRATION_BY_RECIPE.B.offsetYMm : bOffsetYRaw;

  // Migrate old single showTemplate boolean → per-recipe object
  const rawShowByRecipe = obj.showTemplateByRecipe as Partial<Record<RecipeType, unknown>> | undefined;
  const oldShowTemplate = typeof obj.showTemplate === "boolean" ? obj.showTemplate : DEFAULT_PREFS.showTemplateByRecipe.A;
  const showTemplateByRecipe: Record<RecipeType, boolean> = {
    A: typeof rawShowByRecipe?.A === "boolean" ? rawShowByRecipe.A : oldShowTemplate,
    B: typeof rawShowByRecipe?.B === "boolean" ? rawShowByRecipe.B : oldShowTemplate
  };

  // Migrate old single printMode string → per-recipe object
  const rawModeByRecipe = obj.printModeByRecipe as Partial<Record<RecipeType, unknown>> | undefined;
  const oldPrintMode: PrintMode =
    obj.printMode === "exact_form" || obj.printMode === "a4_auto" ? (obj.printMode as PrintMode) : DEFAULT_PREFS.printModeByRecipe.A;
  const printModeByRecipe: Record<RecipeType, PrintMode> = {
    A: rawModeByRecipe?.A === "exact_form" || rawModeByRecipe?.A === "a4_auto" ? (rawModeByRecipe.A as PrintMode) : oldPrintMode,
    B: rawModeByRecipe?.B === "exact_form" || rawModeByRecipe?.B === "a4_auto" ? (rawModeByRecipe.B as PrintMode) : oldPrintMode
  };

  const rawRotByRecipe = obj.templateRotationByRecipe as Partial<Record<RecipeType, unknown>> | undefined;
  const templateRotationByRecipe: Record<RecipeType, number> = {
    A: typeof rawRotByRecipe?.A === "number" ? rawRotByRecipe.A : DEFAULT_PREFS.templateRotationByRecipe.A,
    B: typeof rawRotByRecipe?.B === "number" ? rawRotByRecipe.B : DEFAULT_PREFS.templateRotationByRecipe.B
  };

  const rawScaleByRecipe = obj.templateScaleByRecipe as Partial<Record<RecipeType, { x?: unknown; y?: unknown }>> | undefined;
  const readScale = (recipe: RecipeType): { x: number; y: number } => {
    const incoming = rawScaleByRecipe?.[recipe];
    const x = Number(incoming?.x);
    const y = Number(incoming?.y);
    return {
      x: Number.isFinite(x) && x > 0 ? x : DEFAULT_PREFS.templateScaleByRecipe[recipe].x,
      y: Number.isFinite(y) && y > 0 ? y : DEFAULT_PREFS.templateScaleByRecipe[recipe].y
    };
  };
  const templateScaleByRecipe: Record<RecipeType, { x: number; y: number }> = {
    A: readScale("A"),
    B: readScale("B")
  };

  return {
    recipeType: obj.recipeType === "A" || obj.recipeType === "B" ? (obj.recipeType as RecipeType) : DEFAULT_PREFS.recipeType,
    showTemplateByRecipe,
    printModeByRecipe,
    templateRotationByRecipe,
    templateScaleByRecipe,
    a4CalibrationByRecipe: {
      A: {
        offsetXMm: Number((a4.A as A4Calibration | undefined)?.offsetXMm ?? DEFAULT_A4_CALIBRATION_BY_RECIPE.A.offsetXMm),
        offsetYMm: Number((a4.A as A4Calibration | undefined)?.offsetYMm ?? DEFAULT_A4_CALIBRATION_BY_RECIPE.A.offsetYMm),
        scale: Number((a4.A as A4Calibration | undefined)?.scale ?? DEFAULT_A4_CALIBRATION_BY_RECIPE.A.scale)
      },
      B: {
        offsetXMm: bOffsetX,
        offsetYMm: bOffsetY,
        scale: bScale
      }
    },
    templateOffsetByRecipe: {
      A: {
        xMm: Number(templateOffset.A?.xMm ?? DEFAULT_PREFS.templateOffsetByRecipe.A.xMm),
        yMm: Number(templateOffset.A?.yMm ?? DEFAULT_PREFS.templateOffsetByRecipe.A.yMm)
      },
      B: {
        xMm: Number(templateOffset.B?.xMm ?? DEFAULT_PREFS.templateOffsetByRecipe.B.xMm),
        yMm: Number(templateOffset.B?.yMm ?? DEFAULT_PREFS.templateOffsetByRecipe.B.yMm)
      }
    }
  };
}

function simplifyAddressStreetNumber(address: string): string {
  return address
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      const clean = line.replace(/[ \t]+/g, " ").trim();
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
    })
    .join("\n")
    .trim();
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
  const [showTemplateByRecipe, setShowTemplateByRecipe] = useState<Record<RecipeType, boolean>>(savedPrefs.showTemplateByRecipe);
  const [printModeByRecipe, setPrintModeByRecipe] = useState<Record<RecipeType, PrintMode>>(savedPrefs.printModeByRecipe);
  const [a4CalibrationByRecipe, setA4CalibrationByRecipe] = useState<A4CalibrationByRecipe>(savedPrefs.a4CalibrationByRecipe);
  const [templateOffsetByRecipe, setTemplateOffsetByRecipe] = useState<Prefs["templateOffsetByRecipe"]>(savedPrefs.templateOffsetByRecipe);
  const [templateRotationByRecipe, setTemplateRotationByRecipe] = useState<Record<RecipeType, number>>(savedPrefs.templateRotationByRecipe);
  const [templateScaleByRecipe, setTemplateScaleByRecipe] = useState<Record<RecipeType, { x: number; y: number }>>(savedPrefs.templateScaleByRecipe);
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>(undefined);

  // Auto-save prefs (tipo de receita, template, modo de impressão, calibrações A4/template)
  // sempre que qualquer uma dessas preferências mudar — separadas por receita.
  useEffect(() => {
    savePrefs({ recipeType, showTemplateByRecipe, printModeByRecipe, a4CalibrationByRecipe, templateOffsetByRecipe, templateRotationByRecipe, templateScaleByRecipe });
  }, [recipeType, showTemplateByRecipe, printModeByRecipe, a4CalibrationByRecipe, templateOffsetByRecipe, templateRotationByRecipe, templateScaleByRecipe]);

  const [selectedCalFieldByRecipe, setSelectedCalFieldByRecipe] = useState<Record<RecipeType, string>>({ A: RECIPE_LAYOUT.A[0].id, B: RECIPE_LAYOUT.B[0].id });

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
      applyRecipeType = true,
      patient,
      address,
      dateDdMmYyyy,
      medication
    }: {
      recipeType: RecipeType;
      applyRecipeType?: boolean;
      patient: string;
      address: string;
      dateDdMmYyyy: string;
      medication?: ExtractedMed;
    }) => {
      if (applyRecipeType) setRecipeType(selectedType);
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

  const onTemplateOffsetChange = (key: "xMm" | "yMm", value: number) => {
    setTemplateOffsetByRecipe((prev) => ({
      ...prev,
      [recipeType]: {
        ...prev[recipeType],
        [key]: Number.isFinite(value) ? value : 0
      }
    }));
  };

  const onResetTemplateOffset = () => {
    setTemplateOffsetByRecipe((prev) => ({
      ...prev,
      [recipeType]: { ...DEFAULT_PREFS.templateOffsetByRecipe[recipeType] }
    }));
    setTemplateRotationByRecipe((prev) => ({
      ...prev,
      [recipeType]: DEFAULT_PREFS.templateRotationByRecipe[recipeType]
    }));
    setTemplateScaleByRecipe((prev) => ({
      ...prev,
      [recipeType]: { ...DEFAULT_PREFS.templateScaleByRecipe[recipeType] }
    }));
  };

  const onTemplateScaleChange = (axis: "x" | "y", value: number) => {
    const safe = Number.isFinite(value) ? Math.max(0.2, Math.round(value * 1000) / 1000) : 1;
    setTemplateScaleByRecipe((prev) => ({
      ...prev,
      [recipeType]: {
        ...prev[recipeType],
        [axis]: safe
      }
    }));
  };

  const onTemplateRotationChange = (deltaDeg: number) => {
    setTemplateRotationByRecipe((prev) => ({
      ...prev,
      [recipeType]: Math.round((prev[recipeType] + deltaDeg) * 10) / 10
    }));
  };

  const onClearAll = () => {
    clearStoredData();
    setValues(DEFAULT_VALUES);
    setCalibration(defaultCalibration());
    setRecipeType(DEFAULT_PREFS.recipeType);
    setShowTemplateByRecipe(DEFAULT_PREFS.showTemplateByRecipe);
    setPrintModeByRecipe(DEFAULT_PREFS.printModeByRecipe);
    setA4CalibrationByRecipe(DEFAULT_A4_CALIBRATION_BY_RECIPE);
    setTemplateOffsetByRecipe(DEFAULT_PREFS.templateOffsetByRecipe);
    setTemplateRotationByRecipe(DEFAULT_PREFS.templateRotationByRecipe);
    setTemplateScaleByRecipe(DEFAULT_PREFS.templateScaleByRecipe);
    setSelectedCalFieldByRecipe({ A: RECIPE_LAYOUT.A[0].id, B: RECIPE_LAYOUT.B[0].id });
    setLastSavedAt(undefined);
  };

  const onSaveSettings = useCallback(() => {
    saveValues(values);
    saveCalibration(calibration);
    savePrefs({ recipeType, showTemplateByRecipe, printModeByRecipe, a4CalibrationByRecipe, templateOffsetByRecipe, templateRotationByRecipe, templateScaleByRecipe });
    setLastSavedAt(Date.now());
  }, [a4CalibrationByRecipe, calibration, printModeByRecipe, recipeType, showTemplateByRecipe, templateOffsetByRecipe, templateRotationByRecipe, templateScaleByRecipe, values]);

  return (
    <div className={`app-shell recipe-${recipeType.toLowerCase()}`}>
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">Rx</span>
          <div>
            <p className="eyebrow">Prescricao local</p>
            <h1>Receita pronta.</h1>
          </div>
        </div>
        <p className="header-copy">
          Importe, revise e imprima com a calibracao certa. Seus dados permanecem neste navegador.
        </p>
        <div className="header-status" aria-label="Status atual">
          <span className="status-chip status-chip-strong">Receita {recipeType}</span>
          <span className="status-chip">
            {printModeByRecipe[recipeType] === "a4_auto" ? "A4 automatico" : "Tamanho exato"}
          </span>
          <span className={`status-chip ${showTemplateByRecipe[recipeType] ? "is-on" : ""}`}>
            Template {showTemplateByRecipe[recipeType] ? "visivel" : "oculto"}
          </span>
        </div>
      </header>

      <main className="app-workspace">
        <aside className="left-panel" aria-label="Dados da receita">
          <PdfImport activeRecipeType={recipeType} onPrefill={onPrefillFromPdf} />

          <FormPanel
            recipeType={recipeType}
            setRecipeType={setRecipeType}
            showTemplate={showTemplateByRecipe[recipeType]}
            setShowTemplate={(value) => setShowTemplateByRecipe((prev) => ({ ...prev, [recipeType]: value }))}
            values={values}
            onValueChange={onValueChange}
            onResetCalibration={onResetCalibration}
            onClearAll={onClearAll}
            onSaveSettings={onSaveSettings}
            printFields={preview.fields}
            addressInfo={preview.addressInfo}
            printMode={printModeByRecipe[recipeType]}
            onPrintModeChange={(mode) => setPrintModeByRecipe((prev) => ({ ...prev, [recipeType]: mode }))}
            a4Calibration={a4CalibrationByRecipe[recipeType]}
            onA4CalibrationChange={onA4CalibrationChange}
            onResetA4Calibration={onResetA4Calibration}
            templateOffset={templateOffsetByRecipe[recipeType]}
            onTemplateOffsetChange={onTemplateOffsetChange}
            templateRotation={templateRotationByRecipe[recipeType]}
            onTemplateRotationChange={onTemplateRotationChange}
            templateScale={templateScaleByRecipe[recipeType]}
            onTemplateScaleChange={onTemplateScaleChange}
            onResetTemplateOffset={onResetTemplateOffset}
            liveCoordinates={liveCoordinates}
            lastSavedAt={lastSavedAt}
          />
        </aside>

        <section className="right-panel" aria-label="Preview da receita">
          <div className="preview-toolbar">
            <div>
              <p className="eyebrow">Mesa de impressao</p>
              <h2>Preview ao vivo</h2>
            </div>
            <div className="preview-legend">
              <span><i className="legend-dot legend-field" />Arraste os textos</span>
              <span><i className="legend-dot legend-template" />Alt + arraste o fundo</span>
            </div>
          </div>
          <div className="preview-stage">
            <PreviewPaper
              recipeType={recipeType}
              showTemplate={showTemplateByRecipe[recipeType]}
              templateOffset={templateOffsetByRecipe[recipeType]}
              onTemplateOffsetChange={onTemplateOffsetChange}
              templateRotation={templateRotationByRecipe[recipeType]}
              templateScale={templateScaleByRecipe[recipeType]}
              onTemplateScaleChange={onTemplateScaleChange}
              fields={preview.fields}
              selectedFieldId={selectedCalFieldId}
              onSelectField={(fieldId) => setSelectedCalFieldByRecipe((prev) => ({ ...prev, [recipeType]: fieldId }))}
              onMoveSelectedField={onMoveSelectedField}
              printMode={printModeByRecipe[recipeType]}
              a4Calibration={a4CalibrationByRecipe[recipeType]}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

