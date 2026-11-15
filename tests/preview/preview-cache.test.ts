import { describe, expect, test } from "bun:test"
import { PreviewCache } from "../../src/preview/preview-cache.js"
import type { PreviewContent } from "../../src/domain/preview-content.js"

const content: PreviewContent = {
  kind: "file",
  title: "README.md",
  path: "README.md",
  body: "# Project",
  truncated: false,
}

describe("preview cache", () => {
  test("expires entries and does not cache failures", () => {
    let now = 0
    const cache = new PreviewCache(2, 10, () => now)
    cache.set("image", content)
    cache.set("failure", { kind: "unavailable", title: "No", description: "No" })

    expect(cache.get("image")).toEqual(content)
    expect(cache.get("failure")).toBeUndefined()
    now = 10
    expect(cache.get("image")).toBeUndefined()
  })

  test("evicts the least recently used entry", () => {
    const cache = new PreviewCache(2)
    cache.set("one", content)
    cache.set("two", content)
    expect(cache.get("one")).toEqual(content)
    cache.set("three", content)

    expect(cache.get("two")).toBeUndefined()
    expect(cache.get("one")).toEqual(content)
    expect(cache.get("three")).toEqual(content)
  })

  test("bounds cached image bytes", () => {
    const cache = new PreviewCache(100, 60_000, () => 0, 5)
    const image = (size: number): PreviewContent => ({
      kind: "image",
      title: "image.png",
      location: "image.png",
      mime: "image/png",
      data: new Uint8Array(size),
    })

    cache.set("one", image(3))
    cache.set("two", image(3))
    expect(cache.get("one")).toBeUndefined()
    expect(cache.get("two")).toEqual(image(3))

    cache.set("oversized", image(6))
    expect(cache.get("oversized")).toBeUndefined()
  })
})
