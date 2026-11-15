import { describe, expect, test } from "bun:test"
import { loadPreview } from "../../src/preview/load-preview.js"
import type { PreviewTarget } from "../../src/domain/preview-target.js"

function target(kind: PreviewTarget["kind"], value: string): PreviewTarget {
  return { kind, value, source: "text", start: 0, end: value.length }
}

describe("preview loading", () => {
  test("disabled capabilities do not perform I/O", async () => {
    expect(
      await loadPreview(
        target("url", "https://example.com"),
        undefined,
        { urlPreview: false, filePreview: false, imagePreview: false },
        new AbortController().signal,
      ),
    ).toMatchObject({ kind: "unavailable", title: "URL preview disabled" })

    expect(
      await loadPreview(
        target("file-link", "./README.md"),
        process.cwd(),
        { urlPreview: false, filePreview: false, imagePreview: false },
        new AbortController().signal,
      ),
    ).toMatchObject({ kind: "unavailable", title: "File preview disabled" })
  })
})
