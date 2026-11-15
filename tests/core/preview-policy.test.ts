import { describe, expect, test } from "bun:test"
import type { PreviewOutcome } from "../../src/core/preview-content.js"
import {
  canLoadPreview,
  isPreviewEnabled,
  type PreviewSources,
} from "../../src/core/preview-policy.js"
import type { PreviewTarget } from "../../src/core/preview-target.js"

const urlTarget: PreviewTarget = {
  kind: "url",
  value: "https://example.com",
  source: "text",
  start: 0,
  end: 19,
}

const fileTarget: PreviewTarget = {
  kind: "file-link",
  value: "./README.md",
  source: "markdown-projection",
  start: 0,
  end: 11,
}

const sources = (overrides: Partial<PreviewSources> = {}): PreviewSources => ({
  url: true,
  file: true,
  image: true,
  ...overrides,
})

describe("preview policy", () => {
  test("allows image loading independently from the target origin", () => {
    expect(canLoadPreview(urlTarget, sources({ url: false }))).toBe(true)
    expect(canLoadPreview(fileTarget, sources({ file: false }))).toBe(true)
    expect(
      canLoadPreview(urlTarget, sources({ url: false, image: false })),
    ).toBe(false)
    expect(
      canLoadPreview(fileTarget, sources({ file: false, image: false })),
    ).toBe(false)
  })

  test("uses the outcome category when deciding visibility", () => {
    const image: PreviewOutcome = {
      kind: "image",
      title: "image.png",
      location: "image.png",
      mime: "image/png",
      data: new Uint8Array(),
    }
    const unavailable: PreviewOutcome = {
      kind: "unavailable",
      title: "Unavailable",
      description: "Unavailable",
    }

    expect(isPreviewEnabled(urlTarget, image, sources({ url: false }))).toBe(true)
    expect(isPreviewEnabled(urlTarget, unavailable, sources({ url: false }))).toBe(false)
    expect(isPreviewEnabled(fileTarget, unavailable, sources({ file: false }))).toBe(false)
  })
})
