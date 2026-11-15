import { open, realpath, stat } from "node:fs/promises"
import { basename, extname, isAbsolute, relative, resolve, sep } from "node:path"
import type { PreviewOutcome } from "../../core/preview-content.js"
import type { FilePreviewTarget } from "../../core/preview-target.js"
import { detectImageMime, MAX_IMAGE_BYTES } from "../media/image-format.js"

const MAX_READ_BYTES = 64 * 1024
const MAX_PREVIEW_CHARACTERS = 4_000
const MAX_PREVIEW_LINES = 20

function isInside(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate)
  return pathFromRoot === "" || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== ".." && !isAbsolute(pathFromRoot))
}

function targetPath(target: FilePreviewTarget): string | undefined {
  if (target.kind === "file-mention") return target.value.slice(1)
  if (target.kind === "file-link") {
    const suffix = target.value.search(/[?#]/u)
    const path = suffix === -1 ? target.value : target.value.slice(0, suffix)
    try {
      return decodeURIComponent(path)
    } catch {
      return undefined
    }
  }
  return undefined
}

function sanitizedText(bytes: Uint8Array): string | undefined {
  if (bytes.includes(0)) return undefined

  try {
    return new TextDecoder("utf-8", { fatal: true })
      .decode(bytes)
      .replace(/\r\n?/gu, "\n")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, "")
  } catch {
    return undefined
  }
}

function truncateText(text: string): { readonly body: string; readonly truncated: boolean } {
  const lines = text.split("\n")
  const limitedLines = lines.slice(0, MAX_PREVIEW_LINES).join("\n")
  const characters = [...limitedLines]
  const body = characters.slice(0, MAX_PREVIEW_CHARACTERS).join("")
  return {
    body,
    truncated: lines.length > MAX_PREVIEW_LINES || characters.length > MAX_PREVIEW_CHARACTERS,
  }
}

async function readPrefix(
  path: string,
  size: number,
  signal: AbortSignal,
  maxBytes = MAX_READ_BYTES,
): Promise<Uint8Array> {
  const file = await open(path, "r")
  try {
    signal.throwIfAborted()
    const length = Math.min(size, maxBytes + 1)
    const buffer = new Uint8Array(length)
    let offset = 0
    while (offset < length) {
      signal.throwIfAborted()
      const { bytesRead } = await file.read(buffer, offset, length - offset, offset)
      if (bytesRead === 0) break
      offset += bytesRead
    }
    return buffer.subarray(0, offset)
  } finally {
    await file.close()
  }
}

export async function loadFilePreview(
  target: FilePreviewTarget,
  workspace: string,
  signal: AbortSignal,
  imagePreview = true,
): Promise<PreviewOutcome | undefined> {
  const requestedPath = targetPath(target)
  if (requestedPath === undefined || requestedPath.length === 0) {
    return { kind: "failure", reason: "invalid-file-target" }
  }

  try {
    signal.throwIfAborted()
    const workspacePath = await realpath(workspace)
    const candidatePath = resolve(workspacePath, requestedPath)
    if (!isInside(workspacePath, candidatePath)) {
      return { kind: "failure", reason: "outside-workspace" }
    }

    const resolvedPath = await realpath(candidatePath)
    if (!isInside(workspacePath, resolvedPath)) {
      return { kind: "failure", reason: "workspace-link-escape" }
    }

    const fileStat = await stat(resolvedPath)
    if (!fileStat.isFile()) return { kind: "failure", reason: "not-a-file" }

    const bytes = await readPrefix(resolvedPath, fileStat.size, signal)
    const imageMime = detectImageMime(bytes)
    if (imageMime !== undefined) {
      if (!imagePreview) return undefined
      if (fileStat.size > MAX_IMAGE_BYTES) return { kind: "failure", reason: "image-too-large" }

      const imageData = await readPrefix(resolvedPath, fileStat.size, signal, MAX_IMAGE_BYTES)
      if (detectImageMime(imageData) !== imageMime) {
        return { kind: "failure", reason: "image-format-mismatch" }
      }
      const relativePath = relative(workspacePath, resolvedPath).split(sep).join("/")
      return {
        kind: "image",
        title: basename(resolvedPath),
        location: relativePath,
        mime: imageMime,
        data: imageData,
      }
    }

    const text = sanitizedText(bytes)
    if (text === undefined) return undefined

    const preview = truncateText(text)
    const relativePath = relative(workspacePath, resolvedPath).split(sep).join("/")
    const extension = extname(resolvedPath).slice(1)

    return {
      kind: "file",
      title: basename(resolvedPath),
      path: relativePath,
      body: preview.body,
      ...(extension === "" ? {} : { language: extension }),
      truncated: preview.truncated || fileStat.size > MAX_READ_BYTES,
    }
  } catch (error) {
    if (signal.aborted) throw error
    return { kind: "failure", reason: "file-unreadable" }
  }
}
