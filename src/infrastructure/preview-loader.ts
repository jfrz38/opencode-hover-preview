import type { PreviewOutcome } from "../core/preview-content.js"
import { PreviewSourceSelection } from "../core/preview-policy.js"
import type { PreviewTarget } from "../core/preview-target.js"
import { loadFilePreview } from "./filesystem/file-preview-loader.js"
import { loadUrlPreview } from "./http/url-preview-loader.js"

export async function loadPreview(
  target: PreviewTarget,
  workspace: string | undefined,
  sources: PreviewSourceSelection,
  signal: AbortSignal,
): Promise<PreviewOutcome | undefined> {
  if (!sources.canLoad(target)) return undefined

  let outcome: PreviewOutcome | undefined
  switch (target.kind) {
    case "url":
      outcome = await loadUrlPreview(target, signal, undefined, sources.allowsImage())
      break
    case "file-mention":
    case "file-link":
      if (workspace === undefined) {
        outcome = {
          kind: "failure",
          reason: "workspace-unavailable",
        }
        break
      }
      outcome = await loadFilePreview(target, workspace, signal, sources.allowsImage())
      break
  }

  if (outcome === undefined) return undefined
  return sources.allows(outcome, target) ? outcome : undefined
}
