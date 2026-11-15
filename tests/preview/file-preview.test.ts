import { afterEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { loadFilePreview } from "../../src/preview/file-preview.js"
import type { PreviewTarget } from "../../src/domain/preview-target.js"

const workspaces: string[] = []

async function workspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "opencode-link-preview-"))
  workspaces.push(directory)
  return directory
}

function target(value: string, kind: "file-link" | "file-mention" = "file-link"): PreviewTarget {
  return {
    kind,
    value,
    source: kind === "file-link" ? "markdown-projection" : "text",
    start: 0,
    end: value.length,
  }
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
      kind: "unavailable",
      description: "The file is outside the current workspace.",
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
      kind: "unavailable",
      description: "The file resolves outside the current workspace.",
    })
  })

  test("rejects binary files and truncates large text", async () => {
    const root = await workspace()
    await writeFile(join(root, "binary.bin"), new Uint8Array([1, 0, 2]))
    await writeFile(
      join(root, "large.txt"),
      Array.from({ length: 30 }, (_, index) => `line ${index}`).join("\n"),
    )

    expect(
      await loadFilePreview(target("./binary.bin"), root, new AbortController().signal),
    ).toMatchObject({
      kind: "unavailable",
      description: "Binary files are not shown.",
    })
    const large = await loadFilePreview(target("./large.txt"), root, new AbortController().signal)
    expect(large).toMatchObject({ kind: "file", truncated: true })
    if (large.kind === "file") expect(large.body.split("\n")).toHaveLength(20)
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
