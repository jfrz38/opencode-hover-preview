import { describe, expect, test } from "bun:test"
import { MAX_READ_BYTES, previewTextFile } from "../../../src/infrastructure/filesystem/text-file-preview.js"

describe("text file preview", () => {
  test("normalizes line endings and strips unsafe control characters", () => {
    const bytes = new TextEncoder().encode("hello\r\nworld\u0007")

    expect(previewTextFile(bytes, bytes.byteLength)).toEqual({
      body: "hello\nworld",
      truncated: false,
    })
  })

  test("rejects binary and invalid UTF-8 input", () => {
    expect(previewTextFile(new Uint8Array([1, 0, 2]), 3)).toBeUndefined()
    expect(previewTextFile(new Uint8Array([0xff]), 1)).toBeUndefined()
  })

  test("marks previews truncated when the file exceeds the bounded read", () => {
    const bytes = new TextEncoder().encode("short text")

    expect(previewTextFile(bytes, MAX_READ_BYTES + 1)).toEqual({
      body: "short text",
      truncated: true,
    })
  })
})
