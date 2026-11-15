import { afterEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { PreviewContent } from "../../src/domain/preview-content.js"
import type { PreviewTarget } from "../../src/domain/preview-target.js"
import {
  canLoadPreview,
  isPreviewEnabled,
  loadPreview,
  type PreviewOptions,
} from "../../src/preview/load-preview.js"

const workspaces: string[] = []

function target(kind: PreviewTarget["kind"], value: string): PreviewTarget {
  return { kind, value, source: "text", start: 0, end: value.length }
}

function options(overrides: Partial<PreviewOptions> = {}): PreviewOptions {
  return {
    urlPreview: true,
    filePreview: true,
    imagePreview: true,
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
    const disabled = options({ urlPreview: false, filePreview: false, imagePreview: false })
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
    const url: PreviewContent = { kind: "url", title: "Example", host: "example.com", url: "https://example.com/" }
    const file: PreviewContent = {
      kind: "file",
      title: "README.md",
      path: "README.md",
      body: "# Example",
      truncated: false,
    }
    const image: PreviewContent = {
      kind: "image",
      title: "image.png",
      location: "image.png",
      mime: "image/png",
      data: new Uint8Array(),
    }

    expect(isPreviewEnabled(urlTarget, url, options({ urlPreview: false }))).toBe(false)
    expect(isPreviewEnabled(urlTarget, image, options({ urlPreview: false }))).toBe(true)
    expect(isPreviewEnabled(fileTarget, file, options({ filePreview: false }))).toBe(false)
    expect(isPreviewEnabled(fileTarget, image, options({ filePreview: false }))).toBe(true)
    expect(isPreviewEnabled(urlTarget, url, options({ imagePreview: false }))).toBe(true)
    expect(isPreviewEnabled(fileTarget, file, options({ imagePreview: false }))).toBe(true)
    expect(isPreviewEnabled(fileTarget, image, options({ imagePreview: false }))).toBe(false)
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
        options({ filePreview: false }),
        new AbortController().signal,
      ),
    ).toMatchObject({ kind: "image" })
    expect(
      await loadPreview(
        target("file-mention", "@notes.txt"),
        root,
        options({ filePreview: false }),
        new AbortController().signal,
      ),
    ).toBeUndefined()

    expect(
      await loadPreview(
        target("file-mention", "@image.png"),
        root,
        options({ imagePreview: false }),
        new AbortController().signal,
      ),
    ).toBeUndefined()
    expect(
      await loadPreview(
        target("file-mention", "@notes.txt"),
        root,
        options({ imagePreview: false }),
        new AbortController().signal,
      ),
    ).toMatchObject({ kind: "file" })
  })

  test("hides origin errors when only image previews are enabled", () => {
    const unavailable: PreviewContent = {
      kind: "unavailable",
      title: "Preview unavailable",
      description: "The target could not be loaded.",
    }

    expect(
      isPreviewEnabled(
        target("url", "https://example.com"),
        unavailable,
        options({ urlPreview: false }),
      ),
    ).toBe(false)
    expect(
      isPreviewEnabled(
        target("file-link", "./missing.png"),
        unavailable,
        options({ filePreview: false }),
      ),
    ).toBe(false)
  })
})
