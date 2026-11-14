import { describe, expect, test } from "bun:test"
import type { LineInfo } from "@opentui/core"
import { findTargetAtTextCell, type TextHitLayout } from "../../src/opentui/text-hit-test.js"
import { findPreviewTargets } from "../../src/domain/preview-target.js"

function layout(lineInfo: LineInfo, overrides: Partial<TextHitLayout> = {}): TextHitLayout {
  return {
    width: 40,
    scrollX: 0,
    scrollY: 0,
    textAlign: "left",
    lineInfo,
    ...overrides,
  }
}

function singleLine(text: string): LineInfo {
  const width = Bun.stringWidth(text)
  return {
    lineStartCols: [0],
    lineWidthCols: [width],
    lineWidthColsMax: width,
    lineSources: [0],
    lineWraps: [0],
  }
}

describe("text cell hit testing", () => {
  test("matches only cells occupied by a file mention", () => {
    const text = "open @README.md please"
    const targets = findPreviewTargets(text)
    const textLayout = layout(singleLine(text))

    expect(findTargetAtTextCell(text, targets, { x: 2, y: 0 }, textLayout)).toBeUndefined()
    expect(findTargetAtTextCell(text, targets, { x: 7, y: 0 }, textLayout)).toMatchObject({
      kind: "file-mention",
      value: "@README.md",
    })
    expect(findTargetAtTextCell(text, targets, { x: 17, y: 0 }, textLayout)).toBeUndefined()
  })

  test("selects the target under the cursor when the line contains several", () => {
    const text = "@one.ts then @two.ts"
    const targets = findPreviewTargets(text)
    const textLayout = layout(singleLine(text))

    expect(findTargetAtTextCell(text, targets, { x: 1, y: 0 }, textLayout)?.value).toBe("@one.ts")
    expect(findTargetAtTextCell(text, targets, { x: 14, y: 0 }, textLayout)?.value).toBe("@two.ts")
    expect(findTargetAtTextCell(text, targets, { x: 9, y: 0 }, textLayout)).toBeUndefined()
  })

  test("tracks a URL across wrapped visual lines and vertical scroll", () => {
    const text = "prefix https://example.com suffix"
    const targets = findPreviewTargets(text)
    const lineInfo: LineInfo = {
      lineStartCols: [0, 7, 15, 23],
      lineWidthCols: [7, 8, 8, 10],
      lineWidthColsMax: 33,
      lineSources: [0, 0, 0, 0],
      lineWraps: [0, 1, 2, 3],
    }

    expect(findTargetAtTextCell(text, targets, { x: 1, y: 1 }, layout(lineInfo, { width: 10 }))).toMatchObject({
      kind: "url",
    })
    expect(
      findTargetAtTextCell(text, targets, { x: 1, y: 0 }, layout(lineInfo, { width: 10, scrollY: 1 })),
    ).toMatchObject({ kind: "url" })
    expect(findTargetAtTextCell(text, targets, { x: 1, y: 0 }, layout(lineInfo, { width: 10 }))).toBeUndefined()
  })

  test("uses terminal cell width for Unicode before a target", () => {
    const text = "🙂 @file.ts"
    const targets = findPreviewTargets(text)
    const textLayout = layout(singleLine(text))

    expect(findTargetAtTextCell(text, targets, { x: 2, y: 0 }, textLayout)).toBeUndefined()
    expect(findTargetAtTextCell(text, targets, { x: 3, y: 0 }, textLayout)?.value).toBe("@file.ts")
  })
})
