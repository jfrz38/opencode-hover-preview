import { describe, expect, test } from "bun:test"
import { compareMarkdownLayout } from "../../src/opentui/markdown-layout.js"

describe("Markdown layout comparison", () => {
  test("recognizes a flattened concealed projection", () => {
    expect(
      compareMarkdownLayout("[label](https://example.com)", "label", {
        lineStartCols: [0],
        lineWidthCols: [5],
        lineWidthColsMax: 5,
        lineSources: [0],
        lineWraps: [0],
      }),
    ).toMatchObject({
      matchesRaw: false,
      matchesProjection: true,
      visualWidth: 5,
    })
  })

  test("keeps literal Markdown in source mode", () => {
    const raw = "[label](https://example.com)"
    expect(
      compareMarkdownLayout(raw, "label", {
        lineStartCols: [0],
        lineWidthCols: [Bun.stringWidth(raw)],
        lineWidthColsMax: Bun.stringWidth(raw),
        lineSources: [0],
        lineWraps: [0],
      }),
    ).toMatchObject({
      matchesRaw: true,
      matchesProjection: false,
    })
  })
})
