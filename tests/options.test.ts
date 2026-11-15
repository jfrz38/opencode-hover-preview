import { describe, expect, test } from "bun:test"
import { parseOptions } from "../src/options.js"

describe("plugin options", () => {
  test("uses safe defaults", () => {
    expect(parseOptions({})).toEqual({
      enabled: true,
      hoverDelayMs: 500,
      urlPreview: true,
      filePreview: true,
      imagePreview: true,
      showDetails: false,
    })
  })

  test("clamps the hover delay", () => {
    expect(parseOptions({ hoverDelayMs: -10 }).hoverDelayMs).toBe(0)
    expect(parseOptions({ hoverDelayMs: 20_000 }).hoverDelayMs).toBe(10_000)
  })

  test("supports feature switches and the legacy diagnostic alias", () => {
    expect(parseOptions({ enabled: false }).enabled).toBe(false)
    expect(parseOptions({ diagnostic: false }).enabled).toBe(false)
    expect(parseOptions({ urlPreview: false, filePreview: false, imagePreview: false })).toMatchObject({
      urlPreview: false,
      filePreview: false,
      imagePreview: false,
    })
  })

  test("shows preview details only when explicitly enabled", () => {
    expect(parseOptions({}).showDetails).toBe(false)
    expect(parseOptions({ showDetails: true }).showDetails).toBe(true)
    expect(parseOptions({ showDetails: "true" }).showDetails).toBe(false)
  })

})
