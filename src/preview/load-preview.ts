import type { PreviewContent } from "../domain/preview-content.js"
import type { PreviewTarget } from "../domain/preview-target.js"
import { loadFilePreview } from "./file-preview.js"
import { loadUrlPreview } from "./url-preview.js"

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
  content: PreviewContent,
  sources: PreviewSources,
): boolean {
  switch (content.kind) {
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

export async function loadPreview(
  target: PreviewTarget,
  workspace: string | undefined,
  sources: PreviewSources,
  signal: AbortSignal,
): Promise<PreviewContent | undefined> {
  if (!canLoadPreview(target, sources)) return undefined

  let content: PreviewContent | undefined
  switch (target.kind) {
    case "url":
      content = await loadUrlPreview(target, signal, undefined, sources.image)
      break
    case "file-mention":
    case "file-link":
      if (workspace === undefined) {
        content = {
          kind: "unavailable",
          title: "File preview unavailable",
          description: "OpenCode has not provided a workspace directory.",
        }
        break
      }
      content = await loadFilePreview(target, workspace, signal, sources.image)
      break
  }

  if (content === undefined) return undefined
  return isPreviewEnabled(target, content, sources) ? content : undefined
}
