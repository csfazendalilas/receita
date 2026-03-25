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
  onResetTemplateOffset: () => void;
  liveCoordinates: Array<{ id: string; label: string; xMm: number; yMm: number }>;
  autoPrintToken?: number;
  lastSavedAt?: number;
};

export default function FormPanel(props: Props) {
  const nudgeMm = 1;
  const nudgeScale = 0.01;
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="form-panel">
      <section className="panel-box">
        <h2>Receita controlada</h2>
        <label>
          Tipo:
          <select value={props.recipeType} onChange={(e) => props.setRecipeType(e.target.value as RecipeType)}>
            <option value="A">Notificacao A (219x100mm)</option>
            <option value="B">Notificacao B (212x96mm)</option>
          </select>
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={props.showTemplate}
            onChange={(event) => props.setShowTemplate(event.target.checked)}
          />
          Mostrar imagem template no preview
        </label>
      </section>

      {props.recipeType === "A" ? (
        <section className="panel-box">
          <h3>Campos da Receita A</h3>
          <label>Data<input value={props.values.a_date} onChange={(e) => props.onValueChange("a_date", e.target.value)} /></label>
          <label>Paciente<input value={props.values.a_patient} onChange={(e) => props.onValueChange("a_patient", e.target.value)} /></label>
          <label>Endereco<input value={props.values.a_address} onChange={(e) => props.onValueChange("a_address", e.target.value)} /></label>
          <label>
            Override do endereco final (opcional)
            <input value={props.values.a_address_override} onChange={(e) => props.onValueChange("a_address_override", e.target.value)} />
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={props.values.a_use_city_abbrev} onChange={(e) => props.onValueChange("a_use_city_abbrev", e.target.checked)} />
            Permitir abreviacoes de cidade/estado
          </label>
          <p className={props.addressInfo.status === "fits" ? "ok-msg" : "warn-msg"}>
            Endereco: {props.addressInfo.status}. Texto final: {props.addressInfo.finalText || "(vazio)"}
          </p>
          <label>Medicamento<input value={props.values.a_drug_name} onChange={(e) => props.onValueChange("a_drug_name", e.target.value)} /></label>
          <label>Quantidade e apresentacao<input value={props.values.a_qty} onChange={(e) => props.onValueChange("a_qty", e.target.value)} /></label>
          <label>Form. Farm. Concentr./Unid. Posologia<input value={props.values.a_form_posology} onChange={(e) => props.onValueChange("a_form_posology", e.target.value)} /></label>
        </section>
      ) : (
        <section className="panel-box">
          <h3>Campos da Receita B</h3>
          <label>Data base<input value={props.values.b_date} onChange={(e) => props.onValueChange("b_date", e.target.value)} /></label>
          <label>Paciente<input value={props.values.b_patient} onChange={(e) => props.onValueChange("b_patient", e.target.value)} /></label>
          <label>Endereco<input value={props.values.b_address} onChange={(e) => props.onValueChange("b_address", e.target.value)} /></label>
          <label>
            Override do endereco final (opcional)
            <input value={props.values.b_address_override} onChange={(e) => props.onValueChange("b_address_override", e.target.value)} />
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={props.values.b_use_city_abbrev} onChange={(e) => props.onValueChange("b_use_city_abbrev", e.target.checked)} />
            Permitir abreviacoes de cidade/estado
          </label>
          <p className={props.addressInfo.status === "fits" ? "ok-msg" : "warn-msg"}>
            Endereco: {props.addressInfo.status}. Texto final: {props.addressInfo.finalText || "(vazio)"}
          </p>
          <label>Medicamento ou Substancia<input value={props.values.b_drug} onChange={(e) => props.onValueChange("b_drug", e.target.value)} /></label>
          <label>Quantidade e Forma Farmaceutica<input value={props.values.b_qty_form} onChange={(e) => props.onValueChange("b_qty_form", e.target.value)} /></label>
          <label>Dose por Unidade Posologica<input value={props.values.b_dose_unit} onChange={(e) => props.onValueChange("b_dose_unit", e.target.value)} /></label>
          <label>Posologia<input value={props.values.b_posology} onChange={(e) => props.onValueChange("b_posology", e.target.value)} /></label>
        </section>
      )}

      <section className="panel-box">
        <button type="button" onClick={() => setShowAdvanced((prev) => !prev)}>
          {showAdvanced ? "Ocultar avancado" : "Avancado"}
        </button>
      </section>

      {showAdvanced && (
        <>
          <section className="panel-box">
            <h3>Configuracoes</h3>
            <button type="button" onClick={props.onSaveSettings}>Salvar configuracoes</button>
            {props.lastSavedAt ? <p className="ok-msg">Salvo.</p> : null}
          </section>

          <section className="panel-box">
            <h3>Template (imagem de fundo)</h3>
            <p className="print-warning">Dica: no preview, segure ALT e arraste para mover o fundo.</p>
            <div className="nudge-pad">
              <button type="button" onClick={() => props.onTemplateOffsetChange("yMm", props.templateOffset.yMm - nudgeMm)}>Cima</button>
              <button type="button" onClick={() => props.onTemplateOffsetChange("xMm", props.templateOffset.xMm - nudgeMm)}>Esquerda</button>
              <button type="button" onClick={() => props.onTemplateOffsetChange("xMm", props.templateOffset.xMm + nudgeMm)}>Direita</button>
              <button type="button" onClick={() => props.onTemplateOffsetChange("yMm", props.templateOffset.yMm + nudgeMm)}>Baixo</button>
            </div>
            <p className="print-warning">
              Offset do template: X {props.templateOffset.xMm.toFixed(1)}mm, Y {props.templateOffset.yMm.toFixed(1)}mm
            </p>
            <button type="button" onClick={props.onResetTemplateOffset}>Resetar template</button>
          </section>

          <section className="panel-box">
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

          <section className="panel-box">
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
        </>
      )}

      <PrintButton
        recipeType={props.recipeType}
        fields={props.printFields}
        printMode={props.printMode}
        a4Calibration={props.a4Calibration}
        autoPrintToken={props.autoPrintToken}
      />

      <section className="panel-box">
        <button type="button" className="danger-btn" onClick={props.onClearAll}>Clear all data</button>
      </section>
    </div>
  );
}
