import type { PreviewContent } from "../domain/preview-content.js"
import type { PreviewTarget } from "../domain/preview-target.js"
import { loadFilePreview } from "./file-preview.js"
import { loadUrlPreview } from "./url-preview.js"

export interface PreviewOptions {
  readonly urlPreview: boolean
  readonly filePreview: boolean
}

function unavailable(title: string, description: string): PreviewContent {
  return { kind: "unavailable", title, description }
}

function placeholderPreview(target: PreviewTarget): PreviewContent {
  if (target.kind === "image-placeholder") {
    return {
      kind: "placeholder",
      placeholder: "image",
      title: target.value,
      description: "OpenCode does not expose the image bytes here. Use its native image preview.",
    }
  }

  const lines = target.value.match(/\d+/u)?.[0]
  return {
    kind: "placeholder",
    placeholder: "pasted",
    title: target.value,
    description:
      lines === undefined
        ? "OpenCode does not expose the pasted content here."
        : `Approximately ${lines} pasted lines. OpenCode does not expose their content here.`,
  }
}

export async function loadPreview(
  target: PreviewTarget,
  workspace: string | undefined,
  options: PreviewOptions,
  signal: AbortSignal,
): Promise<PreviewContent> {
  switch (target.kind) {
    case "url":
      return options.urlPreview
        ? loadUrlPreview(target, signal)
        : unavailable("URL preview disabled", "Network requests are disabled by plugin configuration.")
    case "path":
    case "file-mention":
      if (!options.filePreview) {
        return unavailable("File preview disabled", "File reads are disabled by plugin configuration.")
      }
      if (workspace === undefined) {
        return unavailable("File preview unavailable", "OpenCode has not provided a workspace directory.")
      }
      return loadFilePreview(target, workspace, signal)
    case "image-placeholder":
    case "pasted-placeholder":
      return placeholderPreview(target)
  }
}
