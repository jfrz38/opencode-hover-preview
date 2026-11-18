import { describe, expect, test } from "bun:test"
import { previewFailureLines } from "../../../src/infrastructure/ui/preview-failure-display.js"

describe("preview failure display", () => {
  test("maps static failures through the presentation catalog", () => {
    expect(previewFailureLines({ kind: "failure", reason: "outside-workspace" })).toEqual([
      "File preview unavailable",
      "The file is outside the current workspace.",
    ])
  })

  test("formats dynamic HTTP failures", () => {
    expect(previewFailureLines({ kind: "failure", reason: "http-error", status: 404 })).toEqual([
      "URL preview unavailable",
      "The server returned HTTP 404.",
    ])
  })
})
