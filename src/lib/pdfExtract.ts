import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;

export type ExtractedMed = {
  name: string;
  qtyText: string;
  posology: string;
  posologyUnit: string;
  formPharma: string;
  concentration: string;
  rawBlock: string;
};

export type ExtractedRx = {
  patientName: string;
  address: string;
  dateDdMmYyyy: string;
  meds: ExtractedMed[];
  fullText: string;
};

const ONLY_NUMBER_RE = /^\d+([\.,]\d+)?$/;
const QTY_WITH_UNIT_RE = /^(\d+)\s*(COMPRIMIDO\(S\)|COMPRIMIDOS?|CP|CAIXA\(S\)|CAIXAS?|CAIXA|FRASCO\(S\)|FRASCOS?|FRASCO)\b/i;
const CONCENTRATION_RATIO_RE = /(\d+(?:[\.,]\d+)?)\s*(MG|ML|MCG|G|UI)\s*\/\s*(MG|ML|MCG|G|UI)\b/i;
const CONCENTRATION_SIMPLE_RE = /(\d+(?:[\.,]\d+)?)\s*(MG|ML|MCG|G|UI)\b/i;

const MONTHS_PT: Record<string, string> = {
  janeiro: "01",
  fevereiro: "02",
  marco: "03",
  abril: "04",
  maio: "05",
  junho: "06",
  julho: "07",
  agosto: "08",
  setembro: "09",
  outubro: "10",
  novembro: "11",
  dezembro: "12"
};

function stripDiacritics(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function cleanSpaces(text: string): string {
  return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function textToLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
}

function isMetaLine(line: string): boolean {
  return /^(dados do paciente|idade:|cpf:|cns:|nome social:|nome da m[ãa]e:|data nascimento:|crm|sus|secretaria|emitido por|receitu[áa]rio|data:|quantidade prescrita:|oral|uso cont[ií]nuo)/i.test(
    line
  );
}

function extractPatient(lines: string[]): string {
  for (const line of lines) {
    if (/^nome\s*social\s*:/i.test(line)) continue;
    if (/^nome\s+da\s+m[ãa]e\s*:/i.test(line)) continue;
    const m = /^nome\s*:\s*(.+)$/i.exec(line);
    if (m?.[1]) {
      return m[1].replace(/\s*\(\s*\d+\s*\)\s*$/, "").trim();
    }
  }
  return "";
}

function extractAddress(lines: string[]): string {
  for (const line of lines) {
    if (/endere/i.test(line)) {
      const parts = line.split(":");
      if (parts.length > 1) {
        return parts.slice(1).join(":").trim();
      }
    }
  }
  return "";
}

function extractDate(text: string, lines: string[]): string {
  for (const line of lines) {
    const m = /^data\s*:\s*(\d{2}\/\d{2}\/\d{4})/i.exec(line);
    if (m?.[1]) return m[1];
  }

  const emitted = /Emitido .*? em (\d{2}\/\d{2}\/\d{4})/i.exec(text);
  if (emitted?.[1]) return emitted[1];

  const textDate = /(\d{1,2})\s+de\s+([A-Za-zÀ-ÿ]+)\s+de\s+(\d{4})/i.exec(text);
  if (textDate?.[1] && textDate?.[2] && textDate?.[3]) {
    const monthKey = stripDiacritics(textDate[2]).toLowerCase();
    const month = MONTHS_PT[monthKey];
    if (month) {
      return `${textDate[1].padStart(2, "0")}/${month}/${textDate[3]}`;
    }
  }

  const generic = /(\d{2}\/\d{2}\/\d{4})/.exec(text);
  return generic?.[1] ?? "";
}

function normalizeQtyUnit(unit: string): string {
  const safe = stripDiacritics(unit).toUpperCase();
  if (/COMPRIMIDO|\bCP\b/.test(safe)) return "CP";
  if (/CAIXA/.test(safe)) return "CAIXA";
  if (/FRASCO/.test(safe)) return "FRASCO";
  return safe;
}

function findNearestQty(lines: string[], startIdx: number): { qtyNumber: number; explicitQtyText: string } {
  for (let i = startIdx; i >= Math.max(0, startIdx - 5); i -= 1) {
    const line = lines[i];

    const qtyWithUnit = QTY_WITH_UNIT_RE.exec(line);
    if (qtyWithUnit?.[1] && qtyWithUnit?.[2]) {
      const qtyNumber = Number(qtyWithUnit[1]);
      return { qtyNumber, explicitQtyText: `${qtyNumber} ${normalizeQtyUnit(qtyWithUnit[2])}` };
    }

    if (ONLY_NUMBER_RE.test(line)) {
      return { qtyNumber: Number(line.replace(",", ".")), explicitQtyText: "" };
    }
  }

  return { qtyNumber: 1, explicitQtyText: "" };
}

function isQtyLine(line: string): boolean {
  return QTY_WITH_UNIT_RE.test(line) || ONLY_NUMBER_RE.test(line);
}

function findNearestDrugName(lines: string[], posologyIdx: number): string {
  for (let i = posologyIdx - 1; i >= Math.max(0, posologyIdx - 8); i -= 1) {
    const line = lines[i];
    if (isMetaLine(line)) continue;
    if (/^posologia\s*:/i.test(line)) continue;
    if (isQtyLine(line)) continue;
    if (line.length < 3) continue;
    return line.trim();
  }
  return "";
}

function splitDrugAndConcentration(rawName: string): { name: string; concentration: string; isRatio: boolean } {
  const ratio = CONCENTRATION_RATIO_RE.exec(rawName);
  if (ratio) {
    const concentration = `${ratio[1].replace(",", ".")} ${ratio[2].toUpperCase()}/${ratio[3].toUpperCase()}`;
    const name = rawName.replace(ratio[0], "").replace(/\s{2,}/g, " ").trim();
    return { name: name || rawName, concentration, isRatio: true };
  }

  const simple = CONCENTRATION_SIMPLE_RE.exec(rawName);
  if (simple) {
    const concentration = `${simple[1].replace(",", ".")} ${simple[2].toUpperCase()}`;
    const name = rawName.replace(simple[0], "").replace(/\s{2,}/g, " ").trim();
    return { name: name || rawName, concentration, isRatio: false };
  }

  return { name: rawName.trim(), concentration: "", isRatio: false };
}

function quantityByRule(concentration: string, isRatio: boolean, qtyNumber: number): string {
  if (isRatio || /MG\s*\/\s*ML/i.test(concentration)) {
    return "1 FRASCO";
  }

  if (/\bMG\b/i.test(concentration)) {
    if (qtyNumber > 2) return `${Math.max(1, Math.floor(qtyNumber))} CP`;
    return `${Math.max(1, Math.floor(qtyNumber))} CAIXA`;
  }

  return `${Math.max(1, Math.floor(qtyNumber))}`;
}

function extractPosologyUnit(posology: string): string {
  const normalized = stripDiacritics(posology.toLowerCase());
  const cpPerDay = /(\d+)\s*cp\s*\/\s*dia/.exec(normalized);
  if (cpPerDay?.[1]) return `${cpPerDay[1]}x ao dia`;

  const xPerDay = /(\d+)\s*x\s*(?:\/\s*dia|ao\s+dia)/.exec(normalized);
  if (xPerDay?.[1]) return `${xPerDay[1]}x ao dia`;

  return posology;
}

function parseMedicationBlocks(lines: string[]): ExtractedMed[] {
  const meds: ExtractedMed[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const posMatch = /^posologia\s*:\s*(.+)$/i.exec(line);
    if (!posMatch) continue;

    const posology = posMatch[1].trim();
    const rawName = findNearestDrugName(lines, i);
    if (!rawName) continue;

    const split = splitDrugAndConcentration(rawName);
    const qtyFound = findNearestQty(lines, i - 1);
    const qtyText = qtyFound.explicitQtyText || quantityByRule(split.concentration, split.isRatio, qtyFound.qtyNumber);

    const rawWindow = lines.slice(Math.max(0, i - 5), Math.min(lines.length, i + 2)).join("\n");

    meds.push({
      name: split.name,
      qtyText,
      posology,
      posologyUnit: extractPosologyUnit(posology),
      formPharma: "",
      concentration: split.concentration,
      rawBlock: rawWindow
    });
  }

  return meds;
}

export async function extractFromPdf(file: File): Promise<ExtractedRx> {
  const bytes = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: bytes }).promise;

  let fullText = "";
  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join("\n");
    fullText += `\n${pageText}`;
  }

  const cleaned = cleanSpaces(fullText);
  const lines = textToLines(cleaned);

  return {
    patientName: extractPatient(lines),
    address: extractAddress(lines),
    dateDdMmYyyy: extractDate(cleaned, lines),
    meds: parseMedicationBlocks(lines),
    fullText: cleaned
  };
}
