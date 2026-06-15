import { useEffect, useMemo, useState } from "react";
import type { RecipeType } from "../lib/layout";
import { extractFromPdf, type ExtractedMed, type ExtractedRx } from "../lib/pdfExtract";

export type PrefillPayload = {
  recipeType: RecipeType;
  applyRecipeType?: boolean;
  patient: string;
  address: string;
  dateDdMmYyyy: string;
  medication?: ExtractedMed;
};

type Props = {
  activeRecipeType: RecipeType;
  onPrefill: (payload: PrefillPayload) => void;
};

function inferRecipeTypeFromFileName(name: string): RecipeType | null {
  const lower = name.toLowerCase();
  if (lower.includes("downloada") || lower.includes("receitaa") || lower.includes("notificacaoa")) return "A";
  if (lower.includes("downloadb") || lower.includes("receitab") || lower.includes("notificacaob")) return "B";
  return null;
}

function inferRecipeTypeFromExtracted(fileName: string, data: ExtractedRx, fallback: RecipeType): RecipeType {
  const byName = inferRecipeTypeFromFileName(fileName);
  if (byName) return byName;

  const text = data.fullText.toLowerCase();
  if (/notifica[c�][a�]o\s+de\s+receita\s+a/.test(text)) return "A";
  if (/notifica[c�][a�]o\s+de\s+receita\s+b/.test(text)) return "B";

  const med = data.meds[0];
  if (med?.concentration?.includes("/")) return "B";
  if (/\bfrasco\b/i.test(med?.qtyText ?? "")) return "B";

  return fallback;
}

export default function PdfImport({ activeRecipeType, onPrefill }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<ExtractedRx | null>(null);
  const [applyDetectedRecipeType, setApplyDetectedRecipeType] = useState(true);
  const [recipeType, setRecipeType] = useState<RecipeType>(activeRecipeType);
  const [medicationIndex, setMedicationIndex] = useState(0);

  useEffect(() => {
    setRecipeType(activeRecipeType);
  }, [activeRecipeType]);

  const meds = useMemo(() => data?.meds ?? [], [data]);

  useEffect(() => {
    if (!selectedFile) return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError("");
      setData(null);

      try {
        const extracted = await extractFromPdf(selectedFile);
        if (cancelled) return;

        setData(extracted);
        setMedicationIndex(0);

        const detectedRecipeType = inferRecipeTypeFromExtracted(selectedFile.name, extracted, activeRecipeType);
        const selectedRecipeType = applyDetectedRecipeType ? detectedRecipeType : activeRecipeType;
        setRecipeType(selectedRecipeType);

        onPrefill({
          recipeType: selectedRecipeType,
          applyRecipeType: applyDetectedRecipeType,
          patient: extracted.patientName,
          address: extracted.address,
          dateDdMmYyyy: extracted.dateDdMmYyyy,
          medication: extracted.meds[0]
        });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Falha ao parsear PDF";
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedFile, activeRecipeType, applyDetectedRecipeType, onPrefill]);

  const applyCurrentSelection = (nextRecipeType: RecipeType, nextMedicationIndex: number) => {
    if (!data) return;
    onPrefill({
      recipeType: nextRecipeType,
      applyRecipeType: true,
      patient: data.patientName,
      address: data.address,
      dateDdMmYyyy: data.dateDdMmYyyy,
      medication: meds[nextMedicationIndex]
    });
  };

  return (
    <section className="panel-box">
      <h3>Importar PDF do prontuario</h3>
      <input
        type="file"
        accept="application/pdf"
        onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
      />
      <p className="print-warning">Ao escolher o arquivo, os dados sao extraidos e preenchidos automaticamente.</p>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={applyDetectedRecipeType}
          onChange={(event) => setApplyDetectedRecipeType(event.target.checked)}
        />
        Trocar automaticamente para o tipo detectado no PDF
      </label>
      {loading && <p className="print-warning">Lendo PDF...</p>}
      {error && <p className="error-msg">{error}</p>}

      {data && (
        <div className="import-result">
          <label>
            Tipo de receita detectado:
            <select
              value={recipeType}
              onChange={(event) => {
                const nextRecipeType = event.target.value as RecipeType;
                setRecipeType(nextRecipeType);
                applyCurrentSelection(nextRecipeType, medicationIndex);
              }}
            >
              <option value="A">Notificacao A</option>
              <option value="B">Notificacao B</option>
            </select>
          </label>

          {meds.length > 0 && (
            <label>
              Medicacao:
              <select
                value={medicationIndex}
                onChange={(event) => {
                  const nextMedicationIndex = Number(event.target.value);
                  setMedicationIndex(nextMedicationIndex);
                  applyCurrentSelection(recipeType, nextMedicationIndex);
                }}
              >
                {meds.map((med, idx) => (
                  <option key={`${med.name}-${idx}`} value={idx}>
                    {med.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <p><strong>Paciente:</strong> {data.patientName || "(nao encontrado)"}</p>
          <p><strong>Endereco:</strong> {data.address || "(nao encontrado)"}</p>
          <p><strong>Data:</strong> {data.dateDdMmYyyy || "(nao encontrada)"}</p>
        </div>
      )}
    </section>
  );
}

