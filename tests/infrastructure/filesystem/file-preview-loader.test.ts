import { afterEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import type { FilePreviewTarget } from "../../../src/core/preview-target.js"
import { loadFilePreview } from "../../../src/infrastructure/filesystem/file-preview-loader.js"

const workspaces: string[] = []

async function workspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "opencode-hover-preview-"))
  workspaces.push(directory)
  return directory
}

function target(value: string, kind: "file-link" | "file-mention" = "file-link"): FilePreviewTarget {
  return kind === "file-link"
    ? { kind, value, source: "markdown-projection", start: 0, end: value.length }
    : { kind, value, source: "text", start: 0, end: value.length }
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe("workspace file previews", () => {
  test("loads relative paths and file mentions", async () => {
    const root = await workspace()
    await mkdir(join(root, "src"))
    await writeFile(join(root, "src", "main.ts"), "export const greeting = 'hello'\n")

    const relativePreview = await loadFilePreview(
      target("./src/main.ts"),
      root,
      new AbortController().signal,
    )
    const mentionPreview = await loadFilePreview(
      target("@src/main.ts", "file-mention"),
      root,
      new AbortController().signal,
    )

    expect(relativePreview).toMatchObject({
      kind: "file",
      title: "main.ts",
      path: "src/main.ts",
      language: "ts",
      body: "export const greeting = 'hello'\n",
    })
    expect(mentionPreview).toEqual(relativePreview)
  })

  test("accepts absolute paths only inside the workspace", async () => {
    const root = await workspace()
    const file = join(root, "README.md")
    await writeFile(file, "# Project\n")

    expect(await loadFilePreview(target(file), root, new AbortController().signal)).toMatchObject({
      kind: "file",
      path: "README.md",
    })
    expect(
      await loadFilePreview(target(join(root, "..", "outside.txt")), root, new AbortController().signal),
    ).toMatchObject({
      kind: "failure",
      reason: "outside-workspace",
    })
  })

  test("decodes file links and ignores their query and fragment", async () => {
    const root = await workspace()
    await writeFile(join(root, "my file.md"), "# Linked file\n")

    expect(
      await loadFilePreview(
        target("./my%20file.md?view=source#heading"),
        root,
        new AbortController().signal,
      ),
    ).toMatchObject({
      kind: "file",
      title: "my file.md",
      path: "my file.md",
    })
  })

  test("rejects symlinks that escape the workspace", async () => {
    const root = await workspace()
    const outside = await workspace()
    await writeFile(join(outside, "secret.txt"), "secret")

    try {
      await symlink(join(outside, "secret.txt"), join(root, "linked.txt"))
    } catch {
      return
    }

    expect(
      await loadFilePreview(target("./linked.txt"), root, new AbortController().signal),
    ).toMatchObject({
      kind: "failure",
      reason: "workspace-link-escape",
    })
  })

  test("silently ignores binary files and truncates large text", async () => {
    const root = await workspace()
    await writeFile(join(root, "binary.bin"), new Uint8Array([1, 0, 2]))
    await writeFile(
      join(root, "large.txt"),
      Array.from({ length: 30 }, (_, index) => `line ${index}`).join("\n"),
    )

    expect(
      await loadFilePreview(target("./binary.bin"), root, new AbortController().signal),
    ).toBeUndefined()
    const large = await loadFilePreview(target("./large.txt"), root, new AbortController().signal)
    expect(large).toMatchObject({ kind: "file", truncated: true })
    if (large?.kind === "file") expect(large.body.split("\n")).toHaveLength(20)
  })

  test("loads supported images from mentions and file links", async () => {
    const root = await workspace()
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
    await writeFile(join(root, "image.png"), png)

    const linked = await loadFilePreview(
      target("./image.png"),
      root,
      new AbortController().signal,
    )
    const mentioned = await loadFilePreview(
      target("@image.png", "file-mention"),
      root,
      new AbortController().signal,
    )

    expect(linked).toEqual({
      kind: "image",
      title: "image.png",
      location: "image.png",
      mime: "image/png",
      data: png,
    })
    expect(mentioned).toEqual(linked)
  })

  test("suppresses disabled images before applying the size limit", async () => {
    const root = await workspace()
    const header = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    await writeFile(join(root, "disabled.png"), header)

    expect(
      await loadFilePreview(
        target("@disabled.png", "file-mention"),
        root,
        new AbortController().signal,
        false,
      ),
    ).toBeUndefined()

    const oversized = new Uint8Array(10 * 1024 * 1024 + 1)
    oversized.set(header)
    await writeFile(join(root, "oversized.png"), oversized)
    expect(
      await loadFilePreview(target("./oversized.png"), root, new AbortController().signal),
    ).toMatchObject({
      kind: "failure",
      reason: "image-too-large",
    })
  })

  test("preserves Unicode and removes unsafe control characters", async () => {
    const root = await workspace()
    await writeFile(join(root, "unicode.txt"), "hola 👋\u0007\n")

    expect(
      await loadFilePreview(target("./unicode.txt"), root, new AbortController().signal),
    ).toMatchObject({
      kind: "file",
      body: "hola 👋\n",
    })
  })
})
