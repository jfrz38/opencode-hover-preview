export type PreviewTargetKind = "url" | "file-mention" | "file-link"
export type PreviewTargetSource = "text" | "link-metadata" | "markdown-projection"

interface PreviewTargetLocation {
  readonly value: string
  readonly start: number
  readonly end: number
}

export interface UrlPreviewTarget extends PreviewTargetLocation {
  readonly kind: "url"
  readonly source: PreviewTargetSource
}

export interface FileMentionPreviewTarget extends PreviewTargetLocation {
  readonly kind: "file-mention"
  readonly source: "text"
}

export interface FileLinkPreviewTarget extends PreviewTargetLocation {
  readonly kind: "file-link"
  readonly source: Exclude<PreviewTargetSource, "text">
}

export type FilePreviewTarget = FileMentionPreviewTarget | FileLinkPreviewTarget
export type PreviewTarget = UrlPreviewTarget | FilePreviewTarget

const patterns: ReadonlyArray<readonly [Exclude<PreviewTargetKind, "file-link">, RegExp]> = [
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
): UrlPreviewTarget | FileLinkPreviewTarget | undefined {
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
    Array.from(text.matchAll(pattern), (match): UrlPreviewTarget | FileMentionPreviewTarget =>
      kind === "url"
        ? {
            kind,
            value: match[0],
            source: "text",
            start: match.index,
            end: match.index + match[0].length,
          }
        : {
            kind,
            value: match[0],
            source: "text",
            start: match.index,
            end: match.index + match[0].length,
          },
    ),
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
