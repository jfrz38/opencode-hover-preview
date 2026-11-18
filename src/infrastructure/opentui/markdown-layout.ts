import type { LineInfo } from "@opentui/core"

function textLineWidths(text: string): number[] {
  return text.split("\n").map((line) => Bun.stringWidth(line))
}

function visualSourceWidths(lineInfo: LineInfo): number[] {
  const widths: number[] = []
  for (let index = 0; index < lineInfo.lineSources.length; index++) {
    const source = lineInfo.lineSources[index]
    const start = lineInfo.lineStartCols[index]
    const width = lineInfo.lineWidthCols[index]
    if (source === undefined || start === undefined || width === undefined) continue
    widths[source] = Math.max(widths[source] ?? 0, start + width)
  }
  return widths
}

function widthsEqual(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

export interface MarkdownLayoutComparison {
  readonly rawWidth: number
  readonly projectedWidth: number
  readonly visualWidth: number
  readonly matchesRaw: boolean
  readonly matchesProjection: boolean
}

export function compareMarkdownLayout(
  rawText: string,
  projectedText: string,
  lineInfo: LineInfo,
): MarkdownLayoutComparison {
  const raw = textLineWidths(rawText)
  const projected = textLineWidths(projectedText)
  const visual = visualSourceWidths(lineInfo)

  return {
    rawWidth: Math.max(0, ...raw),
    projectedWidth: Math.max(0, ...projected),
    visualWidth: Math.max(0, ...visual),
    matchesRaw: widthsEqual(raw, visual),
    matchesProjection: widthsEqual(projected, visual),
  }
}
