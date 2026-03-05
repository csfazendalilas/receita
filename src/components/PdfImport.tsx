import { useEffect, useMemo, useState } from "react";
import type { RecipeType } from "../lib/layout";
import { extractFromPdf, type ExtractedMed, type ExtractedRx } from "../lib/pdfExtract";

type PrefillPayload = {
  recipeType: RecipeType;
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
  if (lower.includes("downloadb") || lower.includes("receitab") || lower.includes("notificacaob")) {
    return "B";
  }
  if (lower.includes("downloada") || lower.includes("receitaa") || lower.includes("notificacaoa")) {
    return "A";
  }
  return null;
}

export default function PdfImport({ activeRecipeType, onPrefill }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<ExtractedRx | null>(null);
  const [recipeType, setRecipeType] = useState<RecipeType>(activeRecipeType);
  const [medicationIndex, setMedicationIndex] = useState(0);

  useEffect(() => {
    setRecipeType(activeRecipeType);
  }, [activeRecipeType]);

  const meds = useMemo(() => data?.meds ?? [], [data]);

  const onParse = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError("");
    setData(null);

    try {
      const extracted = await extractFromPdf(selectedFile);
      setData(extracted);
      setMedicationIndex(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao parsear PDF";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const applyPrefill = () => {
    if (!data) return;
    onPrefill({
      recipeType,
      patient: data.patientName,
      address: data.address,
      dateDdMmYyyy: data.dateDdMmYyyy,
      medication: meds[medicationIndex]
    });
  };

  return (
    <section className="panel-box">
      <h3>Importar PDF do prontuario</h3>
      <input
        type="file"
        accept="application/pdf"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          setSelectedFile(file);
          if (file) {
            const inferred = inferRecipeTypeFromFileName(file.name);
            if (inferred) setRecipeType(inferred);
          }
        }}
      />
      <button type="button" onClick={onParse} disabled={!selectedFile || loading}>
        {loading ? "Lendo PDF..." : "Extrair dados"}
      </button>
      {error && <p className="error-msg">{error}</p>}

      {data && (
        <div className="import-result">
          <label>
            Tipo de receita:
            <select value={recipeType} onChange={(event) => setRecipeType(event.target.value as RecipeType)}>
              <option value="A">Notificacao A</option>
              <option value="B">Notificacao B</option>
            </select>
          </label>

          {meds.length > 0 && (
            <label>
              Medicacao:
              <select
                value={medicationIndex}
                onChange={(event) => setMedicationIndex(Number(event.target.value))}
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
          {meds.length > 0 && (
            <div className="import-result">
              <strong>Detalhes extraidos do medicamento selecionado</strong>
              <p><strong>Nome:</strong> {meds[medicationIndex]?.name || "-"}</p>
              <p><strong>Quantidade:</strong> {meds[medicationIndex]?.qtyText || "-"}</p>
              <p><strong>Forma farmaceutica:</strong> {meds[medicationIndex]?.formPharma || "-"}</p>
              <p><strong>Concentracao:</strong> {meds[medicationIndex]?.concentration || "-"}</p>
              <p><strong>Posologia:</strong> {meds[medicationIndex]?.posology || "-"}</p>
            </div>
          )}

          <button type="button" onClick={applyPrefill}>
            Prefill no formulario
          </button>
        </div>
      )}
    </section>
  );
}
