import type { LineInfo } from "@opentui/core"
import type { PreviewTarget } from "../domain/preview-target.js"

export interface TextCell {
  readonly x: number
  readonly y: number
}

export interface TextHitLayout {
  readonly width: number
  readonly scrollX: number
  readonly scrollY: number
  readonly textAlign: "left" | "center" | "right"
  readonly lineInfo: LineInfo
}

interface TargetColumns {
  readonly target: PreviewTarget
  readonly line: number
  readonly startColumn: number
  readonly endColumn: number
}

function targetColumns(text: string, target: PreviewTarget): TargetColumns | undefined {
  const prefix = text.slice(0, target.start)
  const targetText = text.slice(target.start, target.end)
  if (targetText.includes("\n")) return undefined

  const lines = prefix.split("\n")
  const line = lines.length - 1
  const startColumn = Bun.stringWidth(lines.at(-1) ?? "")

  return {
    target,
    line,
    startColumn,
    endColumn: startColumn + Bun.stringWidth(targetText),
  }
}

function alignmentPadding(layout: TextHitLayout, visualLine: number): number {
  const remaining = Math.max(0, layout.width - (layout.lineInfo.lineWidthCols[visualLine] ?? 0))
  if (layout.textAlign === "right") return remaining
  if (layout.textAlign === "center") return Math.floor(remaining / 2)
  return 0
}

export function findTargetAtTextCell(
  text: string,
  targets: readonly PreviewTarget[],
  cell: TextCell,
  layout: TextHitLayout,
): PreviewTarget | undefined {
  if (cell.x < 0 || cell.y < 0 || cell.x >= layout.width) return undefined

  const visualLine = Math.floor(cell.y) + layout.scrollY
  const sourceLine = layout.lineInfo.lineSources[visualLine]
  const visualStartColumn = layout.lineInfo.lineStartCols[visualLine]
  const visualWidth = layout.lineInfo.lineWidthCols[visualLine]
  if (sourceLine === undefined || visualStartColumn === undefined || visualWidth === undefined) return undefined
  const sourceStartColumn = layout.lineInfo.lineStartCols.find(
    (_column, index) =>
      layout.lineInfo.lineSources[index] === sourceLine && layout.lineInfo.lineWraps[index] === 0,
  )
  if (sourceStartColumn === undefined) return undefined

  const columnInVisualLine = Math.floor(cell.x) - alignmentPadding(layout, visualLine)
  if (columnInVisualLine < 0 || columnInVisualLine >= visualWidth) return undefined

  const sourceColumn = visualStartColumn - sourceStartColumn + columnInVisualLine + layout.scrollX
  return targets
    .map((target) => targetColumns(text, target))
    .find(
      (candidate): candidate is TargetColumns =>
        candidate !== undefined &&
        candidate.line === sourceLine &&
        sourceColumn >= candidate.startColumn &&
        sourceColumn < candidate.endColumn,
    )?.target
}
