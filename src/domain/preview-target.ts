export type PreviewTargetKind = "url" | "path" | "file-mention" | "image-placeholder" | "pasted-placeholder"
export type PreviewTargetSource = "text" | "link-metadata" | "markdown-projection"

export interface PreviewTarget {
  readonly kind: PreviewTargetKind
  readonly value: string
  readonly source: PreviewTargetSource
  readonly start: number
  readonly end: number
}

const patterns: ReadonlyArray<readonly [PreviewTargetKind, RegExp]> = [
  ["url", /https?:\/\/[^\s<>()\]]+/gu],
  ["image-placeholder", /\[Image ?\d+\]/gu],
  ["pasted-placeholder", /\[Pasted ~?\d+ lines?\]/giu],
  ["file-mention", /@[\w./\\-]+/gu],
  ["path", /(?:[A-Za-z]:[\\/]|\.\.?(?:[\\/])|\/)[^\s<>()\]]+/gu],
]

export function findPreviewTargets(text: string): PreviewTarget[] {
  const targets = patterns.flatMap(([kind, pattern]) =>
    Array.from(text.matchAll(pattern), (match) => ({
      kind,
      value: match[0],
      source: "text" as const,
      start: match.index,
      end: match.index + match[0].length,
    })),
  )

  return targets
    .filter(
      (candidate, index) =>
        !targets.some(
          (other, otherIndex) =>
            otherIndex !== index && other.start <= candidate.start && other.end >= candidate.end,
        ),
    )
    .sort((left, right) => left.start - right.start)
}

export function findUnambiguousPreviewTarget(text: string): PreviewTarget | undefined {
  const targets = findPreviewTargets(text)
  return targets.length === 1 ? targets[0] : undefined
}
