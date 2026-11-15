export type PreviewTargetKind = "url" | "file-mention" | "file-link"
export type PreviewTargetSource = "text" | "link-metadata" | "markdown-projection"

export interface PreviewTarget {
  readonly kind: PreviewTargetKind
  readonly value: string
  readonly source: PreviewTargetSource
  readonly start: number
  readonly end: number
}

const patterns: ReadonlyArray<readonly [PreviewTargetKind, RegExp]> = [
  ["url", /https?:\/\/[^\s<>()\]]+/giu],
  ["file-mention", /@[\w./\\-]+/gu],
]

const URI_SCHEME = /^[A-Za-z][A-Za-z\d+.-]*:/u
const WINDOWS_ABSOLUTE_PATH = /^[A-Za-z]:[\\/]/u

export function linkPreviewTarget(
  value: string,
  source: Exclude<PreviewTargetSource, "text">,
  start: number,
  end: number,
): PreviewTarget | undefined {
  if (/^https?:\/\//iu.test(value)) {
    return { kind: "url", value, source, start, end }
  }
  if (
    value === "" ||
    value.startsWith("#") ||
    value.startsWith("//") ||
    (URI_SCHEME.test(value) && !WINDOWS_ABSOLUTE_PATH.test(value))
  ) {
    return undefined
  }
  return { kind: "file-link", value, source, start, end }
}

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
