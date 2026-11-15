import type { PreviewContent } from "../domain/preview-content.js"
import type { PreviewTarget } from "../domain/preview-target.js"
import { loadFilePreview } from "./file-preview.js"
import { loadUrlPreview } from "./url-preview.js"

export interface PreviewOptions {
  readonly urlPreview: boolean
  readonly filePreview: boolean
  readonly imagePreview: boolean
}

export function canLoadPreview(target: PreviewTarget, options: PreviewOptions): boolean {
  return target.kind === "url"
    ? options.urlPreview || options.imagePreview
    : options.filePreview || options.imagePreview
}

export function isPreviewEnabled(
  target: PreviewTarget,
  content: PreviewContent,
  options: PreviewOptions,
): boolean {
  switch (content.kind) {
    case "url":
      return options.urlPreview
    case "file":
      return options.filePreview
    case "image":
      return options.imagePreview
    case "unavailable":
      return target.kind === "url" ? options.urlPreview : options.filePreview
  }
}

export async function loadPreview(
  target: PreviewTarget,
  workspace: string | undefined,
  options: PreviewOptions,
  signal: AbortSignal,
): Promise<PreviewContent | undefined> {
  if (!canLoadPreview(target, options)) return undefined

  let content: PreviewContent | undefined
  switch (target.kind) {
    case "url":
      content = await loadUrlPreview(target, signal, undefined, options.imagePreview)
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
      content = await loadFilePreview(target, workspace, signal, options.imagePreview)
      break
  }

  if (content === undefined) return undefined
  return isPreviewEnabled(target, content, options) ? content : undefined
}
