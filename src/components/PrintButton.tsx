import { useEffect, useRef } from "react";
import { PAPER_CONFIG, type RecipeType } from "../lib/layout";
import type { A4Calibration, PrintMode } from "../lib/print";

export type PrintField = {
  id: string;
  text: string;
  xMm: number;
  yMm: number;
  maxWidthMm: number;
  fontSizePt: number;
  letterSpacingPt: number;
};

type Props = {
  recipeType: RecipeType;
  fields: PrintField[];
  printMode: PrintMode;
  a4Calibration: A4Calibration;
  autoPrintToken?: number;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildPrintHtml(recipeType: RecipeType, fields: PrintField[], printMode: PrintMode, a4Calibration: A4Calibration): string {
  const paper = PAPER_CONFIG[recipeType];

  const nodes = fields
    .map((field) => {
      const text = escapeHtml(field.text);
      return `<div class="field" style="left:${field.xMm}mm;top:${field.yMm}mm;width:${field.maxWidthMm}mm;font-size:${field.fontSizePt}pt;letter-spacing:${field.letterSpacingPt}pt;">${text}</div>`;
    })
    .join("\n");

  if (printMode === "a4_auto") {
    const a4WidthMm = 297;
    const a4HeightMm = 210;
    const scaledWidth = paper.widthMm * a4Calibration.scale;
    const scaledHeight = paper.heightMm * a4Calibration.scale;
    const centeredLeft = (a4WidthMm - scaledWidth) / 2;
    const centeredTop = (a4HeightMm - scaledHeight) / 2;
    const left = centeredLeft + a4Calibration.offsetXMm;
    const top = centeredTop + a4Calibration.offsetYMm;

    return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Impressao Receita ${recipeType} - A4 Auto</title>
    <style>
      @page { size: landscape; margin: 0; }
      html, body { margin: 0; padding: 0; width: ${a4WidthMm}mm; height: ${a4HeightMm}mm; }
      body { font-family: Arial, sans-serif; }
      .a4-area {
        position: fixed;
        left: 0;
        top: 0;
        width: ${a4WidthMm}mm;
        height: ${a4HeightMm}mm;
      }
      .paper {
        position: absolute;
        width: ${paper.widthMm}mm;
        height: ${paper.heightMm}mm;
        left: ${left}mm;
        top: ${top}mm;
        transform: scale(${a4Calibration.scale});
        transform-origin: top left;
      }
      .field {
        position: absolute;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1;
      }
    </style>
  </head>
  <body>
    <div class="a4-area"><div class="paper">${nodes}</div></div>
  </body>
</html>`;
  }

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Impressao Receita ${recipeType}</title>
    <style>
      @page { size: ${paper.widthMm}mm ${paper.heightMm}mm; margin: 0; }
      html, body { margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; }
      .paper {
        position: relative;
        width: ${paper.widthMm}mm;
        height: ${paper.heightMm}mm;
      }
      .field {
        position: absolute;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1;
      }
    </style>
  </head>
  <body>
    <div class="paper">${nodes}</div>
  </body>
</html>`;
}

export default function PrintButton({ recipeType, fields, printMode, a4Calibration, autoPrintToken }: Props) {
  const lastAutoPrintToken = useRef(0);

  const onPrint = () => {
    const printWindow = window.open("", "_blank", "width=1000,height=700");
    if (!printWindow) {
      alert("Nao foi possivel abrir a janela de impressao automatica. Verifique bloqueio de pop-up.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintHtml(recipeType, fields, printMode, a4Calibration));
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  useEffect(() => {
    if (!autoPrintToken) return;
    if (autoPrintToken === lastAutoPrintToken.current) return;
    if (!fields.some((field) => field.text.trim())) return;

    lastAutoPrintToken.current = autoPrintToken;
    onPrint();
  }, [autoPrintToken, fields, recipeType, printMode, a4Calibration]);

  return (
    <div className="print-box">
      <button type="button" onClick={onPrint} className="primary-btn">
        Imprimir Receita {recipeType}
      </button>
      {printMode === "a4_auto" ? (
        <p className="print-warning">
          Modo A4 automatico (paisagem): centraliza a receita na pagina e permite ajuste fino por setas.
        </p>
      ) : (
        <p className="print-warning">
          Modo exato: use escala 100% e "Tamanho real".
        </p>
      )}
    </div>
  );
}
