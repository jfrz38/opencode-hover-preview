import { describe, expect, test } from "bun:test"
import type { PreviewContent } from "../../src/domain/preview-content.js"
import { calculatePreviewOverlayLayout } from "../../src/ui/preview-overlay-layout.js"

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
  overrides: Partial<Parameters<typeof calculatePreviewOverlayLayout>[0]> = {},
) {
  return calculatePreviewOverlayLayout({
    content,
    lineCount: 0,
    showDetails: false,
    viewport: { width: 120, height: 40 },
    previewWidth: 70,
    previewMinHeight: 4,
    previewMaxHeight: 16,
    ...overrides,
  })
}

describe("preview overlay layout", () => {
  test("preserves the default file and image dimensions", () => {
    expect(layout(file())).toEqual({
      width: 70,
      height: 10,
      fileBodyHeight: 8,
      imageHeight: 0,
    })
    expect(layout(file(true))).toMatchObject({ height: 11, fileBodyHeight: 8 })
    expect(layout(image)).toEqual({
      width: 70,
      height: 12,
      fileBodyHeight: 0,
      imageHeight: 10,
    })
  })

  test("sizes text previews within the configured height range", () => {
    const unavailable: PreviewContent = {
      kind: "unavailable",
      title: "Preview unavailable",
      description: "Could not load.",
    }

    expect(layout(unavailable, { lineCount: 2, previewMinHeight: 8 })).toMatchObject({ height: 8 })
    expect(layout(unavailable, { lineCount: 20, previewMaxHeight: 9 })).toMatchObject({ height: 9 })
  })

  test("keeps detailed media previews at their natural height", () => {
    expect(
      layout(image, {
        lineCount: 2,
        showDetails: true,
        previewMaxHeight: 30,
      }),
    ).toMatchObject({ height: 16, imageHeight: 10 })
  })

  test("shrinks the overlay and media body to the viewport and configured maximum", () => {
    expect(
      layout(file(), {
        viewport: { width: 45, height: 6 },
        previewWidth: 90,
        previewMaxHeight: 8,
      }),
    ).toEqual({
      width: 45,
      height: 6,
      fileBodyHeight: 4,
      imageHeight: 0,
    })
    expect(
      layout(image, {
        viewport: { width: 120, height: 3 },
        previewMaxHeight: 3,
      }),
    ).toMatchObject({ height: 3, imageHeight: 1 })
  })

  test("never produces negative dimensions for an empty viewport", () => {
    expect(layout(image, { viewport: { width: 0, height: 0 } })).toEqual({
      width: 0,
      height: 0,
      fileBodyHeight: 0,
      imageHeight: 0,
    })
  })
})
