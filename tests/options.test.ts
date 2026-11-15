import { describe, expect, test } from "bun:test"
import { parseOptions } from "../src/options.js"

describe("plugin options", () => {
  test("uses safe defaults", () => {
    expect(parseOptions({})).toEqual({
      enabled: true,
      hoverDelayMs: 500,
      sources: {
        url: true,
        file: true,
        image: true,
      },
      display: {
        showDetails: false,
        width: 70,
        minHeight: 4,
        maxHeight: 16,
      },
    })
  })

  test("clamps the hover delay", () => {
    expect(parseOptions({ hoverDelayMs: -10 }).hoverDelayMs).toBe(0)
    expect(parseOptions({ hoverDelayMs: 20_000 }).hoverDelayMs).toBe(10_000)
  })

  test("supports feature switches and the legacy diagnostic alias", () => {
    expect(parseOptions({ enabled: false }).enabled).toBe(false)
    expect(parseOptions({ diagnostic: false }).enabled).toBe(false)
    expect(parseOptions({ sources: { url: false, file: false, image: false } }).sources).toEqual({
      url: false,
      file: false,
      image: false,
    })
  })

  test("shows preview details only when explicitly enabled", () => {
    expect(parseOptions({}).display.showDetails).toBe(false)
    expect(parseOptions({ display: { showDetails: true } }).display.showDetails).toBe(true)
    expect(parseOptions({ display: { showDetails: "true" } }).display.showDetails).toBe(false)
  })

  test("supports custom preview dimensions", () => {
    expect(
      parseOptions({ display: { width: 90.8, minHeight: 6.9, maxHeight: 24.2 } }).display,
    ).toEqual({
      showDetails: false,
      width: 90,
      minHeight: 6,
      maxHeight: 24,
    })
  })

  test("normalizes invalid and contradictory preview dimensions", () => {
    expect(
      parseOptions({
        display: {
          width: Number.POSITIVE_INFINITY,
          minHeight: -2,
          maxHeight: "12",
        },
      }).display,
    ).toEqual({
      showDetails: false,
      width: 70,
      minHeight: 4,
      maxHeight: 16,
    })
    expect(
      parseOptions({ display: { width: 2, minHeight: 20, maxHeight: 10 } }).display,
    ).toEqual({
      showDetails: false,
      width: 4,
      minHeight: 20,
      maxHeight: 20,
    })
  })

  test("uses defaults for invalid option groups", () => {
    expect(parseOptions({ sources: null, display: "compact" })).toMatchObject({
      sources: { url: true, file: true, image: true },
      display: { showDetails: false, width: 70, minHeight: 4, maxHeight: 16 },
    })
  })

  test("does not interpret legacy flat preview options", () => {
    expect(
      parseOptions({
        urlPreview: false,
        filePreview: false,
        imagePreview: false,
        showDetails: true,
        previewWidth: 90,
        previewMinHeight: 8,
        previewMaxHeight: 24,
      }),
    ).toMatchObject({
      sources: { url: true, file: true, image: true },
      display: { showDetails: false, width: 70, minHeight: 4, maxHeight: 16 },
    })
  })
})
