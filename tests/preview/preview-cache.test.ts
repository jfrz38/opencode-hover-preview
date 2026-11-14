import { describe, expect, test } from "bun:test"
import { PreviewCache } from "../../src/preview/preview-cache.js"
import type { PreviewContent } from "../../src/domain/preview-content.js"

const content: PreviewContent = {
  kind: "placeholder",
  placeholder: "image",
  title: "[Image 1]",
  description: "Image",
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
})
