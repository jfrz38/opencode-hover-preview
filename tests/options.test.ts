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
        height: 16,
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
      parseOptions({ display: { width: 90.8, height: 24.2 } }).display,
    ).toEqual({
      showDetails: false,
      width: 90,
      height: 24,
    })
  })

  test("normalizes invalid preview dimensions", () => {
    expect(
      parseOptions({
        display: {
          width: Number.POSITIVE_INFINITY,
          height: "12",
        },
      }).display,
    ).toEqual({
      showDetails: false,
      width: 70,
      height: 16,
    })
    expect(parseOptions({ display: { width: 2, height: 1 } }).display).toMatchObject({
      width: 4,
      height: 2,
    })
  })

  test("uses defaults for invalid option groups", () => {
    expect(parseOptions({ sources: null, display: "compact" })).toMatchObject({
      sources: { url: true, file: true, image: true },
      display: { showDetails: false, width: 70, height: 16 },
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
        previewHeight: 80,
      }),
    ).toMatchObject({
      sources: { url: true, file: true, image: true },
      display: { showDetails: false, width: 70, height: 16 },
    })
  })

  test("does not interpret legacy minHeight and maxHeight settings", () => {
    expect(parseOptions({ display: { minHeight: 40, maxHeight: 80 } }).display.height).toBe(16)
  })
})
