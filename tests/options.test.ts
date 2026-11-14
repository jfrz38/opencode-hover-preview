import { describe, expect, test } from "bun:test"
import { parseOptions } from "../src/options.js"

describe("plugin options", () => {
  test("uses safe defaults", () => {
    expect(parseOptions({})).toEqual({ diagnostic: true, hoverDelayMs: 500 })
  })

  test("clamps the hover delay", () => {
    expect(parseOptions({ hoverDelayMs: -10 }).hoverDelayMs).toBe(0)
    expect(parseOptions({ hoverDelayMs: 20_000 }).hoverDelayMs).toBe(10_000)
  })

})
