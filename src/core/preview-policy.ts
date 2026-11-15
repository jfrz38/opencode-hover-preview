import type { PreviewOutcome } from "./preview-content.js"
import type { PreviewTarget } from "./preview-target.js"

export interface PreviewSources {
  readonly url: boolean
  readonly file: boolean
  readonly image: boolean
}

export function canLoadPreview(target: PreviewTarget, sources: PreviewSources): boolean {
  return target.kind === "url"
    ? sources.url || sources.image
    : sources.file || sources.image
}

export function isPreviewEnabled(
  target: PreviewTarget,
  outcome: PreviewOutcome,
  sources: PreviewSources,
): boolean {
  switch (outcome.kind) {
    case "url":
      return sources.url
    case "file":
      return sources.file
    case "image":
      return sources.image
    case "unavailable":
      return target.kind === "url" ? sources.url : sources.file
  }
}
