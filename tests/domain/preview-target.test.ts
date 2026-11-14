import { describe, expect, test } from "bun:test"
import { findPreviewTargets, findUnambiguousPreviewTarget } from "../../src/domain/preview-target.js"

describe("preview target detection", () => {
  test("recognizes each experiment target", () => {
    expect(findPreviewTargets("https://example.com/docs").map((target) => target.kind)).toEqual(["url"])
    expect(findPreviewTargets("[Image1]").map((target) => target.kind)).toEqual(["image-placeholder"])
    expect(findPreviewTargets("[Image 12]").map((target) => target.kind)).toEqual(["image-placeholder"])
    expect(findPreviewTargets("[Pasted ~3 lines]").map((target) => target.kind)).toEqual(["pasted-placeholder"])
    expect(findPreviewTargets("@src/main.ts").map((target) => target.kind)).toEqual(["file-mention"])
    expect(findPreviewTargets("./README.md").map((target) => target.kind)).toEqual(["path"])
    expect(findPreviewTargets("C:\\project\\README.md").map((target) => target.kind)).toEqual(["path"])
  })

  test("does not report the path inside a URL as a second target", () => {
    expect(findPreviewTargets("https://example.com/docs")).toHaveLength(1)
  })

  test("rejects malformed image placeholders", () => {
    expect(findPreviewTargets("[Image  1]")).toEqual([])
    expect(findPreviewTargets("[Image #1]")).toEqual([])
    expect(findPreviewTargets("[Image]")).toEqual([])
  })

  test("only resolves a target when the containing renderable is unambiguous", () => {
    expect(findUnambiguousPreviewTarget("see https://example.com")).toMatchObject({ kind: "url" })
    expect(findUnambiguousPreviewTarget("https://one.test https://two.test")).toBeUndefined()
  })
})
