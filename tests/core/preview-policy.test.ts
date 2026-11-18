import { describe, expect, test } from "bun:test"
import type { PreviewOutcome } from "../../src/core/preview-content.js"
import { PreviewSourceSelection } from "../../src/core/preview-policy.js"
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

const sources = (overrides: Partial<{ url: boolean; file: boolean; image: boolean }> = {}) =>
  new PreviewSourceSelection({
  url: true,
  file: true,
  image: true,
  ...overrides,
  })

describe("preview policy", () => {
  test("allows image loading independently from the target origin", () => {
    expect(sources({ url: false }).canLoad(urlTarget)).toBe(true)
    expect(sources({ file: false }).canLoad(fileTarget)).toBe(true)
    expect(
      sources({ url: false, image: false }).canLoad(urlTarget),
    ).toBe(false)
    expect(
      sources({ file: false, image: false }).canLoad(fileTarget),
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
      kind: "failure",
      reason: "load-failed",
    }

    expect(sources({ url: false }).allows(image, urlTarget)).toBe(true)
    expect(sources({ url: false }).allows(unavailable, urlTarget)).toBe(false)
    expect(sources({ file: false }).allows(unavailable, fileTarget)).toBe(false)
  })
})
