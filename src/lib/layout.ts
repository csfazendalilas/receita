export type RecipeType = "A" | "B";

export type FieldLayout = {
  id: string;
  label: string;
  xMm: number;
  yMm: number;
  maxWidthMm: number;
  defaultFontPt: number;
  minFontPt: number;
  defaultLetterSpacingPt: number;
};

export type PaperConfig = {
  widthMm: number;
  heightMm: number;
  templateImage: string;
};

export const PAPER_CONFIG: Record<RecipeType, PaperConfig> = {
  A: { widthMm: 219, heightMm: 100, templateImage: "/A.png" },
  B: { widthMm: 212, heightMm: 96, templateImage: "/B.png" }
};

export const RECIPE_A_LAYOUT: FieldLayout[] = [
  { id: "date", label: "Data", xMm: 22.7, yMm: 38.2, maxWidthMm: 60, defaultFontPt: 11, minFontPt: 8, defaultLetterSpacingPt: 0 },
  { id: "patient", label: "Paciente", xMm: 94.1, yMm: 41.4, maxWidthMm: 130, defaultFontPt: 11, minFontPt: 7, defaultLetterSpacingPt: 0 },
  { id: "address", label: "Endereco", xMm: 94.1, yMm: 51.2, maxWidthMm: 130, defaultFontPt: 8, minFontPt: 6, defaultLetterSpacingPt: 0 },
  { id: "drug_name", label: "Medicamento", xMm: 167.8, yMm: 20.6, maxWidthMm: 62, defaultFontPt: 9, minFontPt: 6, defaultLetterSpacingPt: 0 },
  { id: "qty", label: "Quantidade e apresentacao", xMm: 167.2, yMm: 31.1, maxWidthMm: 62, defaultFontPt: 9, minFontPt: 6, defaultLetterSpacingPt: 0 },
  { id: "form_posology", label: "Form. Farm. Concentr./Unid. Posologia", xMm: 166.7, yMm: 44.2, maxWidthMm: 62, defaultFontPt: 8, minFontPt: 6, defaultLetterSpacingPt: 0 }
];

export const RECIPE_B_LAYOUT: FieldLayout[] = [
  { id: "date_full", label: "Data por extenso", xMm: 8.7, yMm: 31.0, maxWidthMm: 55, defaultFontPt: 10, minFontPt: 7, defaultLetterSpacingPt: 0 },
  { id: "patient", label: "Paciente", xMm: 72.2, yMm: 33.6, maxWidthMm: 120, defaultFontPt: 10, minFontPt: 7, defaultLetterSpacingPt: 0 },
  { id: "address", label: "Endereco", xMm: 72.5, yMm: 47.1, maxWidthMm: 120, defaultFontPt: 9, minFontPt: 6, defaultLetterSpacingPt: 0 },
  { id: "drug", label: "Medicamento ou Substancia", xMm: 163.9, yMm: 16.0, maxWidthMm: 58, defaultFontPt: 8.5, minFontPt: 6, defaultLetterSpacingPt: 0 },
  { id: "qty_form", label: "Quantidade e Forma Farmaceutica", xMm: 163.3, yMm: 29.4, maxWidthMm: 58, defaultFontPt: 8.5, minFontPt: 6, defaultLetterSpacingPt: 0 },
  { id: "dose_unit", label: "Dose por Unidade Posologica", xMm: 162.7, yMm: 42.9, maxWidthMm: 58, defaultFontPt: 8.5, minFontPt: 6, defaultLetterSpacingPt: 0 },
  { id: "posology", label: "Posologia", xMm: 161.5, yMm: 55.7, maxWidthMm: 58, defaultFontPt: 8.5, minFontPt: 6, defaultLetterSpacingPt: 0 }
];

export const RECIPE_LAYOUT: Record<RecipeType, FieldLayout[]> = {
  A: RECIPE_A_LAYOUT,
  B: RECIPE_B_LAYOUT
};
