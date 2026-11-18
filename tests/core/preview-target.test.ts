import { describe, expect, test } from "bun:test"
import {
  findPreviewTargets,
  linkPreviewTarget,
} from "../../src/core/preview-target.js"

describe("preview target detection", () => {
  test("recognizes only external URLs and file mentions in plain text", () => {
    expect(findPreviewTargets("https://example.com/docs").map((target) => target.kind)).toEqual(["url"])
    expect(findPreviewTargets("HTTPS://EXAMPLE.COM/docs").map((target) => target.kind)).toEqual(["url"])
    expect(findPreviewTargets("@src/main.ts").map((target) => target.kind)).toEqual(["file-mention"])
    expect(findPreviewTargets("./README.md C:\\project\\README.md")).toEqual([])
    expect(findPreviewTargets("[Image 1] [Pasted ~3 lines]")).toEqual([])
  })

  test("does not report the path inside a URL as a second target", () => {
    expect(findPreviewTargets("https://example.com/docs")).toHaveLength(1)
  })

  test("classifies supported link destinations", () => {
    expect(linkPreviewTarget("https://example.com", "link-metadata", 1, 4)).toMatchObject({
      kind: "url",
    })
    expect(linkPreviewTarget("./README.md#usage", "markdown-projection", 1, 4)).toMatchObject({
      kind: "file-link",
    })
    expect(linkPreviewTarget("C:\\project\\README.md", "link-metadata", 1, 4)).toMatchObject({
      kind: "file-link",
    })
  })

  test("rejects unsupported and destination-less links", () => {
    expect(linkPreviewTarget("#usage", "link-metadata", 0, 1)).toBeUndefined()
    expect(linkPreviewTarget("file:///project/README.md", "link-metadata", 0, 1)).toBeUndefined()
    expect(linkPreviewTarget("mailto:user@example.com", "link-metadata", 0, 1)).toBeUndefined()
    expect(linkPreviewTarget("//example.com/page", "link-metadata", 0, 1)).toBeUndefined()
  })

})
