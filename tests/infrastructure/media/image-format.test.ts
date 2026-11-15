import { describe, expect, test } from "bun:test"
import { PREVIEW_IMAGE_MIMES } from "../../../src/core/preview-content.js"
import {
  detectImageMime,
  parseImageContentType,
} from "../../../src/infrastructure/media/image-format.js"

describe("image format validation", () => {
  test("uses the core MIME catalog as the source of truth", () => {
    expect(PREVIEW_IMAGE_MIMES).toEqual(["image/png", "image/jpeg", "image/gif", "image/webp"])
    for (const mime of PREVIEW_IMAGE_MIMES) {
      expect(parseImageContentType(mime)).toBe(mime)
    }
  })

  test.each([
    [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "image/png"],
    [[0xff, 0xd8, 0xff], "image/jpeg"],
    [[0x47, 0x49, 0x46, 0x38, 0x39, 0x61], "image/gif"],
    [[0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], "image/webp"],
  ] as const)("detects supported signatures", (bytes, mime) => {
    expect(detectImageMime(new Uint8Array(bytes))).toBe(mime)
  })

  test("rejects unsupported bytes and content types", () => {
    expect(detectImageMime(new Uint8Array([0x42, 0x4d]))).toBeUndefined()
    expect(parseImageContentType("image/svg+xml")).toBeUndefined()
    expect(parseImageContentType("application/octet-stream")).toBeUndefined()
  })

  test("normalizes supported content types", () => {
    expect(parseImageContentType("Image/PNG; charset=binary")).toBe("image/png")
  })
})
