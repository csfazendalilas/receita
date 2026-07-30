export type FittedText = {
  text: string;
  fontSizePt: number;
  fitsWithoutTruncation: boolean;
  truncated: boolean;
};

const MM_TO_PX = 96 / 25.4;
const PT_TO_PX = 96 / 72;

let canvas: HTMLCanvasElement | null = null;

function getContext() {
  if (!canvas) {
    canvas = document.createElement("canvas");
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  return ctx;
}

export function measureTextWidthPx(text: string, fontSizePt: number, letterSpacingPt: number): number {
  const ctx = getContext();
  const fontSizePx = fontSizePt * PT_TO_PX;
  const letterSpacingPx = letterSpacingPt * PT_TO_PX;

  ctx.font = `${fontSizePx}px Arial, sans-serif`;
  const measured = ctx.measureText(text).width;
  const spacing = Math.max(0, text.length - 1) * letterSpacingPx;
  return measured + spacing;
}

function truncateToFit(text: string, maxWidthPx: number, fontSizePt: number, letterSpacingPt: number): string {
  if (!text) return "";
  if (measureTextWidthPx(text, fontSizePt, letterSpacingPt) <= maxWidthPx) return text;

  const ellipsis = "...";
  let end = text.length;
  while (end > 0) {
    const candidate = `${text.slice(0, end).trimEnd()}${ellipsis}`;
    if (measureTextWidthPx(candidate, fontSizePt, letterSpacingPt) <= maxWidthPx) {
      return candidate;
    }
    end -= 1;
  }

  return ellipsis;
}

export function fitTextToWidth(options: {
  text: string;
  maxWidthMm: number;
  preferredFontPt: number;
  minFontPt: number;
  letterSpacingPt: number;
}): FittedText {
  const { text, maxWidthMm, preferredFontPt, minFontPt, letterSpacingPt } = options;
  const safeText = text.replace(/\r\n?/g, "\n").trim();
  if (!safeText) {
    return { text: "", fontSizePt: preferredFontPt, fitsWithoutTruncation: true, truncated: false };
  }

  const lines = safeText.split("\n");
  const maxWidthPx = maxWidthMm * MM_TO_PX;
  for (let font = preferredFontPt; font >= minFontPt; font -= 0.25) {
    const rounded = Math.round(font * 100) / 100;
    const allLinesFit = lines.every(
      (line) => measureTextWidthPx(line, rounded, letterSpacingPt) <= maxWidthPx
    );
    if (allLinesFit) {
      return {
        text: safeText,
        fontSizePt: rounded,
        fitsWithoutTruncation: true,
        truncated: false
      };
    }
  }

  const truncatedLines = lines.map((line) =>
    truncateToFit(line, maxWidthPx, minFontPt, letterSpacingPt)
  );
  const truncated = truncatedLines.join("\n");
  const wasTruncated = truncatedLines.some((line, index) => line !== lines[index]);
  return {
    text: truncated,
    fontSizePt: minFontPt,
    fitsWithoutTruncation: !wasTruncated,
    truncated: wasTruncated
  };
}
