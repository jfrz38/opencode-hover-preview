import { describe, expect, test } from "bun:test"
import { loadPreview } from "../../src/preview/load-preview.js"
import type { PreviewTarget } from "../../src/domain/preview-target.js"

function target(kind: PreviewTarget["kind"], value: string): PreviewTarget {
  return { kind, value, source: "text", start: 0, end: value.length }
}

describe("preview loading", () => {
  test("describes image and pasted placeholders honestly", async () => {
    expect(
      await loadPreview(
        target("image-placeholder", "[Image 1]"),
        undefined,
        { urlPreview: false, filePreview: false },
        new AbortController().signal,
      ),
    ).toMatchObject({ kind: "placeholder", placeholder: "image" })

    expect(
      await loadPreview(
        target("pasted-placeholder", "[Pasted ~3 lines]"),
        undefined,
        { urlPreview: false, filePreview: false },
        new AbortController().signal,
      ),
    ).toMatchObject({
      kind: "placeholder",
      placeholder: "pasted",
      description: "Approximately 3 pasted lines. OpenCode does not expose their content here.",
    })
  })

  test("disabled capabilities do not perform I/O", async () => {
    expect(
      await loadPreview(
        target("url", "https://example.com"),
        undefined,
        { urlPreview: false, filePreview: false },
        new AbortController().signal,
      ),
    ).toMatchObject({ kind: "unavailable", title: "URL preview disabled" })

    expect(
      await loadPreview(
        target("path", "./README.md"),
        process.cwd(),
        { urlPreview: false, filePreview: false },
        new AbortController().signal,
      ),
    ).toMatchObject({ kind: "unavailable", title: "File preview disabled" })
  })
})
