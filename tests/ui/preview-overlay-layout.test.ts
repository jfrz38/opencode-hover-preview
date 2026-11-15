import { describe, expect, test } from "bun:test"
import type { PreviewContent } from "../../src/domain/preview-content.js"
import {
  calculatePreviewOverlayLayout,
  imageCellSizeAtNativeScale,
  type PreviewDisplayOptions,
} from "../../src/ui/preview-overlay-layout.js"

const file = (truncated = false): PreviewContent => ({
  kind: "file",
  title: "README.md",
  path: "README.md",
  body: "# Preview",
  truncated,
})

const image: PreviewContent = {
  kind: "image",
  title: "preview.png",
  location: "preview.png",
  mime: "image/png",
  data: new Uint8Array(),
}

function layout(
  content: PreviewContent,
  overrides: Partial<Omit<Parameters<typeof calculatePreviewOverlayLayout>[0], "content" | "display">> & {
    display?: Partial<PreviewDisplayOptions>
  } = {},
) {
  const display: PreviewDisplayOptions = {
    showDetails: false,
    width: 70,
    height: 16,
    image: {
      allowUpscale: false,
    },
    ...overrides.display,
  }
  return calculatePreviewOverlayLayout({
    content,
    lineCount: 0,
    viewport: { width: 120, height: 40 },
    ...overrides,
    display,
  })
}

describe("preview overlay layout", () => {
  test("converts native image pixels to terminal cells when resolution is known", () => {
    expect(
      imageCellSizeAtNativeScale(
        { width: 800, height: 600 },
        { width: 100, height: 40 },
        { width: 1000, height: 800 },
      ),
    ).toEqual({ width: 80, height: 30 })
    expect(
      imageCellSizeAtNativeScale(
        { width: 800, height: 600 },
        { width: 100, height: 40 },
        null,
      ),
    ).toBeUndefined()
  })

  test("uses the same fixed window height for file, image, and text previews", () => {
    expect(layout(file())).toEqual({
      width: 70,
      height: 16,
      fileBodyHeight: 14,
      imageWidth: 0,
      imageHeight: 0,
    })
    expect(layout(file(true))).toMatchObject({ height: 16, fileBodyHeight: 13 })
    expect(layout(image)).toEqual({
      width: 70,
      height: 16,
      fileBodyHeight: 0,
      imageWidth: 66,
      imageHeight: 14,
    })
    const text: PreviewContent = {
      kind: "unavailable",
      title: "Unavailable",
      description: "Could not load.",
    }
    expect(layout(text)).toEqual({
      width: 70,
      height: 16,
      fileBodyHeight: 0,
      imageWidth: 0,
      imageHeight: 0,
    })
  })

  test("subtracts headers, metadata, and truncation indicators from media space", () => {
    expect(
      layout(image, {
        lineCount: 2,
        display: { showDetails: true, height: 30 },
      }),
    ).toMatchObject({ height: 30, imageHeight: 24 })
    expect(
      layout(file(true), {
        lineCount: 2,
        display: { showDetails: true, height: 30 },
      }),
    ).toMatchObject({ height: 30, fileBodyHeight: 23 })
  })

  test("shrinks the fixed window to the viewport and sizes content to its interior", () => {
    expect(
      layout(file(), {
        viewport: { width: 45, height: 6 },
        display: { width: 90, height: 40 },
      }),
    ).toEqual({
      width: 45,
      height: 6,
      fileBodyHeight: 4,
      imageWidth: 0,
      imageHeight: 0,
    })
    expect(
      layout(image, {
        viewport: { width: 120, height: 3 },
        display: { height: 3 },
      }),
    ).toMatchObject({ height: 3, imageHeight: 1 })
  })

  test("never produces negative dimensions for an empty viewport", () => {
    expect(layout(image, { viewport: { width: 0, height: 0 } })).toEqual({
      width: 0,
      height: 0,
      fileBodyHeight: 0,
      imageWidth: 0,
      imageHeight: 0,
    })
  })

  test("does not enlarge images beyond their natural terminal-cell size by default", () => {
    expect(
      layout(image, {
        display: { width: 100, height: 40 },
        naturalImageSize: { width: 20, height: 8 },
      }),
    ).toMatchObject({ imageWidth: 20, imageHeight: 8 })
    expect(
      layout(image, {
        display: { width: 100, height: 40, image: { allowUpscale: true } },
        naturalImageSize: { width: 20, height: 8 },
      }),
    ).toMatchObject({ imageWidth: 96, imageHeight: 38 })
  })
})
