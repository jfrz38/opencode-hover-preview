import type { PreviewOutcome } from "../core/preview-content.js"
import { canLoadPreview, isPreviewEnabled, type PreviewSources } from "../core/preview-policy.js"
import type { PreviewTarget } from "../core/preview-target.js"
import { loadFilePreview } from "./filesystem/file-preview-loader.js"
import { loadUrlPreview } from "./http/url-preview-loader.js"

export async function loadPreview(
  target: PreviewTarget,
  workspace: string | undefined,
  sources: PreviewSources,
  signal: AbortSignal,
): Promise<PreviewOutcome | undefined> {
  if (!canLoadPreview(target, sources)) return undefined

  let outcome: PreviewOutcome | undefined
  switch (target.kind) {
    case "url":
      outcome = await loadUrlPreview(target, signal, undefined, sources.image)
      break
    case "file-mention":
    case "file-link":
      if (workspace === undefined) {
        outcome = {
          kind: "unavailable",
          title: "File preview unavailable",
          description: "OpenCode has not provided a workspace directory.",
        }
        break
      }
      outcome = await loadFilePreview(target, workspace, signal, sources.image)
      break
  }

  if (outcome === undefined) return undefined
  return isPreviewEnabled(target, outcome, sources) ? outcome : undefined
}
