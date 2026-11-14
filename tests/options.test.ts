import { describe, expect, test } from "bun:test"
import { parseOptions } from "../src/options.js"

describe("plugin options", () => {
  test("uses safe defaults", () => {
    expect(parseOptions({})).toEqual({
      enabled: true,
      hoverDelayMs: 500,
      urlPreview: true,
      filePreview: true,
    })
  })

  test("clamps the hover delay", () => {
    expect(parseOptions({ hoverDelayMs: -10 }).hoverDelayMs).toBe(0)
    expect(parseOptions({ hoverDelayMs: 20_000 }).hoverDelayMs).toBe(10_000)
  })

  test("supports feature switches and the legacy diagnostic alias", () => {
    expect(parseOptions({ enabled: false }).enabled).toBe(false)
    expect(parseOptions({ diagnostic: false }).enabled).toBe(false)
    expect(parseOptions({ urlPreview: false, filePreview: false })).toMatchObject({
      urlPreview: false,
      filePreview: false,
    })
  })

})
