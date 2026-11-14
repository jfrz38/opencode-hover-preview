import type { LineInfo, Renderable, TextChunk } from "@opentui/core"
import { findPreviewTargets, type PreviewTarget } from "../domain/preview-target.js"
import { compareMarkdownLayout } from "./markdown-layout.js"
import { projectMarkdownInline } from "./markdown-projection.js"
import { findTargetAtTextCell } from "./text-hit-test.js"

export interface RenderableDiagnostic {
  readonly className: string
  readonly id: string
  readonly bounds: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  readonly textAvailable: boolean
  readonly target?: PreviewTarget
  readonly resolution: "none" | "exact-cell"
}

interface TextBearingRenderable extends Renderable {
  readonly plainText: string
  readonly lineInfo: LineInfo
  readonly scrollY: number
  readonly scrollX?: number
  readonly textAlign?: "left" | "center" | "right"
  readonly chunks?: TextChunk[]
  readonly editorView?: {
    getViewport(): { readonly offsetX: number }
  }
}

function hasPlainText(renderable: Renderable): renderable is TextBearingRenderable {
  return (
    "plainText" in renderable &&
    typeof renderable.plainText === "string" &&
    "lineInfo" in renderable &&
    typeof renderable.lineInfo === "object"
  )
}

function targetsFromChunks(chunks: readonly TextChunk[] | undefined): PreviewTarget[] {
  if (chunks === undefined) return []

  let offset = 0
  const targets: PreviewTarget[] = []
  for (const chunk of chunks) {
    const start = offset
    offset += chunk.text.length
    if (chunk.link !== undefined) {
      targets.push({ kind: "url", value: chunk.link.url, source: "link-metadata", start, end: offset })
    }
  }
  return targets
}

function uniqueTargets(targets: readonly PreviewTarget[]): PreviewTarget[] {
  const unique = new Map<string, PreviewTarget>()
  for (const target of targets) unique.set(`${target.start}:${target.end}`, target)
  return [...unique.values()]
}

function markdownAncestorState(renderable: Renderable): "none" | "concealed" | "source" {
  let ancestor = renderable.parent
  while (ancestor !== null) {
    if (ancestor.constructor.name === "MarkdownRenderable" && "conceal" in ancestor) {
      return ancestor.conceal === true ? "concealed" : "source"
    }
    ancestor = ancestor.parent
  }
  return "none"
}

export function inspectRenderable(renderable: Renderable, pointer: { readonly x: number; readonly y: number }): RenderableDiagnostic {
  const textRenderable = hasPlainText(renderable) ? renderable : undefined
  const rawText = textRenderable?.plainText
  const markdownState = markdownAncestorState(renderable)
  const candidateProjection = rawText === undefined ? undefined : projectMarkdownInline(rawText)
  const layoutComparison =
    rawText === undefined || candidateProjection === undefined
      ? undefined
      : compareMarkdownLayout(rawText, candidateProjection.text, textRenderable!.lineInfo)
  const flattenedProjection =
    candidateProjection !== undefined &&
    candidateProjection.targets.length > 0 &&
    layoutComparison?.matchesProjection === true &&
    layoutComparison.matchesRaw === false
  const projection =
    markdownState === "concealed" || flattenedProjection ? candidateProjection : undefined
  const text = projection?.text ?? rawText
  const targets =
    text === undefined
      ? []
      : uniqueTargets([
          ...findPreviewTargets(text),
          ...(projection?.targets ?? []),
          ...targetsFromChunks(textRenderable?.chunks),
        ])
  const target =
    text === undefined
      ? undefined
      : findTargetAtTextCell(
          text,
          targets,
          { x: pointer.x - renderable.screenX, y: pointer.y - renderable.screenY },
          {
            width: renderable.width,
            scrollX: textRenderable?.scrollX ?? textRenderable?.editorView?.getViewport().offsetX ?? 0,
            scrollY: textRenderable?.scrollY ?? 0,
            textAlign: textRenderable?.textAlign ?? "left",
            lineInfo: textRenderable!.lineInfo,
          },
        )
  return {
    className: renderable.constructor.name,
    id: renderable.id,
    bounds: {
      x: renderable.screenX,
      y: renderable.screenY,
      width: renderable.width,
      height: renderable.height,
    },
    textAvailable: text !== undefined,
    target,
    resolution: target === undefined ? "none" : "exact-cell",
  }
}
