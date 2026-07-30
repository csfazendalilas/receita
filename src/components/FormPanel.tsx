import { useState } from "react";
import type { RecipeType } from "../lib/layout";
import type { A4Calibration, PrintMode } from "../lib/print";
import PrintButton, { type PrintField } from "./PrintButton";

export type FormValues = {
  a_date: string;
  a_patient: string;
  a_address: string;
  a_address_override: string;
  a_use_city_abbrev: boolean;
  a_drug_name: string;
  a_qty: string;
  a_form_posology: string;
  b_date: string;
  b_patient: string;
  b_address: string;
  b_address_override: string;
  b_use_city_abbrev: boolean;
  b_drug: string;
  b_qty_form: string;
  b_dose_unit: string;
  b_posology: string;
};

type AddressInfo = {
  status: "fits" | "overflow";
  finalText: string;
};

type Props = {
  recipeType: RecipeType;
  setRecipeType: (value: RecipeType) => void;
  showTemplate: boolean;
  setShowTemplate: (value: boolean) => void;
  values: FormValues;
  onValueChange: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void;
  onResetCalibration: () => void;
  onClearAll: () => void;
  onSaveSettings: () => void;
  printFields: PrintField[];
  addressInfo: AddressInfo;
  printMode: PrintMode;
  onPrintModeChange: (mode: PrintMode) => void;
  a4Calibration: A4Calibration;
  onA4CalibrationChange: (key: "offsetXMm" | "offsetYMm" | "scale", value: number) => void;
  onResetA4Calibration: () => void;
  templateOffset: { xMm: number; yMm: number };
  onTemplateOffsetChange: (key: "xMm" | "yMm", value: number) => void;
  templateRotation: number;
  onTemplateRotationChange: (deltaDeg: number) => void;
  templateScale: { x: number; y: number };
  onTemplateScaleChange: (axis: "x" | "y", value: number) => void;
  onResetTemplateOffset: () => void;
  liveCoordinates: Array<{ id: string; label: string; xMm: number; yMm: number }>;
  lastSavedAt?: number;
};

export default function FormPanel(props: Props) {
  const nudgeMm = 1;
  const nudgeRotDeg = 0.1;
  const nudgeScale = 0.01;
  const nudgeTemplateScale = 0.02;
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="form-panel">
      <section className="panel-box setup-card">
        <div className="section-heading">
          <span className="step-number">01</span>
          <div>
            <p className="section-kicker">Formulario</p>
            <h2>Escolha o tipo</h2>
          </div>
        </div>

        <div className="recipe-switch" role="group" aria-label="Tipo de receita">
          <button
            type="button"
            className={props.recipeType === "A" ? "recipe-option active" : "recipe-option"}
            aria-pressed={props.recipeType === "A"}
            onClick={() => props.setRecipeType("A")}
          >
            <strong>Receita A</strong>
            <span>219 × 100 mm</span>
          </button>
          <button
            type="button"
            className={props.recipeType === "B" ? "recipe-option active" : "recipe-option"}
            aria-pressed={props.recipeType === "B"}
            onClick={() => props.setRecipeType("B")}
          >
            <strong>Receita B</strong>
            <span>212 × 96 mm</span>
          </button>
        </div>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={props.showTemplate}
            onChange={(event) => props.setShowTemplate(event.target.checked)}
          />
          <span>
            <strong>Exibir formulario no preview</strong>
            <small>O fundo nunca e impresso por padrao.</small>
          </span>
        </label>
      </section>

      {props.recipeType === "A" ? (
        <>
          <section className="panel-box form-card">
            <div className="section-heading">
              <span className="step-number">02</span>
              <div>
                <p className="section-kicker">Identificacao</p>
                <h3>Paciente</h3>
              </div>
            </div>
            <div className="field-grid">
              <label className="compact-field">Data<input placeholder="dd/MM/aaaa" value={props.values.a_date} onChange={(e) => props.onValueChange("a_date", e.target.value)} /></label>
              <label>Paciente<textarea rows={2} value={props.values.a_patient} onChange={(e) => props.onValueChange("a_patient", e.target.value)} /></label>
              <label>Endereco<textarea rows={2} value={props.values.a_address} onChange={(e) => props.onValueChange("a_address", e.target.value)} /></label>
            </div>
            <div className={props.addressInfo.status === "fits" ? "fit-status fits" : "fit-status overflow"}>
              <span>{props.addressInfo.status === "fits" ? "Endereco ajustado" : "Endereco excedeu o espaco"}</span>
              <strong>{props.addressInfo.finalText || "Aguardando endereco"}</strong>
            </div>
            <details className="inline-details">
              <summary>Ajustes opcionais do endereco</summary>
              <label>
                Texto final personalizado
                <textarea rows={2} value={props.values.a_address_override} onChange={(e) => props.onValueChange("a_address_override", e.target.value)} />
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={props.values.a_use_city_abbrev} onChange={(e) => props.onValueChange("a_use_city_abbrev", e.target.checked)} />
                Permitir abreviacoes de cidade/estado
              </label>
            </details>
          </section>

          <section className="panel-box form-card">
            <div className="section-heading">
              <span className="step-number">03</span>
              <div>
                <p className="section-kicker">Prescricao</p>
                <h3>Medicamento e posologia</h3>
              </div>
            </div>
            <p className="field-hint">Pressione Enter quando quiser dividir o texto em duas linhas.</p>
            <label>Medicamento<textarea rows={2} value={props.values.a_drug_name} onChange={(e) => props.onValueChange("a_drug_name", e.target.value)} /></label>
            <label>Quantidade e apresentacao<textarea rows={2} value={props.values.a_qty} onChange={(e) => props.onValueChange("a_qty", e.target.value)} /></label>
            <label>Forma, concentracao e posologia<textarea rows={2} value={props.values.a_form_posology} onChange={(e) => props.onValueChange("a_form_posology", e.target.value)} /></label>
          </section>
        </>
      ) : (
        <>
          <section className="panel-box form-card">
            <div className="section-heading">
              <span className="step-number">02</span>
              <div>
                <p className="section-kicker">Identificacao</p>
                <h3>Paciente</h3>
              </div>
            </div>
            <div className="field-grid">
              <label className="compact-field">Data<input placeholder="dd/MM/aaaa" value={props.values.b_date} onChange={(e) => props.onValueChange("b_date", e.target.value)} /></label>
              <label>Paciente<textarea rows={2} value={props.values.b_patient} onChange={(e) => props.onValueChange("b_patient", e.target.value)} /></label>
              <label>Endereco<textarea rows={2} value={props.values.b_address} onChange={(e) => props.onValueChange("b_address", e.target.value)} /></label>
            </div>
            <div className={props.addressInfo.status === "fits" ? "fit-status fits" : "fit-status overflow"}>
              <span>{props.addressInfo.status === "fits" ? "Endereco ajustado" : "Endereco excedeu o espaco"}</span>
              <strong>{props.addressInfo.finalText || "Aguardando endereco"}</strong>
            </div>
            <details className="inline-details">
              <summary>Ajustes opcionais do endereco</summary>
              <label>
                Texto final personalizado
                <textarea rows={2} value={props.values.b_address_override} onChange={(e) => props.onValueChange("b_address_override", e.target.value)} />
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={props.values.b_use_city_abbrev} onChange={(e) => props.onValueChange("b_use_city_abbrev", e.target.checked)} />
                Permitir abreviacoes de cidade/estado
              </label>
            </details>
          </section>

          <section className="panel-box form-card">
            <div className="section-heading">
              <span className="step-number">03</span>
              <div>
                <p className="section-kicker">Prescricao</p>
                <h3>Medicamento e posologia</h3>
              </div>
            </div>
            <p className="field-hint">Pressione Enter quando quiser dividir o texto em duas linhas.</p>
            <label>Medicamento ou substancia<textarea rows={2} value={props.values.b_drug} onChange={(e) => props.onValueChange("b_drug", e.target.value)} /></label>
            <label>Quantidade e forma farmaceutica<textarea rows={2} value={props.values.b_qty_form} onChange={(e) => props.onValueChange("b_qty_form", e.target.value)} /></label>
            <label>Dose por unidade posologica<textarea rows={2} value={props.values.b_dose_unit} onChange={(e) => props.onValueChange("b_dose_unit", e.target.value)} /></label>
            <label>Posologia<textarea rows={2} value={props.values.b_posology} onChange={(e) => props.onValueChange("b_posology", e.target.value)} /></label>
          </section>
        </>
      )}

      <PrintButton
        recipeType={props.recipeType}
        fields={props.printFields}
        printMode={props.printMode}
        a4Calibration={props.a4Calibration}
      />

      <button type="button" className="advanced-trigger" onClick={() => setShowAdvanced((prev) => !prev)}>
        <span>
          <strong>Ajustes avancados</strong>
          <small>Calibracao, coordenadas e seguranca</small>
        </span>
        <span className="advanced-symbol" aria-hidden="true">{showAdvanced ? "−" : "+"}</span>
      </button>

      {showAdvanced && (
        <div className="advanced-stack">
          <section className="panel-box advanced-card">
            <h3>Configuracoes</h3>
            <button type="button" onClick={props.onSaveSettings}>Salvar configuracoes</button>
            {props.lastSavedAt ? <p className="ok-msg">Salvo.</p> : null}
          </section>

          <section className="panel-box advanced-card">
            <h3>Template (imagem de fundo)</h3>
            <p className="print-warning">Dica: no preview, segure ALT e arraste para mover o fundo.</p>
            <div className="nudge-pad">
              <button type="button" onClick={() => props.onTemplateOffsetChange("yMm", props.templateOffset.yMm - nudgeMm)}>Cima</button>
              <button type="button" onClick={() => props.onTemplateOffsetChange("xMm", props.templateOffset.xMm - nudgeMm)}>Esquerda</button>
              <button type="button" onClick={() => props.onTemplateOffsetChange("xMm", props.templateOffset.xMm + nudgeMm)}>Direita</button>
              <button type="button" onClick={() => props.onTemplateOffsetChange("yMm", props.templateOffset.yMm + nudgeMm)}>Baixo</button>
            </div>
            <p className="print-warning">
              Offset: X {props.templateOffset.xMm.toFixed(1)}mm, Y {props.templateOffset.yMm.toFixed(1)}mm
            </p>
            <div className="rotate-row">
              <button type="button" onClick={() => props.onTemplateRotationChange(-nudgeRotDeg)}>↺ Girar esq.</button>
              <button type="button" onClick={() => props.onTemplateRotationChange(+nudgeRotDeg)}>↻ Girar dir.</button>
            </div>
            <p className="print-warning">
              Rotacao: {props.templateRotation.toFixed(1)}°
            </p>
            <p className="print-warning">Tamanho (desproporcional). Dica: arraste a quina azul no preview.</p>
            <div className="scale-row">
              <button type="button" onClick={() => props.onTemplateScaleChange("x", props.templateScale.x - nudgeTemplateScale)}>Largura -</button>
              <button type="button" onClick={() => props.onTemplateScaleChange("x", props.templateScale.x + nudgeTemplateScale)}>Largura +</button>
            </div>
            <div className="scale-row">
              <button type="button" onClick={() => props.onTemplateScaleChange("y", props.templateScale.y - nudgeTemplateScale)}>Altura -</button>
              <button type="button" onClick={() => props.onTemplateScaleChange("y", props.templateScale.y + nudgeTemplateScale)}>Altura +</button>
            </div>
            <p className="print-warning">
              Escala: Largura {props.templateScale.x.toFixed(2)}x, Altura {props.templateScale.y.toFixed(2)}x
            </p>
            <button type="button" onClick={props.onResetTemplateOffset}>Resetar template</button>
          </section>

          <section className="panel-box advanced-card">
            <h3>Impressao</h3>
            <label>
              Modo de impressao
              <select value={props.printMode} onChange={(event) => props.onPrintModeChange(event.target.value as PrintMode)}>
                <option value="a4_auto">A4 automatico</option>
                <option value="exact_form">Exato no tamanho do formulario</option>
              </select>
            </label>
            {props.printMode === "a4_auto" && (
              <>
                <p className="print-warning">Use as setas para mover a area de impressao no A4.</p>
                <div className="nudge-pad">
                  <button type="button" onClick={() => props.onA4CalibrationChange("offsetYMm", props.a4Calibration.offsetYMm - nudgeMm)}>Cima</button>
                  <button type="button" onClick={() => props.onA4CalibrationChange("offsetXMm", props.a4Calibration.offsetXMm - nudgeMm)}>Esquerda</button>
                  <button type="button" onClick={() => props.onA4CalibrationChange("offsetXMm", props.a4Calibration.offsetXMm + nudgeMm)}>Direita</button>
                  <button type="button" onClick={() => props.onA4CalibrationChange("offsetYMm", props.a4Calibration.offsetYMm + nudgeMm)}>Baixo</button>
                </div>
                <div className="scale-row">
                  <button type="button" onClick={() => props.onA4CalibrationChange("scale", Math.max(0.8, Number((props.a4Calibration.scale - nudgeScale).toFixed(3))))}>Escala -</button>
                  <button type="button" onClick={() => props.onA4CalibrationChange("scale", Number((props.a4Calibration.scale + nudgeScale).toFixed(3)))}>Escala +</button>
                </div>
                <p className="print-warning">
                  Ajuste atual: X {props.a4Calibration.offsetXMm.toFixed(1)}mm, Y {props.a4Calibration.offsetYMm.toFixed(1)}mm, Escala {props.a4Calibration.scale.toFixed(3)}
                </p>
                <button type="button" onClick={props.onResetA4Calibration}>Resetar ajuste A4</button>
              </>
            )}
          </section>

          <section className="panel-box advanced-card">
            <h3>Coordenadas Ao Vivo (mm)</h3>
            <p className="print-warning">Arraste os campos no preview. Estes valores atualizam em tempo real.</p>
            <div className="coords-list">
              {props.liveCoordinates.map((coord) => (
                <div key={coord.id} className="coords-row">
                  <strong>{coord.label}</strong>
                  <span>X: {coord.xMm.toFixed(1)} | Y: {coord.yMm.toFixed(1)}</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={props.onResetCalibration}>Resetar calibracao</button>
          </section>

          <section className="danger-zone">
            <div>
              <strong>Limpar dados locais</strong>
              <p>Remove campos preenchidos e calibracoes salvas neste navegador.</p>
            </div>
            <button type="button" className="danger-btn" onClick={props.onClearAll}>Limpar tudo</button>
          </section>
        </div>
      )}
    </div>
  );
}
