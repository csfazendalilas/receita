import { useRef, type MouseEvent, type PointerEvent } from "react";
import { PAPER_CONFIG, type RecipeType } from "../lib/layout";
import type { PrintField } from "./PrintButton";

type Props = {
  recipeType: RecipeType;
  showTemplate: boolean;
  fields: PrintField[];
  selectedFieldId: string;
  onSelectField: (fieldId: string) => void;
  onMoveSelectedField: (xMm: number, yMm: number) => void;
};

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startXMm: number;
  startYMm: number;
};

export default function PreviewPaper({
  recipeType,
  showTemplate,
  fields,
  selectedFieldId,
  onSelectField,
  onMoveSelectedField
}: Props) {
  const paper = PAPER_CONFIG[recipeType];
  const paperRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? fields[0];

  const toMm = (deltaPx: number, axis: "x" | "y"): number => {
    const rect = paperRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    if (axis === "x") return (deltaPx / rect.width) * paper.widthMm;
    return (deltaPx / rect.height) * paper.heightMm;
  };

  const onFieldPointerDown = (event: PointerEvent<HTMLDivElement>, field: PrintField) => {
    onSelectField(field.id);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startXMm: field.xMm,
      startYMm: field.yMm
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;

    const dxMm = toMm(event.clientX - dragRef.current.startClientX, "x");
    const dyMm = toMm(event.clientY - dragRef.current.startClientY, "y");

    onMoveSelectedField(dragRef.current.startXMm + dxMm, dragRef.current.startYMm + dyMm);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const onPaperClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (!selectedField) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const xMm = toMm(event.clientX - rect.left, "x");
    const yMm = toMm(event.clientY - rect.top, "y");

    onMoveSelectedField(xMm, yMm);
  };

  return (
    <div className="preview-shell">
      <div
        ref={paperRef}
        className="paper-preview calibrating"
        style={{
          width: `${paper.widthMm}mm`,
          height: `${paper.heightMm}mm`,
          backgroundImage: showTemplate ? `url(${paper.templateImage})` : "none"
        }}
        onClick={onPaperClick}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {fields.map((field) => (
          <div
            key={field.id}
            className={`preview-field ${field.id === selectedFieldId ? "selected" : ""}`}
            style={{
              left: `${field.xMm}mm`,
              top: `${field.yMm}mm`,
              width: `${field.maxWidthMm}mm`,
              maxWidth: `${field.maxWidthMm}mm`,
              fontSize: `${field.fontSizePt}pt`,
              letterSpacing: `${field.letterSpacingPt}pt`
            }}
            title={`${field.id} (${field.xMm.toFixed(1)}mm, ${field.yMm.toFixed(1)}mm)`}
            onPointerDown={(event) => onFieldPointerDown(event, field)}
          >
            {field.text || " "}
          </div>
        ))}
      </div>
    </div>
  );
}
