import { describe, expect, test } from "bun:test"
import { parseOptions } from "../src/options.js"
import type { PreviewTarget } from "../src/core/preview-target.js"

const urlTarget: PreviewTarget = {
  kind: "url",
  value: "https://example.com",
  source: "text",
  start: 0,
  end: 19,
}

const fileTarget: PreviewTarget = {
  kind: "file-mention",
  value: "@README.md",
  source: "text",
  start: 0,
  end: 10,
}

describe("plugin options", () => {
  test("uses safe defaults", () => {
    const options = parseOptions({})
    expect(options).toMatchObject({
      enabled: true,
      hoverDelayMs: 500,
      display: {
        showDetails: false,
        width: 70,
        height: 16,
        image: {
          allowUpscale: false,
        },
      },
    })
    expect(options.sources.canLoad(urlTarget)).toBe(true)
    expect(options.sources.canLoad(fileTarget)).toBe(true)
  })

  test("clamps the hover delay", () => {
    expect(parseOptions({ hoverDelayMs: -10 }).hoverDelayMs).toBe(0)
    expect(parseOptions({ hoverDelayMs: 20_000 }).hoverDelayMs).toBe(10_000)
  })

  test("supports feature switches and the legacy diagnostic alias", () => {
    expect(parseOptions({ enabled: false }).enabled).toBe(false)
    expect(parseOptions({ diagnostic: false }).enabled).toBe(false)
    const sources = parseOptions({
      sources: { url: false, file: false, image: false },
    }).sources
    expect(sources.canLoad(urlTarget)).toBe(false)
    expect(sources.canLoad(fileTarget)).toBe(false)
  })

  test("shows preview details only when explicitly enabled", () => {
    expect(parseOptions({}).display.showDetails).toBe(false)
    expect(parseOptions({ display: { showDetails: true } }).display.showDetails).toBe(true)
    expect(parseOptions({ display: { showDetails: "true" } }).display.showDetails).toBe(false)
  })

  test("supports custom preview dimensions", () => {
    expect(
      parseOptions({ display: { width: 90.8, height: 24.2 } }).display,
    ).toEqual({
      showDetails: false,
      width: 90,
      height: 24,
      image: {
        allowUpscale: false,
      },
    })
  })

  test("normalizes invalid preview dimensions", () => {
    expect(
      parseOptions({
        display: {
          width: Number.POSITIVE_INFINITY,
          height: "12",
        },
      }).display,
    ).toEqual({
      showDetails: false,
      width: 70,
      height: 16,
      image: {
        allowUpscale: false,
      },
    })
    expect(parseOptions({ display: { width: 2, height: 1 } }).display).toMatchObject({
      width: 4,
      height: 2,
    })
  })

  test("uses defaults for invalid option groups", () => {
    const options = parseOptions({ sources: null, display: "compact" })
    expect(options).toMatchObject({
      display: {
        showDetails: false,
        width: 70,
        height: 16,
        image: { allowUpscale: false },
      },
    })
    expect(options.sources.canLoad(urlTarget)).toBe(true)
    expect(options.sources.canLoad(fileTarget)).toBe(true)
  })

  test("does not interpret legacy flat preview options", () => {
    const options = parseOptions({
        urlPreview: false,
        filePreview: false,
        imagePreview: false,
        showDetails: true,
        previewWidth: 90,
        previewHeight: 80,
      })
    expect(options).toMatchObject({
      display: {
        showDetails: false,
        width: 70,
        height: 16,
        image: { allowUpscale: false },
      },
    })
    expect(options.sources.canLoad(urlTarget)).toBe(true)
    expect(options.sources.canLoad(fileTarget)).toBe(true)
  })

  test("does not interpret legacy minHeight and maxHeight settings", () => {
    expect(parseOptions({ display: { minHeight: 40, maxHeight: 80 } }).display.height).toBe(16)
  })

  test("allows image upscaling only when explicitly enabled", () => {
    expect(parseOptions({}).display.image.allowUpscale).toBe(false)
    expect(
      parseOptions({ display: { image: { allowUpscale: true } } }).display.image.allowUpscale,
    ).toBe(true)
    expect(
      parseOptions({ display: { image: { allowUpscale: "true" } } }).display.image.allowUpscale,
    ).toBe(false)
  })
})
