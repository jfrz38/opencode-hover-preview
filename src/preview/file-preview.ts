import { open, realpath, stat } from "node:fs/promises"
import { basename, extname, isAbsolute, relative, resolve, sep } from "node:path"
import type { PreviewContent } from "../domain/preview-content.js"
import type { PreviewTarget } from "../domain/preview-target.js"

const MAX_READ_BYTES = 64 * 1024
const MAX_PREVIEW_CHARACTERS = 4_000
const MAX_PREVIEW_LINES = 20

function unavailable(description: string): PreviewContent {
  return { kind: "unavailable", title: "File preview unavailable", description }
}

function isInside(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate)
  return pathFromRoot === "" || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== ".." && !isAbsolute(pathFromRoot))
}

function targetPath(target: PreviewTarget): string | undefined {
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

async function readPrefix(path: string, size: number, signal: AbortSignal): Promise<Uint8Array> {
  const file = await open(path, "r")
  try {
    signal.throwIfAborted()
    const length = Math.min(size, MAX_READ_BYTES + 1)
    const buffer = new Uint8Array(length)
    const { bytesRead } = await file.read(buffer, 0, length, 0)
    signal.throwIfAborted()
    return buffer.subarray(0, bytesRead)
  } finally {
    await file.close()
  }
}

export async function loadFilePreview(
  target: PreviewTarget,
  workspace: string,
  signal: AbortSignal,
): Promise<PreviewContent> {
  const requestedPath = targetPath(target)
  if (requestedPath === undefined || requestedPath.length === 0) {
    return unavailable("The target is not a local file path.")
  }

  try {
    signal.throwIfAborted()
    const workspacePath = await realpath(workspace)
    const candidatePath = resolve(workspacePath, requestedPath)
    if (!isInside(workspacePath, candidatePath)) {
      return unavailable("The file is outside the current workspace.")
    }

    const resolvedPath = await realpath(candidatePath)
    if (!isInside(workspacePath, resolvedPath)) {
      return unavailable("The file resolves outside the current workspace.")
    }

    const fileStat = await stat(resolvedPath)
    if (!fileStat.isFile()) return unavailable("The target is not a regular file.")

    const bytes = await readPrefix(resolvedPath, fileStat.size, signal)
    const text = sanitizedText(bytes)
    if (text === undefined) return unavailable("Binary files are not shown.")

    const preview = truncateText(text)
    const relativePath = relative(workspacePath, resolvedPath).split(sep).join("/")
    const extension = extname(resolvedPath).slice(1)

    return {
      kind: "file",
      title: basename(resolvedPath),
      path: relativePath,
      body: preview.body,
      language: extension || undefined,
      truncated: preview.truncated || fileStat.size > MAX_READ_BYTES,
    }
  } catch (error) {
    if (signal.aborted) throw error
    return unavailable("The file does not exist or cannot be read.")
  }
}
