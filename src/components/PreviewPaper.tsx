import { useRef, type MouseEvent, type PointerEvent } from "react";
import { PAPER_CONFIG, type RecipeType } from "../lib/layout";
import type { A4Calibration, PrintMode } from "../lib/print";
import type { PrintField } from "./PrintButton";

type Props = {
  recipeType: RecipeType;
  showTemplate: boolean;
  templateOffset: { xMm: number; yMm: number };
  onTemplateOffsetChange: (key: "xMm" | "yMm", value: number) => void;
  templateRotation: number;
  fields: PrintField[];
  selectedFieldId: string;
  onSelectField: (fieldId: string) => void;
  onMoveSelectedField: (xMm: number, yMm: number) => void;
  printMode: PrintMode;
  a4Calibration: A4Calibration;
};

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startXMm: number;
  startYMm: number;
};

type TemplateDragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startTemplateXMm: number;
  startTemplateYMm: number;
};

const A4_WIDTH_MM = 297;
const A4_HEIGHT_MM = 210;

export default function PreviewPaper({
  recipeType,
  showTemplate,
  templateOffset,
  onTemplateOffsetChange,
  templateRotation,
  fields,
  selectedFieldId,
  onSelectField,
  onMoveSelectedField,
  printMode,
  a4Calibration
}: Props) {
  const paper = PAPER_CONFIG[recipeType];
  const paperRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const templateDragRef = useRef<TemplateDragState | null>(null);

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
    if (templateDragRef.current && templateDragRef.current.pointerId === event.pointerId) {
      const dxMm = toMm(event.clientX - templateDragRef.current.startClientX, "x");
      const dyMm = toMm(event.clientY - templateDragRef.current.startClientY, "y");
      onTemplateOffsetChange("xMm", templateDragRef.current.startTemplateXMm + dxMm);
      onTemplateOffsetChange("yMm", templateDragRef.current.startTemplateYMm + dyMm);
      return;
    }
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;

    const dxMm = toMm(event.clientX - dragRef.current.startClientX, "x");
    const dyMm = toMm(event.clientY - dragRef.current.startClientY, "y");

    onMoveSelectedField(dragRef.current.startXMm + dxMm, dragRef.current.startYMm + dyMm);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (templateDragRef.current?.pointerId === event.pointerId) {
      templateDragRef.current = null;
    }
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const onPaperPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (!event.altKey) return;

    templateDragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startTemplateXMm: templateOffset.xMm,
      startTemplateYMm: templateOffset.yMm
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPaperClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.altKey) return;
    if (!selectedField) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const xMm = toMm(event.clientX - rect.left, "x");
    const yMm = toMm(event.clientY - rect.top, "y");

    onMoveSelectedField(xMm, yMm);
  };

  const paperNode = (
    <div
      ref={paperRef}
      className="paper-preview calibrating"
      style={{
        width: `${paper.widthMm}mm`,
        height: `${paper.heightMm}mm`,
        ...(printMode === "a4_auto" && {
          position: "absolute",
          left: `${(A4_WIDTH_MM - paper.widthMm * a4Calibration.scale) / 2 + a4Calibration.offsetXMm}mm`,
          top: `${(A4_HEIGHT_MM - paper.heightMm * a4Calibration.scale) / 2 + a4Calibration.offsetYMm}mm`,
          transform: `scale(${a4Calibration.scale})`,
          transformOrigin: "top left"
        })
      }}
      onClick={onPaperClick}
      onPointerDown={onPaperPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {showTemplate && (
        <img
          src={paper.templateImage}
          className="template-img"
          style={{
            transform: `translate(${templateOffset.xMm}mm, ${templateOffset.yMm}mm) rotate(${templateRotation}deg)`
          }}
          draggable={false}
          alt=""
        />
      )}
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
  );

  if (printMode === "a4_auto") {
    return (
      <div className="preview-shell">
        <div className="a4-preview">
          {paperNode}
        </div>
      </div>
    );
  }

  return (
    <div className="preview-shell">
      {paperNode}
    </div>
  );
}
