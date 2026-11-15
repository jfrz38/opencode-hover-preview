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
      previewWidth: 70,
      previewMinHeight: 4,
      previewMaxHeight: 16,
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

  test("supports custom preview dimensions", () => {
    expect(
      parseOptions({ previewWidth: 90.8, previewMinHeight: 6.9, previewMaxHeight: 24.2 }),
    ).toMatchObject({
      previewWidth: 90,
      previewMinHeight: 6,
      previewMaxHeight: 24,
    })
  })

  test("normalizes invalid and contradictory preview dimensions", () => {
    expect(
      parseOptions({
        previewWidth: Number.POSITIVE_INFINITY,
        previewMinHeight: -2,
        previewMaxHeight: "12",
      }),
    ).toMatchObject({
      previewWidth: 70,
      previewMinHeight: 4,
      previewMaxHeight: 16,
    })
    expect(
      parseOptions({ previewWidth: 2, previewMinHeight: 20, previewMaxHeight: 10 }),
    ).toMatchObject({
      previewWidth: 4,
      previewMinHeight: 20,
      previewMaxHeight: 20,
    })
  })
})
