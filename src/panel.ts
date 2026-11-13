import type { Range } from "./codec";

export interface PanelProps {
  value: string;
  selection: Range;
  applySelection: boolean;
  showHighlight: boolean;
}

export type PanelEvents = {
  edit: [value: string, selection: Range];
  "selection-change": [selection: Range];
};

export function positionLabel(before: number, count: number, unit: string) {
  const first = before + 1;
  return count > 1
    ? `${first}〜${before + count}${unit}目`
    : `${first}${unit}目`;
}

export function textPositionLabel(value: string, [start, end]: Range) {
  return positionLabel(
    Array.from(value.slice(0, start)).length,
    Array.from(value.slice(start, end)).length,
    "文字",
  );
}
