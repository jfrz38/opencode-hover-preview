import type { PreviewOutcome } from "../../core/preview-content.js"
import type { FilePreviewTarget } from "../../core/preview-target.js"
import { detectImageMime, MAX_IMAGE_BYTES } from "../media/image-format.js"
import { resolveWorkspaceFile } from "./workspace-file.js"
import { previewTextFile, readFilePrefix } from "./text-file-preview.js"

export async function loadFilePreview(
  target: FilePreviewTarget,
  workspace: string,
  signal: AbortSignal,
  imagePreview = true,
): Promise<PreviewOutcome | undefined> {
  const resolution = await resolveWorkspaceFile(target, workspace, signal)
  if (resolution.kind === "failure") return resolution
  const { file } = resolution

  try {
    const bytes = await readFilePrefix(file.absolutePath, file.size, signal)
    const imageMime = detectImageMime(bytes)
    if (imageMime !== undefined) {
      if (!imagePreview) return undefined
      if (file.size > MAX_IMAGE_BYTES) return { kind: "failure", reason: "image-too-large" }

      const imageData = await readFilePrefix(file.absolutePath, file.size, signal, MAX_IMAGE_BYTES)
      if (detectImageMime(imageData) !== imageMime) {
        return { kind: "failure", reason: "image-format-mismatch" }
      }
      return {
        kind: "image",
        title: file.title,
        location: file.relativePath,
        mime: imageMime,
        data: imageData,
      }
    }

    const preview = previewTextFile(bytes, file.size)
    if (preview === undefined) return undefined

    return {
      kind: "file",
      title: file.title,
      path: file.relativePath,
      body: preview.body,
      ...(file.language === undefined ? {} : { language: file.language }),
      truncated: preview.truncated,
    }
  } catch (error) {
    if (signal.aborted) throw error
    return { kind: "failure", reason: "file-unreadable" }
  }
}
