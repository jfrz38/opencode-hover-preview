import { realpath, stat } from "node:fs/promises"
import { basename, extname, isAbsolute, relative, resolve, sep } from "node:path"
import type { PreviewFailure } from "../../core/preview-failure.js"
import type { FilePreviewTarget } from "../../core/preview-target.js"

export interface WorkspaceFile {
  readonly absolutePath: string
  readonly relativePath: string
  readonly title: string
  readonly language?: string
  readonly size: number
}

type WorkspaceFileResolution = { readonly kind: "resolved"; readonly file: WorkspaceFile } | PreviewFailure

function isInside(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate)
  return (
    pathFromRoot === "" ||
    (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== ".." && !isAbsolute(pathFromRoot))
  )
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

export async function resolveWorkspaceFile(
  target: FilePreviewTarget,
  workspace: string,
  signal: AbortSignal,
): Promise<WorkspaceFileResolution> {
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

    const extension = extname(resolvedPath).slice(1)
    return {
      kind: "resolved",
      file: {
        absolutePath: resolvedPath,
        relativePath: relative(workspacePath, resolvedPath).split(sep).join("/"),
        title: basename(resolvedPath),
        ...(extension === "" ? {} : { language: extension }),
        size: fileStat.size,
      },
    }
  } catch (error) {
    if (signal.aborted) throw error
    return { kind: "failure", reason: "file-unreadable" }
  }
}
