import { afterEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { PreviewOutcome } from "../../src/core/preview-content.js"
import {
  canLoadPreview,
  isPreviewEnabled,
  type PreviewSources,
} from "../../src/core/preview-policy.js"
import type { PreviewTarget } from "../../src/core/preview-target.js"
import { loadPreview } from "../../src/infrastructure/preview-loader.js"

const workspaces: string[] = []

function target(kind: PreviewTarget["kind"], value: string): PreviewTarget {
  switch (kind) {
    case "url":
      return { kind, value, source: "text", start: 0, end: value.length }
    case "file-mention":
      return { kind, value, source: "text", start: 0, end: value.length }
    case "file-link":
      return { kind, value, source: "markdown-projection", start: 0, end: value.length }
  }
}

function sources(overrides: Partial<PreviewSources> = {}): PreviewSources {
  return {
    url: true,
    file: true,
    image: true,
    ...overrides,
  }
}

async function workspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "opencode-hover-preview-options-"))
  workspaces.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe("preview loading", () => {
  test("does not load targets when all applicable preview categories are disabled", async () => {
    const disabled = sources({ url: false, file: false, image: false })
    const url = target("url", "https://example.com")
    const file = target("file-link", "./README.md")

    expect(canLoadPreview(url, disabled)).toBe(false)
    expect(canLoadPreview(file, disabled)).toBe(false)
    expect(await loadPreview(url, undefined, disabled, new AbortController().signal)).toBeUndefined()
    expect(await loadPreview(file, process.cwd(), disabled, new AbortController().signal)).toBeUndefined()
  })

  test("treats URL, file, and image content as independent categories", () => {
    const urlTarget = target("url", "https://example.com")
    const fileTarget = target("file-link", "./README.md")
    const url: PreviewOutcome = { kind: "url", title: "Example", host: "example.com", url: "https://example.com/" }
    const file: PreviewOutcome = {
      kind: "file",
      title: "README.md",
      path: "README.md",
      body: "# Example",
      truncated: false,
    }
    const image: PreviewOutcome = {
      kind: "image",
      title: "image.png",
      location: "image.png",
      mime: "image/png",
      data: new Uint8Array(),
    }

    expect(isPreviewEnabled(urlTarget, url, sources({ url: false }))).toBe(false)
    expect(isPreviewEnabled(urlTarget, image, sources({ url: false }))).toBe(true)
    expect(isPreviewEnabled(fileTarget, file, sources({ file: false }))).toBe(false)
    expect(isPreviewEnabled(fileTarget, image, sources({ file: false }))).toBe(true)
    expect(isPreviewEnabled(urlTarget, url, sources({ image: false }))).toBe(true)
    expect(isPreviewEnabled(fileTarget, file, sources({ image: false }))).toBe(true)
    expect(isPreviewEnabled(fileTarget, image, sources({ image: false }))).toBe(false)
  })

  test("shows local images independently from file previews", async () => {
    const root = await workspace()
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    await writeFile(join(root, "image.png"), png)
    await writeFile(join(root, "notes.txt"), "visible text")

    expect(
      await loadPreview(
        target("file-mention", "@image.png"),
        root,
        sources({ file: false }),
        new AbortController().signal,
      ),
    ).toMatchObject({ kind: "image" })
    expect(
      await loadPreview(
        target("file-mention", "@notes.txt"),
        root,
        sources({ file: false }),
        new AbortController().signal,
      ),
    ).toBeUndefined()

    expect(
      await loadPreview(
        target("file-mention", "@image.png"),
        root,
        sources({ image: false }),
        new AbortController().signal,
      ),
    ).toBeUndefined()
    expect(
      await loadPreview(
        target("file-mention", "@notes.txt"),
        root,
        sources({ image: false }),
        new AbortController().signal,
      ),
    ).toMatchObject({ kind: "file" })
  })

  test("hides origin errors when only image previews are enabled", () => {
    const unavailable: PreviewOutcome = {
      kind: "unavailable",
      title: "Preview unavailable",
      description: "The target could not be loaded.",
    }

    expect(
      isPreviewEnabled(
        target("url", "https://example.com"),
        unavailable,
        sources({ url: false }),
      ),
    ).toBe(false)
    expect(
      isPreviewEnabled(
        target("file-link", "./missing.png"),
        unavailable,
        sources({ file: false }),
      ),
    ).toBe(false)
  })
})
